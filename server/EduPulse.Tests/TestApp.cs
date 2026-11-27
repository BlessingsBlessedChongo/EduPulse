using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using EduPulse.Api.Ai;
using EduPulse.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Npgsql;

namespace EduPulse.Tests;

/// <summary>
/// A stand-in for the language models. Each test says what the "model" should
/// answer for each purpose, so the tests are fast, free and the same every run.
/// </summary>
public class FakeAi : IAi
{
    public bool Available { get; set; } = true;
    public bool CanSee { get; set; } = true;
    public Dictionary<string, Func<string, JsonNode?>> Answers { get; } = new();
    public List<(string Purpose, string Request, bool HadAttachment)> Calls { get; } = [];

    public Task<JsonNode?> AskAsync(string purpose, string instructions, string request, Attachment? attachment = null,
        Guid? userId = null, CancellationToken stop = default)
    {
        Calls.Add((purpose, request, attachment is not null));
        if (!Available) return Task.FromResult<JsonNode?>(null);
        return Task.FromResult(Answers.TryGetValue(purpose, out var answer) ? answer(request) : null);
    }

    public void Reset()
    {
        Available = true;
        CanSee = true;
        Answers.Clear();
        Calls.Clear();
    }
}

/// <summary>The whole service, running in memory against a real PostgreSQL.</summary>
public class TestApp : WebApplicationFactory<Program>
{
    public static string Database =>
        Environment.GetEnvironmentVariable("EDUPULSE_TEST_DB") ?? "Host=localhost;Port=54329;Database=edupulse_test;Username=edupulse";

    public FakeAi Ai { get; } = new();

    public TestApp()
    {
        // The service reads its settings as it starts, so they are in place before it does.
        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Testing");
        Environment.SetEnvironmentVariable("EDUPULSE_DB", Database);
        Environment.SetEnvironmentVariable("EDUPULSE_LIMIT_AUTH", "100000");
        Environment.SetEnvironmentVariable("EDUPULSE_LIMIT_UPLOADS", "100000");
        Environment.SetEnvironmentVariable("EDUPULSE_LIMIT_ANSWERS", "100000");
        Environment.SetEnvironmentVariable("GEMINI_API_KEY", "");
        Environment.SetEnvironmentVariable("GROQ_API_KEY", "");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IAi>();
            services.AddSingleton<IAi>(Ai);
            // Tests run the document worker by hand, so they decide when reading happens.
            var worker = services.FirstOrDefault(s => s.ImplementationType == typeof(EduPulse.Api.Study.LibraryWorker));
            if (worker is not null) services.Remove(worker);
        });
    }

    /// <summary>Empties every table, so each test starts from nothing.</summary>
    public async Task EmptyAsync()
    {
        Ai.Reset();
        _ = Services; // makes sure the service has started and the tables exist
        await using var connection = new NpgsqlConnection(Database);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand("TRUNCATE learner, ai_call CASCADE", connection);
        await command.ExecuteNonQueryAsync();
    }

    public async Task<T> WithDb<T>(Func<AppDb, Task<T>> work)
    {
        using var scope = Services.CreateScope();
        return await work(scope.ServiceProvider.GetRequiredService<AppDb>());
    }

    /// <summary>Reads every waiting document, as the background worker would.</summary>
    public async Task ReadWaitingDocuments()
    {
        while (true)
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDb>();
            var next = await db.Documents.Where(d => d.Status == DocumentStatus.Queued).OrderBy(d => d.CreatedAt).Select(d => (Guid?)d.Id).FirstOrDefaultAsync();
            if (next is null) return;
            await scope.ServiceProvider.GetRequiredService<EduPulse.Api.Study.Library>().ProcessAsync(next.Value, CancellationToken.None);
        }
    }

    /// <summary>A browser belonging to a new learner who has just signed up.</summary>
    public async Task<HttpClient> SignedUp(string name = "Chanda Banda")
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true, AllowAutoRedirect = false });
        var response = await client.PostAsJsonAsync("/api/auth/register",
            new { name, email = $"{Guid.NewGuid():N}@example.com", password = "a-good-password-1" });
        response.EnsureSuccessStatusCode();
        return client;
    }
}

public static class Http
{
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    public static async Task<JsonNode> Json(this Task<HttpResponseMessage> pending)
    {
        var response = await pending;
        var text = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode) throw new InvalidOperationException($"{(int)response.StatusCode}: {text}");
        return JsonNode.Parse(text)!;
    }

    public static async Task<Guid> NewCourse(this HttpClient client, string name = "Biology")
    {
        var created = await client.PostAsJsonAsync("/api/courses", new { name }).Json();
        return created["id"]!.GetValue<Guid>();
    }

    public static Task<HttpResponseMessage> AddText(this HttpClient client, Guid courseId, string text, string kind = "Notes", string title = "Notes")
    {
        var form = new MultipartFormDataContent { { new StringContent(kind), "kind" }, { new StringContent(title), "title" }, { new StringContent(text), "text" } };
        return client.PostAsync($"/api/courses/{courseId}/documents", form);
    }

    public static Task<HttpResponseMessage> AddFile(this HttpClient client, Guid courseId, byte[] bytes, string fileName, string kind = "Notes")
    {
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
        var form = new MultipartFormDataContent { { new StringContent(kind), "kind" }, { file, "file", fileName } };
        return client.PostAsync($"/api/courses/{courseId}/documents", form);
    }

    public static Task<HttpResponseMessage> Answer(this HttpClient client, Guid questionId, string response, byte[]? photo = null)
    {
        var form = new MultipartFormDataContent { { new StringContent(response), "response" } };
        if (photo is not null)
        {
            var file = new ByteArrayContent(photo);
            file.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
            form.Add(file, "photo", "working.jpg");
        }
        return client.PostAsync($"/api/questions/{questionId}/answer", form);
    }

    public static Task<HttpResponseMessage> Challenge(this HttpClient client, Guid attemptId, string reason, byte[]? photo = null)
    {
        var form = new MultipartFormDataContent { { new StringContent(reason), "reason" } };
        if (photo is not null)
        {
            var file = new ByteArrayContent(photo);
            file.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
            form.Add(file, "photo", "working.jpg");
        }
        return client.PostAsync($"/api/attempts/{attemptId}/dispute", form);
    }

    public static JsonNode Node(object value) => JsonSerializer.SerializeToNode(value, Web)!;
}

/// <summary>Tests that touch the database share one service and run one at a time.</summary>
[CollectionDefinition("service")]
public class ServiceCollection : ICollectionFixture<TestApp>;

using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using EduPulse.Api.Data;

namespace EduPulse.Api.Ai;

/// <summary>A picture or PDF handed to a model alongside the words.</summary>
public record Attachment(byte[] Bytes, string MediaType);

/// <summary>What the service asks of a language model: read this, answer in JSON.</summary>
public interface IAi
{
    /// <summary>True when at least one model is set up. When false, the service works by rules alone.</summary>
    bool Available { get; }

    /// <summary>True when a model that can read pictures is set up.</summary>
    bool CanSee { get; }

    /// <summary>
    /// Asks for a JSON answer. Returns null when no model could answer, so every
    /// caller has to decide what to do without one.
    /// </summary>
    Task<JsonNode?> AskAsync(string purpose, string instructions, string request, Attachment? attachment = null,
        Guid? userId = null, CancellationToken stop = default);
}

public class AiOptions
{
    public string GeminiKey { get; set; } = "";
    /// <summary>Models to try in order, most capable first.</summary>
    public string GeminiModels { get; set; } = "gemini-3.8-flash,gemini-3.5-flash,gemini-3.5-flash-lite";
    public string GroqKey { get; set; } = "";
    public string GroqModel { get; set; } = "openai/gpt-oss-20b";
    /// <summary>The longest one model may take over words alone.</summary>
    public int TimeoutSeconds { get; set; } = 25;
    /// <summary>The longest one model may take when it has a picture or PDF to read.</summary>
    public int SeeingTimeoutSeconds { get; set; } = 35;
    /// <summary>How long a model that failed is left alone before it is tried again.</summary>
    public int RestSeconds { get; set; } = 120;
}

/// <summary>
/// Gemini first, because it reads pictures and PDFs; Groq second, for words only.
/// Every call is timed and recorded, which is where the speed figures come from.
/// </summary>
public class AiRouter(HttpClient http, AiOptions options, IServiceScopeFactory scopes, ILogger<AiRouter> logger) : IAi
{
    // When each model may next be tried. A busy or failing model is skipped for a while
    // instead of making every learner wait for it to fail again.
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, DateTimeOffset> Resting = new();

    public bool Available => options.GeminiKey.Length > 0 || options.GroqKey.Length > 0;

    public bool CanSee => options.GeminiKey.Length > 0;

    public async Task<JsonNode?> AskAsync(string purpose, string instructions, string request, Attachment? attachment = null,
        Guid? userId = null, CancellationToken stop = default)
    {
        if (options.GeminiKey.Length > 0)
        {
            var models = options.GeminiModels.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            // Rested models are skipped, unless every one is resting: then they are all tried, since something must answer.
            var awake = models.Where(model => !IsResting(model)).ToArray();
            var canFallBack = attachment is null && options.GroqKey.Length > 0;
            // A learner is waiting on this answer, so at most two models are tried before giving up.
            foreach (var model in (awake.Length > 0 || canFallBack ? awake : models).Take(2))
            {
                var answer = await Timed(purpose, model, attachment is not null, userId,
                    () => Gemini(model, instructions, request, attachment, stop));
                if (answer is not null) return answer;
                Resting[model] = DateTimeOffset.UtcNow.AddSeconds(options.RestSeconds);
            }
        }

        if (attachment is null && options.GroqKey.Length > 0)
        {
            return await Timed(purpose, options.GroqModel, false, userId, () => Groq(instructions, request, stop));
        }

        return null;
    }

    private static bool IsResting(string model) => Resting.TryGetValue(model, out var until) && until > DateTimeOffset.UtcNow;

    private async Task<JsonNode?> Gemini(string model, string instructions, string request, Attachment? attachment, CancellationToken stop)
    {
        var parts = new JsonArray { new JsonObject { ["text"] = request } };
        if (attachment is not null)
        {
            parts.Add(new JsonObject
            {
                ["inline_data"] = new JsonObject
                {
                    ["mime_type"] = attachment.MediaType,
                    ["data"] = Convert.ToBase64String(attachment.Bytes),
                },
            });
        }

        var body = new JsonObject
        {
            ["system_instruction"] = new JsonObject { ["parts"] = new JsonArray { new JsonObject { ["text"] = instructions } } },
            ["contents"] = new JsonArray { new JsonObject { ["role"] = "user", ["parts"] = parts } },
            ["generationConfig"] = new JsonObject { ["response_mime_type"] = "application/json", ["temperature"] = 0.2 },
        };

        using var message = new HttpRequestMessage(HttpMethod.Post,
            $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent");
        message.Headers.Add("x-goog-api-key", options.GeminiKey);
        message.Content = new StringContent(body.ToJsonString(), Encoding.UTF8, "application/json");

        var reply = await Send(message, attachment is null ? options.TimeoutSeconds : options.SeeingTimeoutSeconds, stop);
        var text = reply?["candidates"]?[0]?["content"]?["parts"]?[0]?["text"]?.GetValue<string>();
        return Parse(text);
    }

    private async Task<JsonNode?> Groq(string instructions, string request, CancellationToken stop)
    {
        var body = new JsonObject
        {
            ["model"] = options.GroqModel,
            ["temperature"] = 0.2,
            ["response_format"] = new JsonObject { ["type"] = "json_object" },
            ["messages"] = new JsonArray
            {
                new JsonObject { ["role"] = "system", ["content"] = instructions + "\nAnswer with one JSON object only." },
                new JsonObject { ["role"] = "user", ["content"] = request },
            },
        };

        using var message = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions");
        message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.GroqKey);
        message.Content = new StringContent(body.ToJsonString(), Encoding.UTF8, "application/json");

        var reply = await Send(message, options.TimeoutSeconds, stop);
        var text = reply?["choices"]?[0]?["message"]?["content"]?.GetValue<string>();
        return Parse(text);
    }

    private async Task<JsonNode?> Send(HttpRequestMessage message, int seconds, CancellationToken stop)
    {
        using var limit = CancellationTokenSource.CreateLinkedTokenSource(stop);
        limit.CancelAfter(TimeSpan.FromSeconds(seconds));
        using var response = await http.SendAsync(message, limit.Token);
        var text = await response.Content.ReadAsStringAsync(limit.Token);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Model call to {Host} failed with {Status}: {Body}", message.RequestUri?.Host,
                (int)response.StatusCode, text.Length > 300 ? text[..300] : text);
            return null;
        }
        return JsonNode.Parse(text);
    }

    /// <summary>Models sometimes wrap JSON in a code fence or add a sentence around it. Take the JSON out.</summary>
    internal static JsonNode? Parse(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var start = text.IndexOfAny(['{', '[']);
        var end = text.LastIndexOfAny(['}', ']']);
        if (start < 0 || end <= start) return null;
        try
        {
            return JsonNode.Parse(text[start..(end + 1)]);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private async Task<JsonNode?> Timed(string purpose, string model, bool hadImage, Guid? userId, Func<Task<JsonNode?>> call)
    {
        var clock = Stopwatch.StartNew();
        JsonNode? answer = null;
        try
        {
            answer = await call();
        }
        catch (Exception failed) when (failed is HttpRequestException or TaskCanceledException or JsonException or InvalidOperationException)
        {
            logger.LogWarning("Model {Model} did not answer for {Purpose}: {Reason}", model, purpose, failed.Message);
        }

        try
        {
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDb>();
            db.AiCalls.Add(new AiCall
            {
                Id = Guid.NewGuid(), UserId = userId, Purpose = purpose, Model = model, HadImage = hadImage,
                Milliseconds = (int)clock.ElapsedMilliseconds, Succeeded = answer is not null, CreatedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();
        }
        catch (Exception failed)
        {
            logger.LogWarning("Could not record a model call: {Reason}", failed.Message);
        }

        return answer;
    }
}

/// <summary>Small helpers for reading what a model sent back without trusting its shape.</summary>
public static class JsonRead
{
    public static string Text(this JsonNode? node, string name)
    {
        try
        {
            var value = node?[name];
            return value switch
            {
                null => "",
                JsonValue v when v.TryGetValue<string>(out var s) => s.Trim(),
                JsonValue v => v.ToJsonString().Trim('"'),
                _ => "",
            };
        }
        catch (InvalidOperationException)
        {
            return "";
        }
    }

    public static int Number(this JsonNode? node, string name, int otherwise = 0)
    {
        try
        {
            var value = node?[name];
            if (value is JsonValue v)
            {
                if (v.TryGetValue<int>(out var i)) return i;
                if (v.TryGetValue<double>(out var d)) return (int)Math.Round(d);
                if (v.TryGetValue<string>(out var s) && double.TryParse(s, out var parsed)) return (int)Math.Round(parsed);
            }
        }
        catch (InvalidOperationException)
        {
            // fall through
        }
        return otherwise;
    }

    public static bool Flag(this JsonNode? node, string name)
    {
        try
        {
            var value = node?[name];
            if (value is JsonValue v)
            {
                if (v.TryGetValue<bool>(out var b)) return b;
                if (v.TryGetValue<string>(out var s)) return s.Equals("true", StringComparison.OrdinalIgnoreCase) || s.Equals("yes", StringComparison.OrdinalIgnoreCase);
            }
        }
        catch (InvalidOperationException)
        {
            // fall through
        }
        return false;
    }

    public static IEnumerable<JsonNode> Items(this JsonNode? node, string name)
    {
        JsonNode? value;
        try
        {
            value = node?[name];
        }
        catch (InvalidOperationException)
        {
            yield break;
        }
        if (value is not JsonArray array) yield break;
        foreach (var item in array)
        {
            if (item is not null) yield return item;
        }
    }

    public static List<string> Strings(this JsonNode? node, string name) =>
        node.Items(name).Select(item => item is JsonValue v && v.TryGetValue<string>(out var s) ? s.Trim() : "")
            .Where(s => s.Length > 0).ToList();
}

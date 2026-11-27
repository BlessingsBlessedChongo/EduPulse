using EduPulse.Api.Ai;
using EduPulse.Api.Auth;

namespace EduPulse.Api;

public class LimitOptions
{
    /// <summary>Sign-in and sign-up tries per caller in five minutes.</summary>
    public int Auth { get; set; } = 20;
    /// <summary>Documents added per learner in an hour.</summary>
    public int Uploads { get; set; } = 20;
    /// <summary>Answers marked per learner in an hour.</summary>
    public int Answers { get; set; } = 300;
}

/// <summary>
/// Everything the service is told from outside, read once at start-up.
/// Each value comes from an environment variable; none has a secret default.
/// </summary>
public class Settings
{
    public string Database { get; init; } = "";
    public AiOptions Ai { get; init; } = new();
    public TokenOptions Tokens { get; init; } = new();
    public LimitOptions Limits { get; init; } = new();
    public List<string> AllowedOrigins { get; init; } = [];

    public static Settings From(IConfiguration config, IHostEnvironment environment)
    {
        string Value(string name, string otherwise = "") => (config[name] ?? otherwise).Trim();

        var secret = Value("EDUPULSE_SECRET");
        if (secret.Length < 32)
        {
            if (!environment.IsDevelopment() && !environment.IsEnvironment("Testing"))
            {
                throw new InvalidOperationException("Set EDUPULSE_SECRET to a long random value (32 characters or more) before running EduPulse.");
            }
            secret = "development-only-secret-never-used-in-production-0001";
        }

        var limits = new LimitOptions();
        if (int.TryParse(Value("EDUPULSE_LIMIT_AUTH"), out var auth)) limits.Auth = auth;
        if (int.TryParse(Value("EDUPULSE_LIMIT_UPLOADS"), out var uploads)) limits.Uploads = uploads;
        if (int.TryParse(Value("EDUPULSE_LIMIT_ANSWERS"), out var answers)) limits.Answers = answers;

        var ai = new AiOptions { GeminiKey = Value("GEMINI_API_KEY"), GroqKey = Value("GROQ_API_KEY") };
        if (Value("GEMINI_MODEL").Length > 0) ai.GeminiModels = Value("GEMINI_MODEL");
        if (Value("GROQ_MODEL").Length > 0) ai.GroqModel = Value("GROQ_MODEL");

        return new Settings
        {
            Database = ConnectionString(Value("EDUPULSE_DB", "Host=localhost;Port=54329;Database=edupulse;Username=edupulse")),
            Ai = ai,
            Tokens = new TokenOptions { Secret = secret },
            Limits = limits,
            AllowedOrigins = Value("EDUPULSE_ORIGINS").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList(),
        };
    }

    /// <summary>
    /// Accepts either form of database address: the key=value form, or the
    /// postgresql://user:password@host/database form that hosts such as Neon show.
    /// </summary>
    public static string ConnectionString(string value)
    {
        value = value.Trim();
        if (!value.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
            !value.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            return value;
        }

        var uri = new Uri(value);
        var userInfo = uri.UserInfo.Split(':', 2);
        var parts = new List<string>
        {
            $"Host={uri.Host}",
            $"Port={(uri.Port > 0 ? uri.Port : 5432)}",
            $"Database={Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/'))}",
            $"Username={Uri.UnescapeDataString(userInfo[0])}",
        };
        if (userInfo.Length > 1) parts.Add($"Password={Uri.UnescapeDataString(userInfo[1])}");
        if (uri.Query.Contains("sslmode=require", StringComparison.OrdinalIgnoreCase) || uri.Host.EndsWith(".neon.tech", StringComparison.OrdinalIgnoreCase))
        {
            parts.Add("SSL Mode=Require");
        }
        // A sleeping database takes a moment to wake.
        parts.Add("Timeout=30");
        parts.Add("Maximum Pool Size=10");
        return string.Join(';', parts);
    }

    /// <summary>For work on a laptop: reads a .env file beside the project, if there is one. Real environment values win.</summary>
    public static void LoadDotEnv()
    {
        var folder = new DirectoryInfo(Directory.GetCurrentDirectory());
        for (var depth = 0; folder is not null && depth < 4; depth++, folder = folder.Parent)
        {
            var file = Path.Combine(folder.FullName, ".env");
            if (!File.Exists(file)) continue;
            foreach (var line in File.ReadAllLines(file))
            {
                var trimmed = line.Trim();
                if (trimmed.Length == 0 || trimmed.StartsWith('#')) continue;
                var equals = trimmed.IndexOf('=');
                if (equals <= 0) continue;
                var name = trimmed[..equals].Trim();
                var value = trimmed[(equals + 1)..].Trim().Trim('"');
                if (Environment.GetEnvironmentVariable(name) is null) Environment.SetEnvironmentVariable(name, value);
            }
            return;
        }
    }
}

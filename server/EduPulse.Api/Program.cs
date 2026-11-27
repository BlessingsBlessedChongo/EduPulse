using System.Security.Claims;
using System.Threading.RateLimiting;
using EduPulse.Api;
using EduPulse.Api.Ai;
using EduPulse.Api.Auth;
using EduPulse.Api.Data;
using EduPulse.Api.Endpoints;
using EduPulse.Api.Marking;
using EduPulse.Api.Questions;
using EduPulse.Api.Reading;
using EduPulse.Api.Study;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

Settings.LoadDotEnv();
var builder = WebApplication.CreateBuilder(args);

var settings = Settings.From(builder.Configuration, builder.Environment);
builder.Services.AddSingleton(settings);
builder.Services.AddSingleton(settings.Ai);
builder.Services.AddSingleton(settings.Tokens);
builder.Services.AddSingleton<Tokens>();

builder.WebHost.ConfigureKestrel(kestrel => kestrel.Limits.MaxRequestBodySize = 12 * 1024 * 1024);
if (Environment.GetEnvironmentVariable("PORT") is { Length: > 0 } port)
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

builder.Services.AddDbContext<AppDb>(options => options.UseNpgsql(settings.Database));
builder.Services.AddHttpClient<IAi, AiRouter>();
builder.Services.AddScoped<DocumentReader>();
builder.Services.AddScoped<QuestionMaker>();
builder.Services.AddScoped<StyleLearner>();
builder.Services.AddScoped<Marker>();
builder.Services.AddScoped<Library>();
builder.Services.AddScoped<Pulse>();
builder.Services.AddHostedService<LibraryWorker>();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    options.MapInboundClaims = false;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidIssuer = "edupulse", ValidAudience = "edupulse", NameClaimType = "sub",
        IssuerSigningKey = new Tokens(settings.Tokens).Key, ClockSkew = TimeSpan.FromMinutes(1),
    };
    options.Events = new JwtBearerEvents
    {
        // The token travels in a cookie the page's scripts cannot read.
        OnMessageReceived = context =>
        {
            context.Token = context.Request.Cookies[Tokens.Cookie];
            return Task.CompletedTask;
        },
        // A token is only good while its version matches the learner's: a password change ends older sign-ins.
        OnTokenValidated = async context =>
        {
            var db = context.HttpContext.RequestServices.GetRequiredService<AppDb>();
            var id = context.Principal?.FindFirstValue("sub");
            var version = context.Principal?.FindFirstValue(Tokens.VersionClaim);
            if (!Guid.TryParse(id, out var userId) || !int.TryParse(version, out var tokenVersion) ||
                !await db.Users.AnyAsync(u => u.Id == userId && u.TokenVersion == tokenVersion))
            {
                context.Fail("This sign-in is no longer valid.");
            }
        },
    };
});
builder.Services.AddAuthorizationBuilder().SetFallbackPolicy(
    new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

builder.Services.AddRateLimiter(limiter =>
{
    limiter.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    limiter.OnRejected = async (context, stop) =>
    {
        context.HttpContext.Response.ContentType = "application/problem+json";
        await context.HttpContext.Response.WriteAsync("{\"detail\":\"Too many tries. Wait a little and try again.\",\"status\":429}", stop);
    };
    string Caller(HttpContext http) => http.User.FindFirstValue("sub") ?? http.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    void Policy(string name, int permits, TimeSpan window) => limiter.AddPolicy(name, http =>
        RateLimitPartition.GetFixedWindowLimiter(Caller(http), _ => new FixedWindowRateLimiterOptions { PermitLimit = permits, Window = window }));
    Policy("auth", settings.Limits.Auth, TimeSpan.FromMinutes(5));
    Policy("upload", settings.Limits.Uploads, TimeSpan.FromHours(1));
    Policy("answers", settings.Limits.Answers, TimeSpan.FromHours(1));
});

var app = builder.Build();

await Migrator.RunAsync(settings.Database, app.Logger);

// Behind a host's proxy, this is what tells the service the visitor used HTTPS.
var forwarded = new ForwardedHeadersOptions { ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto };
forwarded.KnownNetworks.Clear();
forwarded.KnownProxies.Clear();
app.UseForwardedHeaders(forwarded);

app.UseExceptionHandler();
app.Use(async (http, next) =>
{
    var headers = http.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    headers["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=()";
    headers["Content-Security-Policy"] =
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; " +
        "connect-src 'self'; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";
    if (http.Request.IsHttps) headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";

    // A change may only be asked for by this site's own pages, never by another site using the learner's cookie.
    if (http.Request.Path.StartsWithSegments("/api") && !HttpMethods.IsGet(http.Request.Method) && !HttpMethods.IsHead(http.Request.Method))
    {
        var origin = http.Request.Headers.Origin.ToString();
        if (origin.Length > 0 && Uri.TryCreate(origin, UriKind.Absolute, out var from) &&
            !string.Equals(from.Authority, http.Request.Host.Value, StringComparison.OrdinalIgnoreCase) &&
            !settings.AllowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
        {
            http.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }
    }
    await next();
});

app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        // Built files carry a fingerprint in their name, so they can be kept for a long time.
        if (context.Context.Request.Path.StartsWithSegments("/assets"))
        {
            context.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        }
    },
});

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapGet("/health", () => Results.Ok(new { status = "UP" })).AllowAnonymous();
app.MapOpenApi().AllowAnonymous();
app.MapAccount();
app.MapCourses();
app.MapStudy();

// Any other address is a screen of the app, which the browser's own code draws.
app.MapFallback(async http =>
{
    if (http.Request.Path.StartsWithSegments("/api"))
    {
        http.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }
    var index = Path.Combine(app.Environment.WebRootPath ?? "wwwroot", "index.html");
    if (!File.Exists(index))
    {
        http.Response.StatusCode = StatusCodes.Status404NotFound;
        await http.Response.WriteAsync("The app has not been built yet. Run the web build, or open the dev server.");
        return;
    }
    http.Response.ContentType = "text/html; charset=utf-8";
    http.Response.Headers.CacheControl = "no-cache";
    await http.Response.SendFileAsync(index);
}).AllowAnonymous();

app.Run();

public partial class Program;

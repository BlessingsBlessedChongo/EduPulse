using System.Net.Mail;
using EduPulse.Api.Ai;
using EduPulse.Api.Auth;
using EduPulse.Api.Data;
using EduPulse.Api.Reading;
using EduPulse.Api.Study;
using Microsoft.EntityFrameworkCore;

namespace EduPulse.Api.Endpoints;

public record RegisterRequest(string? Name, string? Email, string? Password);
public record LoginRequest(string? Email, string? Password);
public record PasswordRequest(string? Current, string? Next);
public record DeleteAccountRequest(string? Password);
public record Me(Guid Id, string Name, string Email, bool IsDemo);

public static class AccountEndpoints
{
    public const int PhotosPerDay = 10;

    public static void MapAccount(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/about", (IAi ai) => Results.Ok(new
        {
            ai = ai.Available,
            photos = ai.CanSee,
            photosPerDay = PhotosPerDay,
            maxPages = DocumentReader.MaxPages,
            comingSoon = new[]
            {
                new { name = "Timed mock papers", detail = "A full paper in your lecturer's layout, against the clock, for the week before the exam." },
                new { name = "Diagrams and graphs", detail = "Marking of sketches, graphs and geometry from a photo." },
                new { name = "Study reminders", detail = "A nudge on your phone when your daily set is ready." },
                new { name = "Password reset by email", detail = "A code sent to your email if you forget your password." },
            },
        })).AllowAnonymous();

        var auth = app.MapGroup("/api/auth").RequireRateLimiting("auth");

        auth.MapPost("/register", async (RegisterRequest request, AppDb db, Tokens tokens, HttpContext http, CancellationToken stop) =>
        {
            var name = Words.Squash(request.Name ?? "");
            var email = (request.Email ?? "").Trim().ToLowerInvariant();
            var password = request.Password ?? "";
            if (name.Length is < 2 or > 80) return Problem("Tell us your name.");
            if (!MailAddress.TryCreate(email, out _) || email.Length > 200) return Problem("That email address does not look right.");
            if (Passwords.Problem(password) is { } problem) return Problem(problem);
            if (await db.Users.AnyAsync(u => u.Email == email, stop)) return Problem("There is already an account with that email. Sign in instead.", 409);

            var user = new User { Id = Guid.NewGuid(), Name = name, Email = email, PasswordHash = Passwords.Hash(password), CreatedAt = DateTimeOffset.UtcNow };
            db.Users.Add(user);
            await db.SaveChangesAsync(stop);
            tokens.SignIn(http, user);
            return Results.Ok(ToMe(user));
        }).AllowAnonymous();

        auth.MapPost("/login", async (LoginRequest request, AppDb db, Tokens tokens, HttpContext http, CancellationToken stop) =>
        {
            var email = (request.Email ?? "").Trim().ToLowerInvariant();
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, stop);
            // The same answer whether the email or the password was wrong, so neither can be probed.
            if (user is null || user.IsDemo || !Passwords.Matches(request.Password ?? "", user.PasswordHash))
            {
                return Problem("The email or password is not right.", 401);
            }
            tokens.SignIn(http, user);
            return Results.Ok(ToMe(user));
        }).AllowAnonymous();

        auth.MapPost("/demo", async (AppDb db, Tokens tokens, HttpContext http, CancellationToken stop) =>
        {
            var user = await DemoSchool.CreateAsync(db, DateOnly.FromDateTime(DateTime.UtcNow), stop);
            tokens.SignIn(http, user);
            return Results.Ok(ToMe(user));
        }).AllowAnonymous();

        auth.MapPost("/logout", (HttpContext http) =>
        {
            Tokens.SignOut(http);
            return Results.NoContent();
        }).AllowAnonymous();

        app.MapGet("/api/me", async (HttpContext http, AppDb db, CancellationToken stop) =>
        {
            var user = await db.Users.FirstAsync(u => u.Id == http.User.UserId(), stop);
            return Results.Ok(ToMe(user));
        });

        app.MapPost("/api/me/password", async (PasswordRequest request, HttpContext http, AppDb db, Tokens tokens, CancellationToken stop) =>
        {
            var user = await db.Users.FirstAsync(u => u.Id == http.User.UserId(), stop);
            if (user.IsDemo) return Problem("The demo account has no password to change.");
            if (!Passwords.Matches(request.Current ?? "", user.PasswordHash)) return Problem("Your current password is not right.");
            if (Passwords.Problem(request.Next ?? "") is { } problem) return Problem(problem);
            user.PasswordHash = Passwords.Hash(request.Next!);
            user.TokenVersion++; // signs out every other device
            await db.SaveChangesAsync(stop);
            tokens.SignIn(http, user);
            return Results.NoContent();
        }).RequireRateLimiting("auth");

        app.MapDelete("/api/me", async ([Microsoft.AspNetCore.Mvc.FromBody] DeleteAccountRequest request, HttpContext http, AppDb db, CancellationToken stop) =>
        {
            var user = await db.Users.FirstAsync(u => u.Id == http.User.UserId(), stop);
            if (!user.IsDemo && !Passwords.Matches(request.Password ?? "", user.PasswordHash)) return Problem("Your password is not right.");
            db.Users.Remove(user); // everything of theirs goes with them
            await db.SaveChangesAsync(stop);
            Tokens.SignOut(http);
            return Results.NoContent();
        }).RequireRateLimiting("auth");
    }

    private static Me ToMe(User user) => new(user.Id, user.Name, user.IsDemo ? "" : user.Email, user.IsDemo);

    public static IResult Problem(string detail, int status = 400) => Results.Problem(detail: detail, statusCode: status);
}

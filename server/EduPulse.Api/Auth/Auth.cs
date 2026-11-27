using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using EduPulse.Api.Data;
using Microsoft.IdentityModel.Tokens;

namespace EduPulse.Api.Auth;

/// <summary>Passwords are never stored; only a slow, salted hash of each one is.</summary>
public static class Passwords
{
    private const int Rounds = 210_000;

    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Rounds, HashAlgorithmName.SHA256, 32);
        return $"pbkdf2-sha256${Rounds}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
    }

    public static bool Matches(string password, string stored)
    {
        var parts = stored.Split('$');
        if (parts.Length != 4 || parts[0] != "pbkdf2-sha256" || !int.TryParse(parts[1], out var rounds)) return false;
        try
        {
            var salt = Convert.FromBase64String(parts[2]);
            var expected = Convert.FromBase64String(parts[3]);
            var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, rounds, HashAlgorithmName.SHA256, expected.Length);
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }
        catch (FormatException)
        {
            return false;
        }
    }

    /// <summary>Returns what is wrong with a new password, or null when it is fine.</summary>
    public static string? Problem(string password)
    {
        if (password.Length < 8) return "Use at least 8 characters.";
        if (password.Length > 200) return "That password is too long.";
        if (password.All(char.IsDigit)) return "Use some letters as well as numbers.";
        return null;
    }
}

public class TokenOptions
{
    public string Secret { get; set; } = "";
    public int Days { get; set; } = 30;
}

/// <summary>
/// Sign-in is a signed token kept in a cookie the page's own scripts cannot read.
/// The token carries the learner's id and a version number; changing the
/// password raises the number, which ends every older sign-in.
/// </summary>
public class Tokens(TokenOptions options)
{
    public const string Cookie = "edupulse";
    public const string VersionClaim = "ver";

    public SymmetricSecurityKey Key { get; } = new(SHA256.HashData(Encoding.UTF8.GetBytes(options.Secret)));

    public string Issue(User user)
    {
        var token = new JwtSecurityToken(
            issuer: "edupulse", audience: "edupulse",
            claims: [new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()), new Claim(VersionClaim, user.TokenVersion.ToString())],
            expires: DateTime.UtcNow.AddDays(options.Days),
            signingCredentials: new SigningCredentials(Key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public void SignIn(HttpContext http, User user)
    {
        http.Response.Cookies.Append(Cookie, Issue(user), new CookieOptions
        {
            HttpOnly = true,
            Secure = http.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            MaxAge = TimeSpan.FromDays(options.Days),
            Path = "/",
        });
    }

    public static void SignOut(HttpContext http) => http.Response.Cookies.Delete(Cookie, new CookieOptions { Path = "/" });
}

public static class Who
{
    /// <summary>The signed-in learner's id. Only call on routes that require sign-in.</summary>
    public static Guid UserId(this ClaimsPrincipal principal) =>
        Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
}

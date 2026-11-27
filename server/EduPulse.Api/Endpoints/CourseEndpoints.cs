using System.Text;
using EduPulse.Api.Auth;
using EduPulse.Api.Data;
using EduPulse.Api.Questions;
using EduPulse.Api.Reading;
using EduPulse.Api.Study;
using Microsoft.EntityFrameworkCore;
using static EduPulse.Api.Endpoints.AccountEndpoints;

namespace EduPulse.Api.Endpoints;

public record CourseRequest(string? Name, DateOnly? ExamDate, bool ClearExamDate = false);

public static class CourseEndpoints
{
    private const int MostCourses = 12;
    private const int MostDocumentsPerCourse = 25;

    private static readonly Dictionary<string, string> Types = new(StringComparer.OrdinalIgnoreCase)
    {
        [".pdf"] = "application/pdf", [".jpg"] = "image/jpeg", [".jpeg"] = "image/jpeg", [".png"] = "image/png",
        [".webp"] = "image/webp", [".txt"] = "text/plain", [".md"] = "text/plain",
    };

    public static void MapCourses(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/courses", async (HttpContext http, AppDb db, Pulse pulse, CancellationToken stop) =>
        {
            var view = await pulse.ForAsync(http.User.UserId(), Today(http), stop);
            var ids = view.Courses.Select(c => c.CourseId).ToList();
            var documents = await db.Documents.Where(d => ids.Contains(d.CourseId))
                .GroupBy(d => d.CourseId).Select(g => new { g.Key, Count = g.Count(), Working = g.Count(d => d.Status == DocumentStatus.Queued || d.Status == DocumentStatus.Reading) })
                .ToListAsync(stop);
            var styled = await db.Courses.Where(c => ids.Contains(c.Id) && c.StyleJson != null).Select(c => c.Id).ToListAsync(stop);
            return Results.Ok(view.Courses.Select(c => new
            {
                id = c.CourseId, name = c.Course, examDate = c.ExamDate, daysToExam = c.DaysToExam, percent = c.Percent,
                questions = c.Questions, seen = c.Seen, due = c.Due,
                documents = documents.FirstOrDefault(d => d.Key == c.CourseId)?.Count ?? 0,
                working = documents.FirstOrDefault(d => d.Key == c.CourseId)?.Working ?? 0,
                hasStyle = styled.Contains(c.CourseId),
            }));
        });

        app.MapPost("/api/courses", async (CourseRequest request, HttpContext http, AppDb db, CancellationToken stop) =>
        {
            var name = Words.Squash(request.Name ?? "");
            if (name.Length is < 2 or > 80) return Problem("Give the course a name, such as \"Organic Chemistry\".");
            var userId = http.User.UserId();
            if (await db.Courses.CountAsync(c => c.UserId == userId, stop) >= MostCourses) return Problem($"You can have up to {MostCourses} courses.");
            var course = new Course { Id = Guid.NewGuid(), UserId = userId, Name = name, ExamDate = request.ExamDate, CreatedAt = DateTimeOffset.UtcNow };
            db.Courses.Add(course);
            await db.SaveChangesAsync(stop);
            return Results.Ok(new { id = course.Id });
        });

        app.MapGet("/api/courses/{id:guid}", async (Guid id, HttpContext http, AppDb db, Pulse pulse, CancellationToken stop) =>
        {
            var userId = http.User.UserId();
            var course = await db.Courses.FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId, stop);
            if (course is null) return Results.NotFound();
            var view = (await pulse.ForAsync(userId, Today(http), stop)).Courses.First(c => c.CourseId == id);
            var documents = await db.Documents.Where(d => d.CourseId == id).OrderByDescending(d => d.CreatedAt)
                .Select(d => new
                {
                    id = d.Id, kind = d.Kind.ToString(), title = d.Title, status = d.Status.ToString(), note = d.Note,
                    pageCount = d.PageCount, questionCount = d.QuestionCount, proposed = d.Proposed, notOnPage = d.NotOnPage, createdAt = d.CreatedAt,
                }).ToListAsync(stop);
            return Results.Ok(new
            {
                id = course.Id, name = course.Name, examDate = course.ExamDate, daysToExam = view.DaysToExam, percent = view.Percent,
                questions = view.Questions, seen = view.Seen, due = view.Due, style = Style.FromJson(course.StyleJson),
                documents, topics = view.Topics,
            });
        });

        app.MapPatch("/api/courses/{id:guid}", async (Guid id, CourseRequest request, HttpContext http, AppDb db, CancellationToken stop) =>
        {
            var userId = http.User.UserId();
            var course = await db.Courses.FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId, stop);
            if (course is null) return Results.NotFound();
            if (request.Name is not null)
            {
                var name = Words.Squash(request.Name);
                if (name.Length is < 2 or > 80) return Problem("Give the course a name.");
                course.Name = name;
            }
            if (request.ClearExamDate) course.ExamDate = null;
            else if (request.ExamDate is not null) course.ExamDate = request.ExamDate;
            await db.SaveChangesAsync(stop);
            return Results.NoContent();
        });

        app.MapDelete("/api/courses/{id:guid}", async (Guid id, HttpContext http, AppDb db, CancellationToken stop) =>
        {
            var userId = http.User.UserId();
            var removed = await db.Courses.Where(c => c.Id == id && c.UserId == userId).ExecuteDeleteAsync(stop);
            return removed == 0 ? Results.NotFound() : Results.NoContent();
        });

        // Add notes or a past paper: a file (PDF or photo) or pasted text.
        app.MapPost("/api/courses/{id:guid}/documents", async (Guid id, HttpContext http, AppDb db, CancellationToken stop) =>
        {
            var userId = http.User.UserId();
            if (!await db.Courses.AnyAsync(c => c.Id == id && c.UserId == userId, stop)) return Results.NotFound();
            if (await db.Documents.CountAsync(d => d.CourseId == id, stop) >= MostDocumentsPerCourse)
            {
                return Problem($"A course holds up to {MostDocumentsPerCourse} documents. Remove one to add another.");
            }
            if (!http.Request.HasFormContentType) return Problem("Send the document as a form.");

            var form = await http.Request.ReadFormAsync(stop);
            var kind = form["kind"].ToString().Equals("PastPaper", StringComparison.OrdinalIgnoreCase) ? DocumentKind.PastPaper : DocumentKind.Notes;
            var title = Words.Squash(form["title"].ToString());
            var file = form.Files.GetFile("file");
            var text = form["text"].ToString();

            byte[] upload;
            string type;
            if (file is not null && file.Length > 0)
            {
                if (file.Length > DocumentReader.MaxBytes) return Problem("That file is larger than 10 MB. Try fewer pages.");
                if (!Types.TryGetValue(Path.GetExtension(file.FileName), out type!)) return Problem("EduPulse reads PDFs, photos (JPG, PNG) and pasted text.");
                using var memory = new MemoryStream();
                await file.CopyToAsync(memory, stop);
                upload = memory.ToArray();
                if (!LooksLike(upload, type)) return Problem("That file is not what its name says it is.");
                if (title.Length == 0) title = Path.GetFileNameWithoutExtension(file.FileName);
            }
            else if (text.Trim().Length >= 80)
            {
                if (text.Length > 200_000) return Problem("That is a lot of text. Add it in smaller parts.");
                upload = Encoding.UTF8.GetBytes(text);
                type = "text/plain";
                if (title.Length == 0) title = Words.Short(Words.Squash(text), 40);
            }
            else
            {
                return Problem("Choose a file, or paste at least a paragraph of text.");
            }

            var document = new Document
            {
                Id = Guid.NewGuid(), CourseId = id, Kind = kind, Title = Words.Short(title, 120), Status = DocumentStatus.Queued,
                Note = "Waiting to be read...", Upload = upload, UploadType = type, CreatedAt = DateTimeOffset.UtcNow,
            };
            db.Documents.Add(document);
            await db.SaveChangesAsync(stop);
            return Results.Ok(new { id = document.Id });
        }).RequireRateLimiting("upload").DisableAntiforgery();

        // Ask for another round of questions from notes already read.
        app.MapPost("/api/documents/{id:guid}/more", async (Guid id, HttpContext http, AppDb db, CancellationToken stop) =>
        {
            var document = await Owned(db, id, http.User.UserId(), stop);
            if (document is null) return Results.NotFound();
            if (document.Kind != DocumentKind.Notes) return Problem("More questions can be made from notes, not from past papers.");
            if (document.Status != DocumentStatus.Ready) return Problem("This document is still being read.");
            if (document.QuestionCount >= 120) return Problem("This document already has plenty of questions.");
            document.Status = DocumentStatus.Queued;
            document.Note = "Waiting to write more questions...";
            await db.SaveChangesAsync(stop);
            return Results.NoContent();
        }).RequireRateLimiting("upload");

        app.MapDelete("/api/documents/{id:guid}", async (Guid id, HttpContext http, AppDb db, CancellationToken stop) =>
        {
            var document = await Owned(db, id, http.User.UserId(), stop);
            if (document is null) return Results.NotFound();
            var courseId = document.CourseId;
            db.Documents.Remove(document); // its pages and questions go with it
            await db.SaveChangesAsync(stop);
            // Topics left with no questions are tidied away.
            await db.Topics.Where(t => t.CourseId == courseId && !db.Questions.Any(q => q.TopicId == t.Id)).ExecuteDeleteAsync(stop);
            return Results.NoContent();
        });

        // The page a question came from, so the learner can read around it.
        app.MapGet("/api/documents/{id:guid}/pages/{number:int}", async (Guid id, int number, HttpContext http, AppDb db, CancellationToken stop) =>
        {
            var document = await Owned(db, id, http.User.UserId(), stop);
            if (document is null) return Results.NotFound();
            var page = await db.Pages.FirstOrDefaultAsync(p => p.DocumentId == id && p.Number == number, stop);
            return page is null ? Results.NotFound() : Results.Ok(new { title = document.Title, number = page.Number, text = page.Text, pages = document.PageCount });
        });
    }

    private static async Task<Document?> Owned(AppDb db, Guid documentId, Guid userId, CancellationToken stop) =>
        await db.Documents.FirstOrDefaultAsync(d => d.Id == documentId && db.Courses.Any(c => c.Id == d.CourseId && c.UserId == userId), stop);

    /// <summary>The learner's own date, sent by the app, so "today" is their today and not the server's.</summary>
    public static DateOnly Today(HttpContext http)
    {
        var utc = DateOnly.FromDateTime(DateTime.UtcNow);
        if (DateOnly.TryParseExact(http.Request.Headers["X-Day"].ToString(), "yyyy-MM-dd", out var day) && Math.Abs(day.DayNumber - utc.DayNumber) <= 1)
        {
            return day;
        }
        return utc;
    }

    /// <summary>The moment the learner's day began, from the clock offset their app sends (minutes ahead of UTC).</summary>
    public static DateTimeOffset DayStart(HttpContext http)
    {
        var minutes = int.TryParse(http.Request.Headers["X-Zone-Minutes"].ToString(), out var sent) ? Math.Clamp(sent, -14 * 60, 14 * 60) : 0;
        return new DateTimeOffset(Today(http).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero).AddMinutes(-minutes);
    }

    /// <summary>Checks the first bytes, so a file cannot pass as something it is not.</summary>
    private static bool LooksLike(byte[] bytes, string type)
    {
        if (bytes.Length < 8) return false;
        return type switch
        {
            "application/pdf" => bytes[0] == '%' && bytes[1] == 'P' && bytes[2] == 'D' && bytes[3] == 'F',
            "image/jpeg" => bytes[0] == 0xFF && bytes[1] == 0xD8,
            "image/png" => bytes[0] == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G',
            "image/webp" => bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F',
            _ => !bytes.Take(2000).Any(b => b == 0),
        };
    }
}

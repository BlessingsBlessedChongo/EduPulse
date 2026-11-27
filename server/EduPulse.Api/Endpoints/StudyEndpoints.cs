using EduPulse.Api.Ai;
using EduPulse.Api.Auth;
using EduPulse.Api.Data;
using EduPulse.Api.Marking;
using EduPulse.Api.Questions;
using EduPulse.Api.Reading;
using EduPulse.Api.Study;
using Microsoft.EntityFrameworkCore;
using static EduPulse.Api.Endpoints.AccountEndpoints;

namespace EduPulse.Api.Endpoints;

public record QuestionView(Guid Id, Guid CourseId, string Course, string Topic, string Kind, string Prompt, List<string> Options,
    int Marks, bool IsNew);

public static class StudyEndpoints
{
    private const int DailySet = 10;
    private const int NewPerDay = 6;

    public static void MapStudy(this IEndpointRouteBuilder app)
    {
        // Today's set: what is due for revision, topped up with a few new questions.
        app.MapGet("/api/today", async (HttpContext http, AppDb db, CancellationToken stop) =>
        {
            var userId = http.User.UserId();
            var today = CourseEndpoints.Today(http);
            var start = CourseEndpoints.DayStart(http);

            var courses = await db.Courses.Where(c => c.UserId == userId).ToDictionaryAsync(c => c.Id, stop);
            var courseIds = courses.Keys.ToList();
            var topics = await db.Topics.Where(t => courseIds.Contains(t.CourseId)).ToDictionaryAsync(t => t.Id, t => t.Name, stop);

            var due = await db.Reviews.Where(r => r.UserId == userId && r.DueOn <= today)
                .OrderBy(r => r.DueOn).ThenBy(r => r.LastScore).Take(DailySet).Select(r => r.QuestionId).ToListAsync(stop);
            var dueCount = await db.Reviews.CountAsync(r => r.UserId == userId && r.DueOn <= today, stop);

            var startedToday = await db.Reviews.CountAsync(r => r.UserId == userId && r.LastSeenOn == today && r.Streak + r.Lapses <= 1, stop);
            var room = Math.Min(DailySet - due.Count, Math.Max(0, NewPerDay - startedToday));

            var fresh = new List<Guid>();
            if (room > 0)
            {
                // New questions come from the course whose exam is nearest, then spread over topics.
                var unseen = await db.Questions
                    .Where(q => courseIds.Contains(q.CourseId) && !db.Reviews.Any(r => r.UserId == userId && r.QuestionId == q.Id))
                    .Select(q => new { q.Id, q.CourseId, q.TopicId, q.CreatedAt }).ToListAsync(stop);
                fresh = unseen
                    .OrderBy(q => courses[q.CourseId].ExamDate ?? DateOnly.MaxValue)
                    .GroupBy(q => q.TopicId)
                    .SelectMany(group => group.OrderBy(q => q.CreatedAt).Select((q, index) => (q, index)))
                    .OrderBy(pair => pair.index).ThenBy(pair => courses[pair.q.CourseId].ExamDate ?? DateOnly.MaxValue)
                    .Take(room).Select(pair => pair.q.Id).ToList();
            }

            var ids = due.Concat(fresh).ToList();
            var questions = await db.Questions.Where(q => ids.Contains(q.Id)).ToListAsync(stop);
            var ordered = ids.Select(id => questions.First(q => q.Id == id))
                .Select(q => View(q, courses[q.CourseId].Name, topics.GetValueOrDefault(q.TopicId, ""), fresh.Contains(q.Id))).ToList();

            var doneToday = await db.Attempts.CountAsync(a => a.UserId == userId && a.CreatedAt >= start, stop);
            var total = await db.Questions.CountAsync(q => courseIds.Contains(q.CourseId), stop);
            var reading = await db.Documents.CountAsync(d => courseIds.Contains(d.CourseId) && (d.Status == DocumentStatus.Queued || d.Status == DocumentStatus.Reading), stop);

            return Results.Ok(new
            {
                date = today, questions = ordered, due = dueCount, doneToday, courses = courses.Count, totalQuestions = total,
                documentsBeingRead = reading, photosLeft = await PhotosLeft(db, userId, stop),
            });
        });

        // Free practice in one course, optionally one topic: weakest first.
        app.MapGet("/api/courses/{id:guid}/practice", async (Guid id, Guid? topicId, HttpContext http, AppDb db, CancellationToken stop) =>
        {
            var userId = http.User.UserId();
            var course = await db.Courses.FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId, stop);
            if (course is null) return Results.NotFound();
            var today = CourseEndpoints.Today(http);

            var questions = await db.Questions.Where(q => q.CourseId == id && (topicId == null || q.TopicId == topicId)).ToListAsync(stop);
            var reviews = await db.Reviews.Where(r => r.UserId == userId && r.CourseId == id).ToDictionaryAsync(r => r.QuestionId, stop);
            var topics = await db.Topics.Where(t => t.CourseId == id).ToDictionaryAsync(t => t.Id, t => t.Name, stop);

            var chosen = questions
                .OrderBy(q => reviews.TryGetValue(q.Id, out var r) ? Scheduler.Strength(r, today) : -1)
                .ThenBy(q => q.CreatedAt).Take(DailySet)
                .Select(q => View(q, course.Name, topics.GetValueOrDefault(q.TopicId, ""), !reviews.ContainsKey(q.Id))).ToList();
            return Results.Ok(new { questions = chosen, photosLeft = await PhotosLeft(db, userId, stop) });
        });

        // Answer a question: typed, or a photo of handwritten working.
        app.MapPost("/api/questions/{id:guid}/answer", async (Guid id, HttpContext http, AppDb db, Marker marker, IAi ai, CancellationToken stop) =>
        {
            var userId = http.User.UserId();
            var question = await db.Questions.FirstOrDefaultAsync(q => q.Id == id && db.Courses.Any(c => c.Id == q.CourseId && c.UserId == userId), stop);
            if (question is null) return Results.NotFound();
            if (!http.Request.HasFormContentType) return Problem("Send the answer as a form.");

            var form = await http.Request.ReadFormAsync(stop);
            var response = form["response"].ToString();
            if (response.Length > 6000) return Problem("That answer is very long. Shorten it and try again.");
            var file = form.Files.GetFile("photo");

            Attachment? photo = null;
            if (file is not null && file.Length > 0)
            {
                if (question.Kind is QuestionKind.Choice or QuestionKind.Blank) return Problem("This question is answered by choosing or typing, not with a photo.");
                if (!ai.CanSee) return Problem("Marking from photos is switched off on this server. Type your answer.");
                if (file.Length > 6 * 1024 * 1024) return Problem("That photo is larger than 6 MB.");
                var type = file.ContentType.ToLowerInvariant();
                if (type is not ("image/jpeg" or "image/png" or "image/webp")) return Problem("Send the photo as a JPG or PNG.");
                if (await PhotosLeft(db, userId, stop) <= 0)
                {
                    return Problem($"You have used today's {PhotosPerDay} photo markings. Type your answer, or come back tomorrow.", 429);
                }
                using var memory = new MemoryStream();
                await file.CopyToAsync(memory, stop);
                photo = new Attachment(memory.ToArray(), type);
            }
            else if (response.Trim().Length == 0)
            {
                return Problem("Write an answer first, or tap \"I don't know\".");
            }

            var skipped = response.Trim() == "?";
            var verdict = skipped
                ? new Verdict { Score = 0, Max = question.Marks, MarkedBy = "exact", Summary = "No problem. Read the answer below; this one will come back tomorrow.",
                    Awards = QuestionMaker.SchemeFrom(question.SchemeJson).Select(p => new Award(p.Point, p.Marks, 0, "")).ToList() }
                : await marker.MarkAsync(question, response, photo, userId, stop);

            var today = CourseEndpoints.Today(http);
            var attempt = new Attempt
            {
                Id = Guid.NewGuid(), UserId = userId, QuestionId = question.Id, CourseId = question.CourseId,
                Response = skipped ? "" : response, FromPhoto = photo is not null, Score = verdict.Score, MaxScore = verdict.Max,
                VerdictJson = verdict.ToJson(), MarkedBy = verdict.MarkedBy, CreatedAt = DateTimeOffset.UtcNow,
            };
            db.Attempts.Add(attempt);

            // An answer that could not be marked does not move the schedule; the learner marks it themselves.
            DateOnly? nextDue = null;
            if (verdict.MarkedBy != "none")
            {
                nextDue = await Reschedule(db, userId, question, verdict.Max == 0 ? 0 : verdict.Score / (double)verdict.Max, today, stop);
            }
            await db.SaveChangesAsync(stop);

            var title = await db.Documents.Where(d => d.Id == question.DocumentId).Select(d => d.Title).FirstAsync(stop);
            return Results.Ok(new
            {
                attemptId = attempt.Id, verdict, answer = question.Answer, quote = question.SourceQuote, page = question.PageNumber,
                documentId = question.DocumentId, document = title, nextDue, photosLeft = await PhotosLeft(db, userId, stop) - (photo is null ? 0 : 1),
            });
        }).RequireRateLimiting("answers").DisableAntiforgery();

        // "I think this is wrong": the mark goes back to be looked at again. The learner says why, and may
        // attach a clearer photo. They cannot set their own mark, and each answer is reviewed once.
        app.MapPost("/api/attempts/{id:guid}/dispute", async (Guid id, HttpContext http, AppDb db, Marker marker, IAi ai, CancellationToken stop) =>
        {
            var userId = http.User.UserId();
            var attempt = await db.Attempts.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId, stop);
            if (attempt is null) return Results.NotFound();
            if (attempt.Disputed) return Problem("This answer has already been reviewed, and that decision is final.", 409);
            if (attempt.MarkedBy == "none") return Problem("This answer was not marked, so there is nothing to review. Answer the question again.");
            if (!http.Request.HasFormContentType) return Problem("Send the challenge as a form.");

            var form = await http.Request.ReadFormAsync(stop);
            var reason = Words.Squash(form["reason"].ToString());
            if (reason.Length < 10) return Problem("Say in a sentence what you think was marked wrongly.");
            if (reason.Length > 800) return Problem("Keep your reason under 800 characters.");

            var question = await db.Questions.FirstAsync(q => q.Id == attempt.QuestionId, stop);
            Attachment? photo = null;
            var file = form.Files.GetFile("photo");
            if (file is not null && file.Length > 0)
            {
                if (question.Kind is QuestionKind.Choice or QuestionKind.Blank) return Problem("A photo does not apply to this kind of question.");
                if (!ai.CanSee) return Problem("Photos cannot be read on this server. Describe the problem in words.");
                if (file.Length > 6 * 1024 * 1024) return Problem("That photo is larger than 6 MB.");
                var type = file.ContentType.ToLowerInvariant();
                if (type is not ("image/jpeg" or "image/png" or "image/webp")) return Problem("Send the photo as a JPG or PNG.");
                using var memory = new MemoryStream();
                await file.CopyToAsync(memory, stop);
                photo = new Attachment(memory.ToArray(), type);
            }

            var first = Verdict.FromJson(attempt.VerdictJson);
            var reviewed = await marker.ReviewAsync(question, attempt.Response, first, reason, photo, userId, stop);
            if (reviewed is null)
            {
                return Problem("The review could not be done just now because the AI service did not answer. Your challenge was not used up; try again in a few minutes.", 503);
            }

            attempt.Disputed = true;
            attempt.VerdictJson = reviewed.ToJson();
            DateOnly? nextDue = null;
            if (reviewed.Score != attempt.Score)
            {
                attempt.Score = reviewed.Score;
                nextDue = await Reschedule(db, userId, question, attempt.MaxScore == 0 ? 0 : reviewed.Score / (double)attempt.MaxScore,
                    CourseEndpoints.Today(http), stop, replaceToday: true);
            }
            await db.SaveChangesAsync(stop);
            return Results.Ok(new { verdict = reviewed, nextDue });
        }).RequireRateLimiting("answers").DisableAntiforgery();

        app.MapGet("/api/pulse", async (HttpContext http, Pulse pulse, CancellationToken stop) =>
            Results.Ok(await pulse.ForAsync(http.User.UserId(), CourseEndpoints.Today(http), stop)));

        // The service's own measurements, open to anyone: how many proposed questions passed the checks, and how fast the models answer.
        app.MapGet("/api/measured", async (AppDb db, CancellationToken stop) =>
        {
            var notes = db.Documents.Where(d => d.Kind == DocumentKind.Notes && d.Proposed > 0);
            var proposed = await notes.SumAsync(d => d.Proposed, stop);
            var notOnPage = await notes.SumAsync(d => d.NotOnPage, stop);
            var kept = await notes.SumAsync(d => d.QuestionCount, stop);
            var marking = await db.Attempts.GroupBy(a => a.MarkedBy).Select(g => new { by = g.Key, count = g.Count(), disputed = g.Count(a => a.Disputed) }).ToListAsync(stop);
            var since = DateTimeOffset.UtcNow.AddDays(-30);
            var calls = (await db.AiCalls.Where(c => c.CreatedAt >= since).Select(c => new { c.Purpose, c.Milliseconds, c.Succeeded }).ToListAsync(stop))
                .GroupBy(c => c.Purpose).Select(g =>
                {
                    var times = g.Where(c => c.Succeeded).Select(c => c.Milliseconds).OrderBy(ms => ms).ToList();
                    return new { purpose = g.Key, calls = g.Count(), answered = g.Count(c => c.Succeeded), medianMs = times.Count == 0 ? 0 : times[times.Count / 2] };
                }).OrderBy(c => c.purpose).ToList();
            return Results.Ok(new
            {
                questions = new { proposed, refusedNotOnPage = notOnPage, kept },
                marking, calls,
            });
        }).AllowAnonymous();
    }

    private static QuestionView View(Question q, string course, string topic, bool isNew) =>
        new(q.Id, q.CourseId, course, topic, q.Kind.ToString(), q.Prompt, Shuffled(q), q.Marks, isNew);

    /// <summary>Options in an order that is steady for one question but does not always put the answer first.</summary>
    private static List<string> Shuffled(Question q)
    {
        var options = QuestionMaker.OptionsFrom(q.OptionsJson);
        if (options.Count == 0) return options;
        var seed = BitConverter.ToInt32(q.Id.ToByteArray(), 0);
        var random = new Random(seed);
        return options.OrderBy(_ => random.Next()).ToList();
    }

    private static async Task<int> PhotosLeft(AppDb db, Guid userId, CancellationToken stop)
    {
        var dayStart = new DateTimeOffset(DateTime.UtcNow.Date, TimeSpan.Zero);
        var used = await db.Attempts.CountAsync(a => a.UserId == userId && a.FromPhoto && a.CreatedAt >= dayStart, stop);
        return Math.Max(0, PhotosPerDay - used);
    }

    private static async Task<DateOnly> Reschedule(AppDb db, Guid userId, Question question, double share, DateOnly today,
        CancellationToken stop, bool replaceToday = false)
    {
        var review = await db.Reviews.FirstOrDefaultAsync(r => r.UserId == userId && r.QuestionId == question.Id, stop);
        if (review is null)
        {
            review = new Review
            {
                Id = Guid.NewGuid(), UserId = userId, QuestionId = question.Id, CourseId = question.CourseId, TopicId = question.TopicId,
                DueOn = today, LastSeenOn = today,
            };
            db.Reviews.Add(review);
        }
        else if (replaceToday && review.LastSeenOn == today)
        {
            // A corrected mark replaces today's result instead of counting as a second attempt.
            if (review.LastScore >= 0.8) review.Streak = Math.Max(0, review.Streak - 1);
            else if (review.LastScore < 0.5) review.Lapses = Math.Max(0, review.Lapses - 1);
        }
        Scheduler.Apply(review, share, today);
        return review.DueOn;
    }
}

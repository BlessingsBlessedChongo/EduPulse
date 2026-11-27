using EduPulse.Api.Data;
using EduPulse.Api.Questions;
using EduPulse.Api.Reading;
using Microsoft.EntityFrameworkCore;

namespace EduPulse.Api.Study;

/// <summary>
/// Turns an uploaded document into pages, and its pages into questions (for
/// notes) or into a learned question style (for a past paper).
/// </summary>
public class Library(AppDb db, DocumentReader reader, QuestionMaker maker, StyleLearner learner, ILogger<Library> logger)
{
    public async Task ProcessAsync(Guid documentId, CancellationToken stop)
    {
        var document = await db.Documents.FirstOrDefaultAsync(d => d.Id == documentId, stop);
        if (document is null) return;
        var course = await db.Courses.FirstAsync(c => c.Id == document.CourseId, stop);

        try
        {
            var pages = await db.Pages.Where(p => p.DocumentId == document.Id).OrderBy(p => p.Number)
                .Select(p => new ReadPage(p.Number, p.Text)).ToListAsync(stop);

            if (pages.Count == 0)
            {
                await Say(document, DocumentStatus.Reading, "Reading your pages...", stop);
                var read = await reader.ReadAsync(document.Upload ?? [], document.UploadType ?? "", course.UserId, stop);
                if (read.Problem is not null)
                {
                    document.Upload = null;
                    await Say(document, DocumentStatus.Failed, read.Problem, stop);
                    return;
                }
                pages = read.Pages;
                db.Pages.AddRange(pages.Select(p => new Page { Id = Guid.NewGuid(), DocumentId = document.Id, Number = p.Number, Text = p.Text }));
                document.PageCount = pages.Count;
                document.Upload = null; // only the text is kept
                await db.SaveChangesAsync(stop);
            }

            if (document.Kind == DocumentKind.PastPaper)
            {
                await Say(document, DocumentStatus.Reading, "Learning how this paper asks its questions...", stop);
                var style = await learner.LearnAsync(pages, Style.FromJson(course.StyleJson), course.UserId, stop);
                course.StyleJson = style.ToJson();
                await Say(document, DocumentStatus.Ready, "Question style learned. New practice questions will follow it.", stop);
                return;
            }

            await Say(document, DocumentStatus.Reading, "Writing practice questions from your pages...", stop);
            var topics = await db.Topics.Where(t => t.CourseId == course.Id).ToListAsync(stop);
            var result = await maker.MakeAsync(pages, Style.FromJson(course.StyleJson), topics.Select(t => t.Name).ToList(),
                document.Title, course.UserId, stop);

            var existing = (await db.Questions.Where(q => q.CourseId == course.Id).Select(q => q.Prompt).ToListAsync(stop))
                .Select(Words.Flatten).ToHashSet();
            var added = 0;
            foreach (var draft in result.Kept)
            {
                if (!existing.Add(Words.Flatten(draft.Prompt))) continue;
                var topic = topics.FirstOrDefault(t => t.Name.Equals(draft.Topic, StringComparison.OrdinalIgnoreCase));
                if (topic is null)
                {
                    topic = new Topic { Id = Guid.NewGuid(), CourseId = course.Id, Name = draft.Topic };
                    topics.Add(topic);
                    db.Topics.Add(topic);
                }
                db.Questions.Add(ToQuestion(draft, course.Id, topic.Id, document.Id));
                added++;
            }

            document.QuestionCount += added;
            document.Proposed += result.Proposed;
            document.NotOnPage += result.NotOnThePage;
            var note = added == 0
                ? "No questions could be made from these pages. Clearer or longer notes usually help."
                : result.Kept.All(k => k.MadeBy == "rules")
                    ? $"{added} fill-in questions made. Fuller questions will be written when the AI service is reachable."
                    : $"{added} questions ready.";
            await Say(document, added == 0 && document.QuestionCount == 0 ? DocumentStatus.Failed : DocumentStatus.Ready, note, stop);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception failed)
        {
            logger.LogError(failed, "Document {Id} could not be processed", documentId);
            db.ChangeTracker.Clear();
            var fresh = await db.Documents.FirstOrDefaultAsync(d => d.Id == documentId, CancellationToken.None);
            if (fresh is not null)
            {
                fresh.Upload = null;
                fresh.Status = DocumentStatus.Failed;
                fresh.Note = "Something went wrong while reading this. Please try adding it again.";
                await db.SaveChangesAsync(CancellationToken.None);
            }
        }
    }

    public static Question ToQuestion(Draft draft, Guid courseId, Guid topicId, Guid documentId) => new()
    {
        Id = Guid.NewGuid(), CourseId = courseId, TopicId = topicId, DocumentId = documentId, PageNumber = draft.Page,
        Kind = draft.Kind, Prompt = draft.Prompt, OptionsJson = QuestionMaker.OptionsJson(draft.Options), Answer = draft.Answer,
        AnswerExpression = draft.AnswerExpression, SchemeJson = QuestionMaker.SchemeJson(draft.Scheme), Marks = draft.Marks,
        SourceQuote = draft.Quote, MadeBy = draft.MadeBy, CreatedAt = DateTimeOffset.UtcNow,
    };

    private async Task Say(Document document, DocumentStatus status, string note, CancellationToken stop)
    {
        document.Status = status;
        document.Note = note;
        await db.SaveChangesAsync(stop);
    }
}

/// <summary>
/// Works through uploaded documents one at a time, in the order they arrived.
/// The queue is the document table itself, so nothing is lost if the service
/// restarts: anything still marked as waiting is picked up again.
/// </summary>
public class LibraryWorker(IServiceScopeFactory scopes, ILogger<LibraryWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        // Anything a previous run was halfway through goes back in the queue.
        try
        {
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDb>();
            await db.Documents.Where(d => d.Status == DocumentStatus.Reading)
                .ExecuteUpdateAsync(set => set.SetProperty(d => d.Status, DocumentStatus.Queued), stop);
        }
        catch (Exception failed) when (failed is not OperationCanceledException)
        {
            logger.LogWarning("Could not reset waiting documents: {Reason}", failed.Message);
        }

        var lastCleanUp = DateTimeOffset.MinValue;
        while (!stop.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDb>();

                var next = await db.Documents.Where(d => d.Status == DocumentStatus.Queued)
                    .OrderBy(d => d.CreatedAt).Select(d => (Guid?)d.Id).FirstOrDefaultAsync(stop);
                if (next is not null)
                {
                    await scope.ServiceProvider.GetRequiredService<Library>().ProcessAsync(next.Value, stop);
                    continue;
                }

                if (DateTimeOffset.UtcNow - lastCleanUp > TimeSpan.FromHours(1))
                {
                    lastCleanUp = DateTimeOffset.UtcNow;
                    var old = DateTimeOffset.UtcNow.AddHours(-24);
                    await db.Users.Where(u => u.IsDemo && u.CreatedAt < old).ExecuteDeleteAsync(stop);
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception failed)
            {
                logger.LogError(failed, "The document worker hit a problem and will carry on");
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(3), stop);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}

using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using EduPulse.Api.Data;
using EduPulse.Api.Reading;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using UglyToad.PdfPig.Content;
using UglyToad.PdfPig.Core;
using UglyToad.PdfPig.Fonts.Standard14Fonts;
using UglyToad.PdfPig.Writer;

namespace EduPulse.Tests;

[Collection("service")]
public class ServiceTests(TestApp app) : IAsyncLifetime
{
    private const string Notes =
        "The nucleus contains the cell's DNA and controls the activities of the cell. Inside the nucleus, the nucleolus makes ribosomes.\n\n" +
        "Mitochondria are the site of aerobic respiration, where most of the cell's ATP is produced. " +
        "Worked example. Solve x^2 - 7x + 12 = 0. Factorising gives (x - 3)(x - 4) = 0, so x = 3 or x = 4.";

    public Task InitializeAsync() => app.EmptyAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    private static object Short(string prompt = "State the function of the nucleolus.", string quote = "Inside the nucleus, the nucleolus makes ribosomes.") => new
    {
        topic = "Nucleus", kind = "short", prompt, answer = "It makes ribosomes.",
        scheme = new[] { new { point = "The nucleolus makes ribosomes.", marks = 1 }, new { point = "Ribosomes are made inside the nucleus.", marks = 1 } },
        marks = 2, page = 1, quote,
    };

    private static object Choice() => new
    {
        topic = "Mitochondria", kind = "choice", prompt = "Where does aerobic respiration take place?",
        options = new[] { "Mitochondria", "Nucleus", "Ribosomes", "Cell wall" }, answer = "Mitochondria",
        scheme = new[] { new { point = "Chooses the correct option.", marks = 1 } }, marks = 1, page = 1,
        quote = "Mitochondria are the site of aerobic respiration",
    };

    private static object Sum(string prompt = "Solve x^2 - 7x + 12 = 0.", string expression = "3, 4") => new
    {
        topic = "Quadratics", kind = "maths", prompt, answer = "x = 3 or x = 4", answer_expression = expression,
        scheme = new[] { new { point = "Factorises to (x - 3)(x - 4) = 0.", marks = 2 }, new { point = "States both roots.", marks = 1 } },
        marks = 3, page = 1, quote = "Factorising gives (x - 3)(x - 4) = 0, so x = 3 or x = 4.",
    };

    /// <summary>Signs up, adds notes, and lets the stand-in model propose the given questions.</summary>
    private async Task<(HttpClient Client, Guid Course, List<Question> Questions)> Ready(params object[] proposed)
    {
        app.Ai.Answers["make-questions"] = _ => Http.Node(new { questions = proposed });
        app.Ai.Answers["confirm-maths"] = _ => Http.Node(new { answers = new[] { new { n = 1, final = "x = 4 or x = 3" } } });
        var client = await app.SignedUp();
        var course = await client.NewCourse();
        (await client.AddText(course, Notes)).EnsureSuccessStatusCode();
        await app.ReadWaitingDocuments();
        var questions = await app.WithDb(db => db.Questions.Where(q => q.CourseId == course).OrderBy(q => q.CreatedAt).ToListAsync());
        return (client, course, questions);
    }

    // ---------------------------------------------------------------- accounts

    [Fact]
    public async Task ALearnerCanSignUpSignOutAndSignBackIn()
    {
        var client = app.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        var email = $"{Guid.NewGuid():N}@example.com";
        var me = await client.PostAsJsonAsync("/api/auth/register", new { name = "Chanda Banda", email, password = "a-good-password-1" }).Json();
        Assert.Equal("Chanda Banda", me["name"]!.GetValue<string>());

        await client.PostAsync("/api/auth/logout", null);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/me")).StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/login", new { email, password = "wrong-password-9" })).StatusCode);
        (await client.PostAsJsonAsync("/api/auth/login", new { email, password = "a-good-password-1" })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/me")).StatusCode);
    }

    [Fact]
    public async Task WeakPasswordsAndRepeatedEmailsAreRefused()
    {
        var client = app.CreateClient();
        var email = $"{Guid.NewGuid():N}@example.com";
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/auth/register", new { name = "A B", email, password = "short" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/auth/register", new { name = "A B", email, password = "12345678" })).StatusCode);
        (await client.PostAsJsonAsync("/api/auth/register", new { name = "A B", email, password = "a-good-password-1" })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync("/api/auth/register", new { name = "A B", email, password = "a-good-password-1" })).StatusCode);
    }

    [Fact]
    public async Task ChangingThePasswordEndsEveryOlderSignIn()
    {
        var email = $"{Guid.NewGuid():N}@example.com";
        var phone = app.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        var laptop = app.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        (await phone.PostAsJsonAsync("/api/auth/register", new { name = "A B", email, password = "a-good-password-1" })).EnsureSuccessStatusCode();
        (await laptop.PostAsJsonAsync("/api/auth/login", new { email, password = "a-good-password-1" })).EnsureSuccessStatusCode();

        (await laptop.PostAsJsonAsync("/api/me/password", new { current = "a-good-password-1", next = "another-good-one-2" })).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.Unauthorized, (await phone.GetAsync("/api/me")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await laptop.GetAsync("/api/me")).StatusCode);
    }

    [Fact]
    public async Task OneLearnerCannotSeeOrTouchAnothersWork()
    {
        var (_, course, questions) = await Ready(Short());
        var stranger = await app.SignedUp("Someone Else");
        var document = await app.WithDb(db => db.Documents.Select(d => d.Id).FirstAsync());

        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/api/courses/{course}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.DeleteAsync($"/api/courses/{course}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/api/documents/{document}/pages/1")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.Answer(questions[0].Id, "It makes ribosomes.")).StatusCode);
        Assert.Empty((await stranger.GetAsync("/api/courses").Json()).AsArray());
    }

    [Fact]
    public async Task AnotherWebsiteCannotUseALearnersSignIn()
    {
        var client = await app.SignedUp();
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/courses") { Content = JsonContent.Create(new { name = "Planted" }) };
        request.Headers.Add("Origin", "https://evil.example");
        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(request)).StatusCode);
        Assert.Empty((await client.GetAsync("/api/courses").Json()).AsArray());
    }

    [Fact]
    public async Task DeletingAnAccountRemovesEverythingOfTheirs()
    {
        var (client, _, _) = await Ready(Short(), Choice());
        var request = new HttpRequestMessage(HttpMethod.Delete, "/api/me") { Content = JsonContent.Create(new { password = "a-good-password-1" }) };
        (await client.SendAsync(request)).EnsureSuccessStatusCode();

        Assert.Equal(0, await app.WithDb(db => db.Users.CountAsync()));
        Assert.Equal(0, await app.WithDb(db => db.Questions.CountAsync()));
        Assert.Equal(0, await app.WithDb(db => db.Pages.CountAsync()));
    }

    // ------------------------------------------------- reading and questions

    [Fact]
    public async Task QuestionsAreKeptOnlyWhenTheirSourceIsOnTheLearnersPage()
    {
        var invented = Short("State the function of the lysosome.", "Lysosomes contain digestive enzymes that break down worn-out organelles.");
        var (client, course, questions) = await Ready(Short(), Choice(), invented);

        Assert.Equal(2, questions.Count);
        Assert.DoesNotContain(questions, q => q.Prompt.Contains("lysosome"));
        Assert.All(questions, q => Assert.True(Words.AppearsOn(q.SourceQuote, Notes)));

        var view = await client.GetAsync($"/api/courses/{course}").Json();
        var document = view["documents"]![0]!;
        Assert.Equal("Ready", document["status"]!.GetValue<string>());
        Assert.Equal(3, document["proposed"]!.GetValue<int>());
        Assert.Equal(1, document["notOnPage"]!.GetValue<int>());
        Assert.Equal(2, document["questionCount"]!.GetValue<int>());
    }

    [Fact]
    public async Task AMathsQuestionIsKeptOnlyWhenASecondWorkingAgreesByCalculation()
    {
        var wrong = Sum("Solve x^2 - 5x + 6 = 0.", "1, 6");
        app.Ai.Answers["make-questions"] = _ => Http.Node(new { questions = new[] { Sum(), wrong } });
        // The independent working agrees with the first sum and disagrees with the second.
        app.Ai.Answers["confirm-maths"] = _ => Http.Node(new { answers = new[] { new { n = 1, final = "x = 4, x = 3" }, new { n = 2, final = "x = 2 or x = 3" } } });
        var client = await app.SignedUp();
        var course = await client.NewCourse("Maths");
        await client.AddText(course, Notes);
        await app.ReadWaitingDocuments();

        var kept = await app.WithDb(db => db.Questions.ToListAsync());
        Assert.Single(kept);
        Assert.Equal("Solve x^2 - 7x + 12 = 0.", kept[0].Prompt);
    }

    [Fact]
    public async Task WithNoModelTheLearnerStillGetsQuestions()
    {
        app.Ai.Available = false;
        var client = await app.SignedUp();
        var course = await client.NewCourse();
        await client.AddText(course, Notes);
        await app.ReadWaitingDocuments();

        var questions = await app.WithDb(db => db.Questions.ToListAsync());
        Assert.NotEmpty(questions);
        Assert.All(questions, q => Assert.Equal("rules", q.MadeBy));
        var blank = questions[0];
        var marked = await client.Answer(blank.Id, blank.Answer.ToUpperInvariant()).Json();
        Assert.Equal(1, marked["verdict"]!["score"]!.GetValue<int>());
    }

    [Fact]
    public async Task APastPaperTeachesTheStyleThatNewQuestionsFollow()
    {
        app.Ai.Answers["learn-style"] = _ => Http.Node(new { layout = "Section A short questions, Section B structured.", examples = new[] { "Define the term osmosis. [2]" } });
        app.Ai.Answers["make-questions"] = _ => Http.Node(new { questions = new[] { Short() } });
        var client = await app.SignedUp();
        var course = await client.NewCourse();

        await client.AddText(course, "SECTION A\n1. State two functions of the nucleus. [2]\n2. Define the term osmosis. [2]\n" +
                                     "SECTION B\n3. (a) Describe the structure of a mitochondrion. [4]\n(b) Explain why muscle cells have many. [4]", "PastPaper", "Test 1");
        await app.ReadWaitingDocuments();
        await client.AddText(course, Notes);
        await app.ReadWaitingDocuments();

        var view = await client.GetAsync($"/api/courses/{course}").Json();
        Assert.Contains("describe", view["style"]!["commandWords"]!.AsArray().Select(w => w!.GetValue<string>()));
        Assert.Equal("Section A short questions, Section B structured.", view["style"]!["layout"]!.GetValue<string>());

        var asked = app.Ai.Calls.Last(call => call.Purpose == "make-questions").Request;
        Assert.Contains("Match this exam's style", asked);
        Assert.Contains("describe", asked);
        Assert.Contains("Define the term osmosis. [2]", asked);
        // A past paper teaches style; it is not turned into questions itself.
        Assert.Equal(1, await app.WithDb(db => db.Questions.CountAsync()));
    }

    [Fact]
    public async Task APdfWithRealTextIsReadWithoutAnyModel()
    {
        app.Ai.Answers["make-questions"] = _ => Http.Node(new { questions = new[] { Short() } });
        var builder = new PdfDocumentBuilder();
        var font = builder.AddStandard14Font(Standard14Font.Helvetica);
        var page = builder.AddPage(PageSize.A4);
        var lines = new[]
        {
            "The nucleus contains the cell's DNA and controls the activities of the cell.",
            "Inside the nucleus, the nucleolus makes ribosomes.",
            "Mitochondria are the site of aerobic respiration, where most ATP is produced.",
        };
        for (var i = 0; i < lines.Length; i++) page.AddText(lines[i], 11, new PdfPoint(40, 780 - i * 18), font);

        var client = await app.SignedUp();
        var course = await client.NewCourse();
        (await client.AddFile(course, builder.Build(), "lecture4.pdf")).EnsureSuccessStatusCode();
        await app.ReadWaitingDocuments();

        Assert.DoesNotContain(app.Ai.Calls, call => call.Purpose == "read-document");
        var text = await app.WithDb(db => db.Pages.Select(p => p.Text).FirstAsync());
        Assert.Contains("nucleolus makes ribosomes", text);
        // Only the words are kept, never the file.
        Assert.Null(await app.WithDb(db => db.Documents.Select(d => d.Upload).FirstAsync()));
        Assert.Equal(1, await app.WithDb(db => db.Questions.CountAsync()));
    }

    [Fact]
    public async Task AFileThatIsNotWhatItsNameSaysIsRefused()
    {
        var client = await app.SignedUp();
        var course = await client.NewCourse();
        var notAPdf = "This is only text pretending to be a PDF, padded so that it is long enough."u8.ToArray();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.AddFile(course, notAPdf, "notes.pdf")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.AddFile(course, notAPdf, "notes.exe")).StatusCode);
    }

    // ------------------------------------------------------------- marking

    [Fact]
    public async Task MultipleChoiceIsMarkedExactlyAndTheAnswerIsNotSentBeforehand()
    {
        var (client, _, questions) = await Ready(Choice());
        var today = await client.GetAsync("/api/today").Json();
        var shown = today["questions"]![0]!;
        Assert.Null(shown["answer"]);
        Assert.Equal(4, shown["options"]!.AsArray().Count);

        var wrong = await client.Answer(questions[0].Id, "Nucleus").Json();
        Assert.Equal(0, wrong["verdict"]!["score"]!.GetValue<int>());
        Assert.Equal("Mitochondria", wrong["answer"]!.GetValue<string>());
        Assert.Equal("Mitochondria are the site of aerobic respiration", wrong["quote"]!.GetValue<string>());

        var right = await client.Answer(questions[0].Id, "mitochondria").Json();
        Assert.Equal(1, right["verdict"]!["score"]!.GetValue<int>());
    }

    [Fact]
    public async Task AMathsFinalAnswerIsMarkedByCalculationWithNoModelInvolved()
    {
        var (client, _, questions) = await Ready(Sum());
        app.Ai.Calls.Clear();

        var right = await client.Answer(questions[0].Id, "x = 4 or x = 3").Json();
        var wrong = await client.Answer(questions[0].Id, "x = 3 or x = 5").Json();

        Assert.Equal(3, right["verdict"]!["score"]!.GetValue<int>());
        Assert.Equal("engine", right["verdict"]!["markedBy"]!.GetValue<string>());
        Assert.True(right["verdict"]!["finalAnswerRight"]!.GetValue<bool>());
        Assert.Equal(0, wrong["verdict"]!["score"]!.GetValue<int>());
        Assert.False(wrong["verdict"]!["finalAnswerRight"]!.GetValue<bool>());
        Assert.Empty(app.Ai.Calls);
    }

    [Fact]
    public async Task HandwrittenWorkingEarnsMethodMarksButAWrongFinalAnswerCannotEarnFullMarks()
    {
        var (client, _, questions) = await Ready(Sum());
        // The model reads the photo generously and gives every mark, though the final answer is wrong.
        app.Ai.Answers["mark-photo"] = _ => Http.Node(new
        {
            read = new[] { "x^2 - 7x + 12 = 0", "(x - 3)(x - 4) = 0", "x = 3 or x = 5" }, unsure = new[] { "x = 3 or x = 5" }, final_answer = "x = 3 or x = 5",
            awards = new[] { new { n = 1, earned = 2, note = "Correct factorisation." }, new { n = 2, earned = 1, note = "Roots stated." } },
            summary = "Well done.",
        });

        var marked = await client.Answer(questions[0].Id, "", [0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4]).Json();
        var verdict = marked["verdict"]!;

        Assert.Equal(2, verdict["score"]!.GetValue<int>());
        Assert.False(verdict["finalAnswerRight"]!.GetValue<bool>());
        Assert.Equal(3, verdict["read"]!.AsArray().Count);
        Assert.Single(verdict["unsure"]!.AsArray());
        Assert.Contains("does not match", verdict["summary"]!.GetValue<string>());
    }

    [Fact]
    public async Task HandwrittenWorkingWithTheRightFinalAnswerEarnsFullMarks()
    {
        var (client, _, questions) = await Ready(Sum());
        // The model is stingy with the steps, but the answer is right by calculation.
        app.Ai.Answers["mark-photo"] = _ => Http.Node(new
        {
            read = new[] { "(x-3)(x-4)=0", "x = 3, 4" }, unsure = Array.Empty<string>(), final_answer = "x = 3, 4",
            awards = new[] { new { n = 1, earned = 1, note = "" }, new { n = 2, earned = 0, note = "" } }, summary = "",
        });
        var marked = await client.Answer(questions[0].Id, "", [0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4]).Json();
        Assert.Equal(3, marked["verdict"]!["score"]!.GetValue<int>());
        Assert.True(marked["verdict"]!["finalAnswerRight"]!.GetValue<bool>());
    }

    [Fact]
    public async Task PhotoMarkingStopsAtTheDailyLimit()
    {
        var (client, _, questions) = await Ready(Sum());
        app.Ai.Answers["mark-photo"] = _ => Http.Node(new { read = new[] { "x = 3, 4" }, final_answer = "3, 4", awards = new[] { new { n = 1, earned = 2 }, new { n = 2, earned = 1 } } });
        byte[] photo = [0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4];
        for (var i = 0; i < 10; i++) (await client.Answer(questions[0].Id, "", photo)).EnsureSuccessStatusCode();

        Assert.Equal((HttpStatusCode)429, (await client.Answer(questions[0].Id, "", photo)).StatusCode);
        // Typing still works.
        (await client.Answer(questions[0].Id, "3, 4")).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task AWrittenAnswerIsMarkedPointByPointAgainstTheScheme()
    {
        var (client, _, questions) = await Ready(Short());
        app.Ai.Answers["mark-answer"] = _ => Http.Node(new
        {
            awards = new[] { new { n = 1, earned = 1, note = "Yes." }, new { n = 2, earned = 0, note = "You did not say where." } },
            summary = "One of two points.",
        });
        var marked = await client.Answer(questions[0].Id, "It makes ribosomes").Json();
        Assert.Equal(1, marked["verdict"]!["score"]!.GetValue<int>());
        Assert.Equal("ai", marked["verdict"]!["markedBy"]!.GetValue<string>());
        Assert.Equal("You did not say where.", marked["verdict"]!["awards"]![1]!["note"]!.GetValue<string>());
    }

    [Fact]
    public async Task WithNoModelAWrittenAnswerIsMarkedByItsWordsAndSaysSo()
    {
        var (client, _, questions) = await Ready(Short());
        app.Ai.Available = false;
        var marked = await client.Answer(questions[0].Id, "The nucleolus is where ribosomes get made").Json();
        Assert.Equal("rules", marked["verdict"]!["markedBy"]!.GetValue<string>());
        Assert.Equal(1, marked["verdict"]!["score"]!.GetValue<int>());
        Assert.Contains("check it against the scheme", marked["verdict"]!["summary"]!.GetValue<string>());
    }

    // ------------------------------------------------- challenging a mark

    private static readonly byte[] Photo = [0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4];

    /// <summary>A written answer that the first marker gave 1 of 2.</summary>
    private async Task<(HttpClient Client, Guid Attempt)> MarkedOneOfTwo()
    {
        var (client, _, questions) = await Ready(Short());
        app.Ai.Answers["mark-answer"] = _ => Http.Node(new
        {
            awards = new[] { new { n = 1, earned = 1, note = "Yes." }, new { n = 2, earned = 0, note = "You did not say where." } }, summary = "One of two.",
        });
        var marked = await client.Answer(questions[0].Id, "The nucleolus, inside the nucleus, makes ribosomes").Json();
        return (client, marked["attemptId"]!.GetValue<Guid>());
    }

    [Fact]
    public async Task ALearnerCannotGiveThemselvesMarks()
    {
        var (client, attempt) = await MarkedOneOfTwo();
        // The old way: sending a score. It is not accepted in any form.
        Assert.False((await client.PostAsJsonAsync($"/api/attempts/{attempt}/dispute", new { score = 2 })).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.Challenge(attempt, "no")).StatusCode);
        Assert.Equal(1, (await app.WithDb(db => db.Attempts.FirstAsync())).Score);
    }

    [Fact]
    public async Task AFairChallengeRaisesTheMarkAndSaysWhy()
    {
        var (client, attempt) = await MarkedOneOfTwo();
        app.Ai.Answers["review-answer"] = _ => Http.Node(new
        {
            awards = new[] { new { n = 1, earned = 1, note = "" }, new { n = 2, earned = 1, note = "You did write 'inside the nucleus'." } },
            decision = "changed", reply = "You are right: your answer says the ribosomes are made inside the nucleus. That earns the second point.",
        });

        var result = await client.Challenge(attempt, "I wrote that it happens inside the nucleus, which is the second point.").Json();

        Assert.Equal(2, result["verdict"]!["score"]!.GetValue<int>());
        Assert.Equal("changed", result["verdict"]!["review"]!["decision"]!.GetValue<string>());
        Assert.Equal(1, result["verdict"]!["review"]!["before"]!.GetValue<int>());
        Assert.Contains("inside the nucleus", result["verdict"]!["review"]!["reply"]!.GetValue<string>());
        var saved = await app.WithDb(db => db.Attempts.FirstAsync());
        Assert.Equal(2, saved.Score);
        Assert.True(saved.Disputed);
        Assert.Equal(1.0, (await app.WithDb(db => db.Reviews.FirstAsync())).LastScore);
        // The examiner was shown the original answer, the scheme and the learner's reason.
        var asked = app.Ai.Calls.Last(call => call.Purpose == "review-answer").Request;
        Assert.Contains("The nucleolus, inside the nucleus, makes ribosomes", asked);
        Assert.Contains("which is the second point", asked);
    }

    [Fact]
    public async Task AnUnfairChallengeIsRefusedWithAReasonAndTheMarkStands()
    {
        var (client, attempt) = await MarkedOneOfTwo();
        app.Ai.Answers["review-answer"] = _ => Http.Node(new
        {
            awards = new[] { new { n = 1, earned = 1, note = "" }, new { n = 2, earned = 0, note = "Not in the answer." } },
            decision = "upheld", reply = "Marks are for what is written. Your answer does not mention where the ribosomes are made, so the mark stands.",
        });

        var result = await client.Challenge(attempt, "I knew the second point, I just did not write it down. Give me the mark.").Json();

        Assert.Equal(1, result["verdict"]!["score"]!.GetValue<int>());
        Assert.Equal("upheld", result["verdict"]!["review"]!["decision"]!.GetValue<string>());
        Assert.Contains("the mark stands", result["verdict"]!["review"]!["reply"]!.GetValue<string>());
        Assert.Equal(1, (await app.WithDb(db => db.Attempts.FirstAsync())).Score);
    }

    [Fact]
    public async Task EachAnswerIsReviewedOnceAndTheDecisionIsFinal()
    {
        var (client, attempt) = await MarkedOneOfTwo();
        app.Ai.Answers["review-answer"] = _ => Http.Node(new { awards = new[] { new { n = 1, earned = 1 }, new { n = 2, earned = 0 } }, decision = "upheld", reply = "The mark stands." });
        (await client.Challenge(attempt, "Please look at my second sentence again.")).EnsureSuccessStatusCode();

        // Even a reviewer who would now say yes is not asked a second time.
        app.Ai.Answers["review-answer"] = _ => Http.Node(new { awards = new[] { new { n = 1, earned = 1 }, new { n = 2, earned = 1 } }, decision = "changed", reply = "Fine." });
        Assert.Equal(HttpStatusCode.Conflict, (await client.Challenge(attempt, "Please look at it one more time.")).StatusCode);
        Assert.Equal(1, (await app.WithDb(db => db.Attempts.FirstAsync())).Score);
    }

    [Fact]
    public async Task AReviewNeverTakesMarksAway()
    {
        var (client, attempt) = await MarkedOneOfTwo();
        app.Ai.Answers["review-answer"] = _ => Http.Node(new { awards = new[] { new { n = 1, earned = 0 }, new { n = 2, earned = 0 } }, decision = "changed", reply = "On reflection, nothing." });
        var result = await client.Challenge(attempt, "I think I deserve both marks for this answer.").Json();
        Assert.Equal(1, result["verdict"]!["score"]!.GetValue<int>());
        Assert.Equal("upheld", result["verdict"]!["review"]!["decision"]!.GetValue<string>());
    }

    [Fact]
    public async Task AMathsAnswerCheckedByCalculationCannotBeArguedUp()
    {
        var (client, _, questions) = await Ready(Sum());
        var marked = await client.Answer(questions[0].Id, "x = 3 or x = 5").Json();
        app.Ai.Calls.Clear();

        var result = await client.Challenge(marked["attemptId"]!.GetValue<Guid>(), "My answer is correct, the marking is wrong.").Json();

        Assert.Equal(0, result["verdict"]!["score"]!.GetValue<int>());
        Assert.Equal("upheld", result["verdict"]!["review"]!["decision"]!.GetValue<string>());
        Assert.Contains("by calculation", result["verdict"]!["review"]!["reply"]!.GetValue<string>());
        Assert.Empty(app.Ai.Calls); // no model is asked to overrule arithmetic
    }

    [Fact]
    public async Task AClearerPhotoOfTheSameWorkingCanCorrectAMisreading()
    {
        var (client, _, questions) = await Ready(Sum());
        // First reading: the 4 was misread as a 5.
        app.Ai.Answers["mark-photo"] = _ => Http.Node(new
        {
            read = new[] { "(x - 3)(x - 4) = 0", "x = 3 or x = 5" }, unsure = new[] { "x = 3 or x = 5" }, final_answer = "x = 3 or x = 5",
            awards = new[] { new { n = 1, earned = 2, note = "" }, new { n = 2, earned = 0, note = "" } }, summary = "",
        });
        var marked = await client.Answer(questions[0].Id, "", Photo).Json();
        Assert.Equal(2, marked["verdict"]!["score"]!.GetValue<int>());

        app.Ai.Answers["review-photo"] = _ => Http.Node(new
        {
            read = new[] { "(x - 3)(x - 4) = 0", "x = 3 or x = 4" }, same_working = true, final_answer = "x = 3 or x = 4",
            awards = new[] { new { n = 1, earned = 2, note = "" }, new { n = 2, earned = 1, note = "Both roots are stated." } },
            decision = "changed", reply = "The clearer photo shows a 4, not a 5. Both roots are right.",
        });
        var result = await client.Challenge(marked["attemptId"]!.GetValue<Guid>(), "My last line says x = 4, it was read as 5.", Photo).Json();

        Assert.Equal(3, result["verdict"]!["score"]!.GetValue<int>());
        Assert.True(result["verdict"]!["finalAnswerRight"]!.GetValue<bool>());
        Assert.Equal("x = 3 or x = 4", result["verdict"]!["read"]![1]!.GetValue<string>());
    }

    [Fact]
    public async Task APhotoOfDifferentWorkingDoesNotChangeTheMark()
    {
        var (client, _, questions) = await Ready(Sum());
        app.Ai.Answers["mark-photo"] = _ => Http.Node(new
        {
            read = new[] { "x = 1 or x = 12" }, final_answer = "x = 1 or x = 12",
            awards = new[] { new { n = 1, earned = 0, note = "" }, new { n = 2, earned = 0, note = "" } }, summary = "",
        });
        var marked = await client.Answer(questions[0].Id, "", Photo).Json();

        // The learner uploads a corrected solution after seeing the answer.
        app.Ai.Answers["review-photo"] = _ => Http.Node(new
        {
            read = new[] { "(x - 3)(x - 4) = 0", "x = 3 or x = 4" }, same_working = false, final_answer = "x = 3 or x = 4",
            awards = new[] { new { n = 1, earned = 2 }, new { n = 2, earned = 1 } }, decision = "changed",
            reply = "This photo shows different working from the answer that was marked, so the mark stands.",
        });
        var result = await client.Challenge(marked["attemptId"]!.GetValue<Guid>(), "Here is my working, it is all correct.", Photo).Json();

        Assert.Equal(0, result["verdict"]!["score"]!.GetValue<int>());
        Assert.Equal("upheld", result["verdict"]!["review"]!["decision"]!.GetValue<string>());
    }

    [Fact]
    public async Task WhenNoModelAnswersTheChallengeIsNotUsedUp()
    {
        var (client, attempt) = await MarkedOneOfTwo();
        app.Ai.Available = false;
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await client.Challenge(attempt, "Please look at my second sentence again.")).StatusCode);
        Assert.False((await app.WithDb(db => db.Attempts.FirstAsync())).Disputed);
    }

    // ------------------------------------------------- schedule and pulse

    [Fact]
    public async Task AnAnsweredQuestionLeavesTodaysSetAndIsBookedToComeBack()
    {
        var (client, _, questions) = await Ready(Choice(), Short());
        Assert.Equal(2, (await client.GetAsync("/api/today").Json())["questions"]!.AsArray().Count);

        var marked = await client.Answer(questions[0].Id, "Mitochondria").Json();
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1);
        Assert.Equal(tomorrow.ToString("yyyy-MM-dd"), marked["nextDue"]!.GetValue<string>());

        var today = await client.GetAsync("/api/today").Json();
        Assert.Single(today["questions"]!.AsArray());
        Assert.Equal(1, today["doneToday"]!.GetValue<int>());
    }

    [Fact]
    public async Task NewQuestionsAreRationedSoADayStaysShort()
    {
        var many = Enumerable.Range(1, 9).Select(i => Short($"State fact number {i} about the nucleolus.")).ToArray();
        var (client, _, _) = await Ready(many);
        var today = await client.GetAsync("/api/today").Json();
        Assert.Equal(6, today["questions"]!.AsArray().Count);
        Assert.Equal(9, today["totalQuestions"]!.GetValue<int>());
    }

    [Fact]
    public async Task ThePulseCountsQuestionsNeverTriedAsZero()
    {
        var (client, _, questions) = await Ready(Choice(), Short());
        Assert.Equal(0, (await client.GetAsync("/api/pulse").Json())["percent"]!.GetValue<int>());

        await client.Answer(questions[0].Id, "Mitochondria");
        var pulse = await client.GetAsync("/api/pulse").Json();
        Assert.Equal(50, pulse["percent"]!.GetValue<int>());
        Assert.Equal(1, pulse["seen"]!.GetValue<int>());
        Assert.Equal(1, pulse["streak"]!.GetValue<int>());
        var topics = pulse["courses"]![0]!["topics"]!.AsArray();
        Assert.Equal("Not started yet.", topics.First(t => t!["topic"]!.GetValue<string>() == "Nucleus")!["reading"]!.GetValue<string>());
    }

    // ------------------------------------------------------------- the demo

    [Fact]
    public async Task TheDemoGivesEachVisitorTheirOwnLearnerWithRealHistory()
    {
        var first = app.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        var second = app.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        var a = await first.PostAsync("/api/auth/demo", null).Json();
        var b = await second.PostAsync("/api/auth/demo", null).Json();
        Assert.NotEqual(a["id"]!.GetValue<Guid>(), b["id"]!.GetValue<Guid>());
        Assert.True(a["isDemo"]!.GetValue<bool>());

        var pulse = await first.GetAsync("/api/pulse").Json();
        Assert.Equal(2, pulse["courses"]!.AsArray().Count);
        Assert.InRange(pulse["percent"]!.GetValue<int>(), 5, 95);
        Assert.NotEmpty((await first.GetAsync("/api/today").Json())["questions"]!.AsArray());

        // Every demo question rests on its own page, and every maths answer reads as maths.
        var questions = await app.WithDb(db => db.Questions.ToListAsync());
        var pages = await app.WithDb(db => db.Pages.ToListAsync());
        Assert.All(questions, q => Assert.True(
            Words.AppearsOn(q.SourceQuote, pages.First(p => p.DocumentId == q.DocumentId && p.Number == q.PageNumber).Text), q.Prompt));
        Assert.All(questions.Where(q => q.Kind == QuestionKind.Maths), q =>
            Assert.Equal(EduPulse.Api.Marking.MathsEngine.Outcome.Same, EduPulse.Api.Marking.MathsEngine.Compare(q.AnswerExpression!, q.Answer)));
    }
}

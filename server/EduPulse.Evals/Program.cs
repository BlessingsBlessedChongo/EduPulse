// Measures how far EduPulse's marking and checks can be trusted, and writes the
// results to docs/MEASURED.md. Run it from the repository root:
//
//     dotnet run --project server/EduPulse.Evals
//
// Parts 1 and 2 need nothing but the code. Parts 3 and 4 call the real models,
// so they need GEMINI_API_KEY or GROQ_API_KEY in .env and use a little of the
// free allowance.

using System.Globalization;
using System.Text;
using EduPulse.Api;
using EduPulse.Api.Ai;
using EduPulse.Api.Data;
using EduPulse.Api.Marking;
using EduPulse.Api.Questions;
using EduPulse.Api.Reading;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

Settings.LoadDotEnv();
var config = new ConfigurationBuilder().AddEnvironmentVariables().Build();
var settings = Settings.From(config, new EvalEnvironment());

var services = new ServiceCollection();
services.AddLogging(logging => logging.SetMinimumLevel(LogLevel.Error));
services.AddSingleton(settings.Ai);
services.AddDbContext<AppDb>(options => options.UseNpgsql(settings.Database));
services.AddHttpClient<IAi, AiRouter>();
var provider = services.BuildServiceProvider();
var ai = provider.GetRequiredService<IAi>();
var off = new NoAi();
var learner = Guid.NewGuid();

var report = new StringBuilder();
report.AppendLine("# What has been measured");
report.AppendLine();
report.AppendLine($"Produced by `dotnet run --project server/EduPulse.Evals` on {DateTime.UtcNow:d MMMM yyyy}.");
report.AppendLine($"Models: {(settings.Ai.GeminiKey.Length > 0 ? settings.Ai.GeminiModels.Replace(",", ", ") : "no Gemini key")}" +
                  $"{(settings.Ai.GroqKey.Length > 0 ? "; then " + settings.Ai.GroqModel : "")}.");
report.AppendLine();
report.AppendLine("These are small test sets written and labelled by the project's author. They show how the checks behave; they are not a claim about every subject or every handwriting.");
report.AppendLine();

// ---------------------------------------------------------------- 1. maths
var sums = Sets.Maths;
var sumsRight = sums.Count(pair => (MathsEngine.Compare(pair.Expected, pair.Given) == MathsEngine.Outcome.Same) == pair.Same);
var falsePasses = sums.Count(pair => !pair.Same && MathsEngine.Compare(pair.Expected, pair.Given) == MathsEngine.Outcome.Same);
report.AppendLine("## 1. Maths final answers, checked by calculation");
report.AppendLine();
report.AppendLine($"{sums.Count} pairs of an expected answer and a learner's answer, half the same answer written differently and half a different answer. No model is involved.");
report.AppendLine();
report.AppendLine("| | Result |");
report.AppendLine("|---|---|");
report.AppendLine($"| Judged correctly | {sumsRight} of {sums.Count} ({Percent(sumsRight, sums.Count)}) |");
report.AppendLine($"| Wrong answers accepted as right | {falsePasses} |");
report.AppendLine();
foreach (var miss in sums.Where(pair => (MathsEngine.Compare(pair.Expected, pair.Given) == MathsEngine.Outcome.Same) != pair.Same))
{
    report.AppendLine($"- Misjudged: expected `{miss.Expected}`, given `{miss.Given}`, should be {(miss.Same ? "the same" : "different")}.");
}
Console.WriteLine($"1. maths: {sumsRight}/{sums.Count}, wrong accepted {falsePasses}");

// ------------------------------------------------------- 2. the source check
var quotes = Sets.Quotes;
var quotesRight = quotes.Count(q => Words.AppearsOn(q.Quote, Sets.Page) == q.OnPage);
var inventedAccepted = quotes.Count(q => !q.OnPage && Words.AppearsOn(q.Quote, Sets.Page));
report.AppendLine();
report.AppendLine("## 2. Is the quoted sentence really on the learner's page?");
report.AppendLine();
report.AppendLine($"{quotes.Count} quotes checked against one page of notes: half taken from the page (some with the spacing, punctuation or one word changed, as reading a photo does), half taken from other notes on the same subject.");
report.AppendLine();
report.AppendLine("| | Result |");
report.AppendLine("|---|---|");
report.AppendLine($"| Judged correctly | {quotesRight} of {quotes.Count} ({Percent(quotesRight, quotes.Count)}) |");
report.AppendLine($"| Quotes from elsewhere accepted | {inventedAccepted} |");
Console.WriteLine($"2. quotes: {quotesRight}/{quotes.Count}, foreign accepted {inventedAccepted}");

// ------------------------------------------------------- 3. written answers
var marker = new Marker(ai);
var ruleMarker = new Marker(off);
int exact = 0, close = 0, ruleExact = 0, ruleClose = 0, marked = 0, generous = 0, harsh = 0;
double error = 0, ruleError = 0;
var disagreements = new List<string>();
foreach (var item in Sets.Answers)
{
    var question = new Question
    {
        Id = Guid.NewGuid(), Kind = QuestionKind.Short, Prompt = item.Prompt, Answer = "", Marks = item.Scheme.Sum(p => p.Marks),
        SchemeJson = QuestionMaker.SchemeJson(item.Scheme.ToList()),
    };
    var byRules = await ruleMarker.MarkAsync(question, item.Answer, null, learner, CancellationToken.None);
    if (byRules.Score == item.Human) ruleExact++;
    if (Math.Abs(byRules.Score - item.Human) <= 1) ruleClose++;
    ruleError += Math.Abs(byRules.Score - item.Human);

    if (!ai.Available) continue;
    var verdict = await marker.MarkAsync(question, item.Answer, null, learner, CancellationToken.None);
    if (verdict.MarkedBy != "ai") continue; // the model did not answer; not counted either way
    marked++;
    if (verdict.Score == item.Human) exact++;
    else disagreements.Add($"- \"{item.Answer}\" ({item.Prompt}): the author gave {item.Human}, the model gave {verdict.Score} of {question.Marks}.");
    if (Math.Abs(verdict.Score - item.Human) <= 1) close++;
    if (verdict.Score > item.Human) generous++;
    if (verdict.Score < item.Human) harsh++;
    error += Math.Abs(verdict.Score - item.Human);
    await Task.Delay(1500); // stay inside the free allowance
}
report.AppendLine();
report.AppendLine("## 3. Written answers, marked against a scheme");
report.AppendLine();
report.AppendLine($"{Sets.Answers.Count} answers to six biology questions, from full-mark answers to wrong ones, each given a mark by the author first. The table shows how often the automatic mark agreed.");
report.AppendLine();
report.AppendLine("| | Marked by AI | Marked by rules (no AI) |");
report.AppendLine("|---|---|---|");
if (marked > 0)
{
    report.AppendLine($"| Same mark as the author | {exact} of {marked} ({Percent(exact, marked)}) | {ruleExact} of {Sets.Answers.Count} ({Percent(ruleExact, Sets.Answers.Count)}) |");
    report.AppendLine($"| Within one mark | {close} of {marked} ({Percent(close, marked)}) | {ruleClose} of {Sets.Answers.Count} ({Percent(ruleClose, Sets.Answers.Count)}) |");
    report.AppendLine($"| Average distance from the author's mark | {(error / marked).ToString("0.00", CultureInfo.InvariantCulture)} marks | {(ruleError / Sets.Answers.Count).ToString("0.00", CultureInfo.InvariantCulture)} marks |");
    report.AppendLine($"| More generous than the author | {generous} | |");
    report.AppendLine($"| Harsher than the author | {harsh} | |");
    if (marked < Sets.Answers.Count)
    {
        report.AppendLine();
        report.AppendLine($"The model gave no answer for {Sets.Answers.Count - marked} of the {Sets.Answers.Count}; those are not counted on the AI side.");
    }
}
else
{
    report.AppendLine($"| Same mark as the author | not run: no model answered | {ruleExact} of {Sets.Answers.Count} ({Percent(ruleExact, Sets.Answers.Count)}) |");
    report.AppendLine($"| Within one mark | | {ruleClose} of {Sets.Answers.Count} ({Percent(ruleClose, Sets.Answers.Count)}) |");
}
if (disagreements.Count > 0)
{
    report.AppendLine();
    report.AppendLine("Where the model and the author disagreed:");
    report.AppendLine();
    foreach (var line in disagreements) report.AppendLine(line);
}
Console.WriteLine($"3. marking: ai exact {exact}/{marked}, within one {close}/{marked}; rules exact {ruleExact}/{Sets.Answers.Count}");

// ------------------------------------------------------- 4. writing questions
report.AppendLine();
report.AppendLine("## 4. Writing questions from notes");
report.AppendLine();
if (ai.Available)
{
    var maker = new QuestionMaker(ai);
    int proposed = 0, notOnPage = 0, failed = 0, kept = 0, maths = 0;
    foreach (var (title, text) in Sets.Notes)
    {
        var pages = DocumentReader.FromText(text).Pages;
        var result = await maker.MakeAsync(pages, null, [], title, learner, CancellationToken.None);
        proposed += result.Proposed;
        notOnPage += result.NotOnThePage;
        failed += result.FailedChecks;
        kept += result.Kept.Count;
        maths += result.Kept.Count(k => k.Kind == QuestionKind.Maths);
        await Task.Delay(1500);
    }
    report.AppendLine($"{Sets.Notes.Count} short sets of notes (biology, chemistry, mathematics) were given to the question writer.");
    report.AppendLine();
    report.AppendLine("| | Count |");
    report.AppendLine("|---|---|");
    report.AppendLine($"| Questions the model proposed | {proposed} |");
    report.AppendLine($"| Refused: the quoted source was not on the page | {notOnPage} |");
    report.AppendLine($"| Refused: badly formed, or a maths answer a second working did not confirm | {failed} |");
    report.AppendLine($"| Kept | {kept} ({Percent(kept, Math.Max(1, proposed))}) |");
    report.AppendLine($"| Of those kept, calculations confirmed by a second working | {maths} |");
    Console.WriteLine($"4. questions: proposed {proposed}, not on page {notOnPage}, failed {failed}, kept {kept}");
}
else
{
    report.AppendLine("Not run: no model key was set.");
}

report.AppendLine();
report.AppendLine("## What has not been measured");
report.AppendLine();
report.AppendLine("- How accurately handwriting is read from a photo. It was tried by hand on a few clear samples only.");
report.AppendLine("- Subjects beyond the three above, and long documents.");
report.AppendLine("- Whether daily use improves exam results. That would need real learners over a term.");

var root = new DirectoryInfo(Directory.GetCurrentDirectory());
while (root is not null && !Directory.Exists(Path.Combine(root.FullName, "docs"))) root = root.Parent;
var target = Path.Combine(root?.FullName ?? ".", "docs", "MEASURED.md");
File.WriteAllText(target, report.ToString());
Console.WriteLine($"written to {target}");

static string Percent(int part, int whole) => whole == 0 ? "0%" : $"{Math.Round(100.0 * part / whole)}%";

internal sealed class EvalEnvironment : IHostEnvironment
{
    public string EnvironmentName { get; set; } = "Development";
    public string ApplicationName { get; set; } = "EduPulse.Evals";
    public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
    public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = null!;
}

/// <summary>Stands in when the rules are measured on their own.</summary>
internal sealed class NoAi : IAi
{
    public bool Available => false;
    public bool CanSee => false;
    public Task<System.Text.Json.Nodes.JsonNode?> AskAsync(string purpose, string instructions, string request, Attachment? attachment = null,
        Guid? userId = null, CancellationToken stop = default) => Task.FromResult<System.Text.Json.Nodes.JsonNode?>(null);
}

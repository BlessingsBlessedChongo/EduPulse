using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using EduPulse.Api.Ai;
using EduPulse.Api.Data;
using EduPulse.Api.Marking;
using EduPulse.Api.Reading;

namespace EduPulse.Api.Questions;

public record SchemePoint(string Point, int Marks);

/// <summary>A question that has passed every check and is ready to be saved.</summary>
public record Draft(string Topic, QuestionKind Kind, string Prompt, List<string>? Options, string Answer,
    string? AnswerExpression, List<SchemePoint> Scheme, int Marks, int Page, string Quote, string MadeBy);

public record MakeResult(List<Draft> Kept, int Proposed, int NotOnThePage, int FailedChecks);

/// <summary>
/// Writes practice questions from the learner's own pages.
///
/// A model proposes; rules decide. A question is kept only if the words it
/// claims to rest on really are on the page it names, its answer is well formed,
/// and, for maths, a second independent working reaches the same answer by
/// calculation. With no model available, simple fill-in-the-blank questions are
/// made by rules so the learner still has something to practise.
/// </summary>
public partial class QuestionMaker(IAi ai)
{
    [System.Text.RegularExpressions.GeneratedRegex(@"\s*[\[\(]\s*\d{1,2}\s*(?:marks?)?\s*[\]\)]\s*$", System.Text.RegularExpressions.RegexOptions.IgnoreCase)]
    private static partial System.Text.RegularExpressions.Regex TrailingMarks();

    private const int PagesPerRequest = 3;
    private const int MostPerDocument = 40;
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    private const string Instructions =
        "You write exam practice questions for a student, using ONLY the study material given. " +
        "Every question must be answerable from the material alone. Never use outside knowledge, and never write a question " +
        "about something the material does not cover. For each question you copy, word for word, the sentence or line from the " +
        "material that the answer rests on. Write in plain text. Maths is written in plain text such as x^2 + 3x - 4 = 0.";

    public async Task<MakeResult> MakeAsync(IReadOnlyList<ReadPage> pages, Style? style, IReadOnlyCollection<string> knownTopics,
        string documentTitle, Guid userId, CancellationToken stop)
    {
        if (!ai.Available)
        {
            var byRules = RuleQuestions.Make(pages, documentTitle).Take(MostPerDocument).ToList();
            return new MakeResult(byRules, byRules.Count, 0, 0);
        }

        var kept = new List<Draft>();
        int proposed = 0, notOnPage = 0, failed = 0;
        var topics = new HashSet<string>(knownTopics, StringComparer.OrdinalIgnoreCase);
        var seen = new HashSet<string>();
        var answered = false;

        foreach (var batch in pages.Chunk(PagesPerRequest))
        {
            if (kept.Count >= MostPerDocument) break;
            var wanted = Math.Clamp(batch.Sum(p => p.Text.Length) / 200, 4, 10);
            var answer = await ai.AskAsync("make-questions", Instructions, Request(batch, style, topics, wanted), null, userId, stop);
            if (answer is null) continue;
            answered = true;

            var candidates = new List<Draft>();
            foreach (var item in answer.Items("questions"))
            {
                proposed++;
                var (draft, reason) = Check(item, batch);
                if (draft is null)
                {
                    if (reason == "page") notOnPage++; else failed++;
                    continue;
                }
                if (!seen.Add(Words.Flatten(draft.Prompt))) continue;
                candidates.Add(draft);
            }

            var checkedMaths = await ConfirmMaths(candidates, userId, stop);
            failed += candidates.Count - checkedMaths.Count;
            foreach (var draft in checkedMaths)
            {
                topics.Add(draft.Topic);
                kept.Add(draft);
            }
        }

        if (!answered)
        {
            // Every request failed: the model is down or out of allowance. Fall back to rules.
            var byRules = RuleQuestions.Make(pages, documentTitle).Take(MostPerDocument).ToList();
            return new MakeResult(byRules, byRules.Count, 0, 0);
        }

        return new MakeResult(kept.Take(MostPerDocument).ToList(), proposed, notOnPage, failed);
    }

    private static string Request(IReadOnlyList<ReadPage> batch, Style? style, IReadOnlyCollection<string> topics, int wanted)
    {
        var text = new StringBuilder();
        text.AppendLine($"Write {wanted} practice questions from the material below.");
        text.AppendLine();

        if (style is not null)
        {
            text.AppendLine("Match this exam's style, learned from the student's past papers:");
            if (style.Layout.Length > 0) text.AppendLine($"- Layout: {style.Layout}");
            text.AppendLine($"- Mix of kinds: about {Percent(style.Choice)} multiple choice, {Percent(style.Short)} written answers, {Percent(style.Maths)} calculations." +
                            " Follow the mix only as far as the material allows.");
            if (style.CommandWords.Count > 0) text.AppendLine($"- Start questions with the words this exam uses: {string.Join(", ", style.CommandWords)}.");
            if (style.UsualMarks.Count > 0) text.AppendLine($"- Usual marks per question: {string.Join(", ", style.UsualMarks)}.");
            if (style.Examples.Count > 0)
            {
                text.AppendLine("- Real questions from this exam, as models of the wording (do not copy their subject):");
                foreach (var example in style.Examples.Take(4)) text.AppendLine($"    \"{example}\"");
            }
        }
        else
        {
            text.AppendLine("Use a mix: mostly short written answers, some multiple choice, and calculations where the material has worked maths.");
        }

        if (topics.Count > 0)
        {
            text.AppendLine();
            text.AppendLine($"Topics already used in this course (reuse a name when it fits): {string.Join("; ", topics.Take(25))}.");
        }

        text.AppendLine();
        text.AppendLine("Answer as JSON:");
        text.AppendLine("{\"questions\": [{");
        text.AppendLine("  \"topic\": \"a short topic name, 1 to 4 words\",");
        text.AppendLine("  \"kind\": \"choice\" | \"short\" | \"maths\",");
        text.AppendLine("  \"prompt\": \"the question\",");
        text.AppendLine("  \"options\": [\"four options, for choice only\"],");
        text.AppendLine("  \"answer\": \"the model answer; for choice, the correct option copied exactly\",");
        text.AppendLine("  \"answer_expression\": \"for maths only: the final answer alone with no units and no words, as a number or expression such as 3 or 0.25 or 2*x+1 or 2, -3\",");
        text.AppendLine("  \"scheme\": [{\"point\": \"what earns the mark\", \"marks\": 1}],");
        text.AppendLine("  \"marks\": 2,");
        text.AppendLine("  \"page\": 1,");
        text.AppendLine("  \"quote\": \"the sentence or line from that page, copied word for word, that the answer rests on\"");
        text.AppendLine("}]}");
        text.AppendLine();
        text.AppendLine("Rules: the scheme's marks add up to \"marks\". A maths question has one final answer and a scheme whose points are the steps of the working.");
        text.AppendLine("Cover the whole of the material, not only its first lines, and do not ask the same thing twice. Each question asks for one thing; do not bundle parts (a) and (b) into one question.");
        text.AppendLine("Where the material has a worked calculation, write a new calculation of the same kind with different numbers.");
        text.AppendLine();
        foreach (var page in batch)
        {
            text.AppendLine($"=== PAGE {page.Number} ===");
            text.AppendLine(Words.Short(page.Text, 5000));
            text.AppendLine();
        }
        return text.ToString();
    }

    private static string Percent(double share) => $"{Math.Round(share * 100)}%";

    /// <summary>The rule checks. Returns the reason for refusing: "page" or "shape".</summary>
    internal static (Draft? Draft, string Reason) Check(JsonNode item, IReadOnlyList<ReadPage> batch)
    {
        var prompt = TrailingMarks().Replace(Words.Squash(item.Text("prompt")), "").Trim();
        var answer = Words.Squash(item.Text("answer"));
        var quote = Words.Squash(item.Text("quote"));
        var topic = Tidy(item.Text("topic"));
        if (prompt.Length < 12 || answer.Length == 0 || topic.Length == 0) return (null, "shape");

        // The quote must really be on a page of this batch: the named page first, then its neighbours.
        var named = item.Number("page", batch[0].Number);
        var page = batch.FirstOrDefault(p => p.Number == named && Words.AppearsOn(quote, p.Text))
                   ?? batch.FirstOrDefault(p => Words.AppearsOn(quote, p.Text));
        if (page is null) return (null, "page");

        var kind = item.Text("kind").ToLowerInvariant() switch
        {
            "choice" => QuestionKind.Choice,
            "maths" or "math" => QuestionKind.Maths,
            _ => QuestionKind.Short,
        };

        List<string>? options = null;
        string? expression = null;

        if (kind == QuestionKind.Choice)
        {
            options = item.Strings("options").Select(Words.Squash).Distinct().ToList();
            if (options.Count is < 3 or > 5) return (null, "shape");
            var right = options.FirstOrDefault(o => Words.Flatten(o) == Words.Flatten(answer));
            if (right is null) return (null, "shape");
            answer = right;
        }
        else if (kind == QuestionKind.Maths)
        {
            expression = item.Text("answer_expression");
            if (!MathsEngine.Understands(expression)) return (null, "shape");
        }

        var scheme = item.Items("scheme")
            .Select(point => new SchemePoint(Words.Squash(point.Text("point")), Math.Clamp(point.Number("marks", 1), 1, 5)))
            .Where(point => point.Point.Length > 0).Take(8).ToList();
        if (kind == QuestionKind.Choice || scheme.Count == 0)
        {
            scheme = [new SchemePoint(kind == QuestionKind.Choice ? "Chooses the correct option." : Words.Short(answer, 200),
                Math.Clamp(item.Number("marks", 1), 1, kind == QuestionKind.Choice ? 1 : 4))];
        }
        var marks = scheme.Sum(point => point.Marks);
        if (marks is < 1 or > 20) return (null, "shape");

        return (new Draft(topic, kind, prompt, options, answer, expression, scheme, marks, page.Number,
            Words.Short(quote, 400), "ai"), "");
    }

    /// <summary>
    /// A maths question is kept only when a second, separate working reaches the
    /// same final answer, compared by calculation. This catches a model that set
    /// a sum and then got its own answer wrong.
    /// </summary>
    private async Task<List<Draft>> ConfirmMaths(List<Draft> candidates, Guid userId, CancellationToken stop)
    {
        var maths = candidates.Where(c => c.Kind == QuestionKind.Maths).ToList();
        if (maths.Count == 0) return candidates;

        var request = new StringBuilder("Solve each problem. Give only the final answer of each, as a number or expression.\n" +
                                        "Answer as JSON: {\"answers\": [{\"n\": 1, \"final\": \"...\"}]}\n\n");
        for (var i = 0; i < maths.Count; i++) request.AppendLine($"{i + 1}. {maths[i].Prompt}");

        var reply = await ai.AskAsync("confirm-maths", "You are a careful mathematician. You work each problem fully before answering.",
            request.ToString(), null, userId, stop);

        var agreed = new HashSet<Draft>();
        if (reply is not null)
        {
            foreach (var item in reply.Items("answers"))
            {
                var index = item.Number("n") - 1;
                if (index < 0 || index >= maths.Count) continue;
                if (MathsEngine.Compare(maths[index].AnswerExpression!, item.Text("final")) == MathsEngine.Outcome.Same)
                {
                    agreed.Add(maths[index]);
                }
            }
        }
        return candidates.Where(c => c.Kind != QuestionKind.Maths || agreed.Contains(c)).ToList();
    }

    internal static string Tidy(string topic)
    {
        var words = Words.Squash(topic).Trim('.', ':', '-', ' ').Split(' ', StringSplitOptions.RemoveEmptyEntries).Take(5).ToArray();
        if (words.Length == 0) return "";
        var joined = string.Join(' ', words);
        return char.ToUpperInvariant(joined[0]) + joined[1..];
    }

    public static string SchemeJson(List<SchemePoint> scheme) => JsonSerializer.Serialize(scheme, Web);

    public static List<SchemePoint> SchemeFrom(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<SchemePoint>>(json, Web) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    public static string? OptionsJson(List<string>? options) => options is null ? null : JsonSerializer.Serialize(options, Web);

    public static List<string> OptionsFrom(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json, Web) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}

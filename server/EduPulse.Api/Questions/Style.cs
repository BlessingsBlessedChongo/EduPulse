using System.Text.Json;
using System.Text.RegularExpressions;
using EduPulse.Api.Ai;
using EduPulse.Api.Reading;

namespace EduPulse.Api.Questions;

/// <summary>
/// How one lecturer or exam board sets questions, learned from the learner's
/// past papers. New practice questions are written to match it.
/// </summary>
public record Style
{
    /// <summary>The share of each kind of question, adding up to about 1.</summary>
    public double Choice { get; init; }
    public double Short { get; init; } = 1;
    public double Maths { get; init; }
    /// <summary>The instruction words this setter favours: "state", "explain", "derive".</summary>
    public List<string> CommandWords { get; init; } = [];
    /// <summary>Marks usually given to one question or part, most common first.</summary>
    public List<int> UsualMarks { get; init; } = [];
    /// <summary>How the paper is laid out, in a sentence or two.</summary>
    public string Layout { get; init; } = "";
    /// <summary>A few real questions, kept as models of the wording.</summary>
    public List<string> Examples { get; init; } = [];
    public int PapersRead { get; init; }

    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    public string ToJson() => JsonSerializer.Serialize(this, Web);

    public static Style? FromJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<Style>(json, Web);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}

public partial class StyleLearner(IAi ai)
{
    private static readonly string[] Commands =
    [
        "state", "define", "describe", "explain", "discuss", "outline", "list", "identify", "name", "give", "compare",
        "contrast", "distinguish", "calculate", "find", "determine", "solve", "evaluate", "simplify", "derive", "prove",
        "show that", "sketch", "draw", "differentiate", "integrate", "factorise", "expand", "justify", "suggest", "analyse",
        "illustrate", "mention", "write",
    ];

    private const string Instructions =
        "You study exam papers to learn how their setter writes questions. You report only what is on the paper. " +
        "You do not answer the questions.";

    /// <summary>
    /// Learns from a paper. The counting (marks, instruction words, question kinds)
    /// is done by rules and always works; a model adds the layout and picks model
    /// questions when one is available.
    /// </summary>
    public async Task<Style> LearnAsync(IReadOnlyList<ReadPage> paper, Style? before, Guid userId, CancellationToken stop)
    {
        var text = string.Join("\n\n", paper.Select(p => p.Text));
        var counted = ByRules(text);

        var layout = counted.Layout;
        var examples = counted.Examples;
        if (ai.Available)
        {
            var answer = await ai.AskAsync("learn-style", Instructions,
                "Here is an exam paper. Answer as JSON: {\"layout\": \"one or two sentences on how the paper is organised: sections, " +
                "number of questions, choice, marks\", \"examples\": [\"up to 5 questions copied word for word that best show the wording\"]}\n\n" +
                Words.Short(text, 14000), null, userId, stop);
            if (answer is not null)
            {
                if (answer.Text("layout").Length > 0) layout = Words.Short(answer.Text("layout"), 400);
                var chosen = answer.Strings("examples").Where(e => Words.AppearsOn(e, text)).Select(e => Words.Short(e, 320)).Take(5).ToList();
                if (chosen.Count > 0) examples = chosen;
            }
        }

        var learned = counted with { Layout = layout, Examples = examples, PapersRead = 1 };
        return before is null ? learned : Blend(before, learned);
    }

    /// <summary>Counts what can be counted without a model.</summary>
    internal static Style ByRules(string text)
    {
        var lower = text.ToLowerInvariant();

        var commands = Commands
            .Select(word => (word, count: Regex.Matches(lower, $@"\b{Regex.Escape(word)}\b").Count))
            .Where(pair => pair.count > 0).OrderByDescending(pair => pair.count).Take(8).Select(pair => pair.word).ToList();

        var marks = MarksPattern().Matches(lower)
            .Select(m => int.Parse(m.Groups[1].Success ? m.Groups[1].Value : m.Groups[2].Value))
            .Where(m => m is > 0 and <= 30)
            .GroupBy(m => m).OrderByDescending(g => g.Count()).ThenBy(g => g.Key).Take(4).Select(g => g.Key).ToList();

        var choiceQuestions = OptionA().Matches(text).Count;
        var mathsSignals = Regex.Matches(lower, @"\b(calculate|solve|evaluate|simplify|differentiate|integrate|factorise|find the value|derive|prove|show that)\b").Count
                           + Regex.Matches(text, @"[=^√∫]|\b\d+\s*[x-z]\b").Count / 4;
        var questions = Math.Max(1, QuestionStart().Matches(text).Count);
        var wordSignals = Regex.Matches(lower, @"\b(explain|describe|discuss|state|define|outline|compare|list|identify)\b").Count;

        double choice = choiceQuestions;
        double maths = mathsSignals;
        double words = Math.Max(wordSignals, Math.Max(0, questions - choiceQuestions - mathsSignals));
        var total = choice + maths + words;
        if (total <= 0) { words = 1; total = 1; }

        var examples = Words.Sentences(text)
            .Where(s => s.Length is > 40 and < 300 && Commands.Any(c => s.Contains(c, StringComparison.OrdinalIgnoreCase)))
            .Take(4).ToList();

        return new Style
        {
            Choice = Math.Round(choice / total, 2),
            Maths = Math.Round(maths / total, 2),
            Short = Math.Round(words / total, 2),
            CommandWords = commands,
            UsualMarks = marks,
            Layout = "",
            Examples = examples,
            PapersRead = 1,
        };
    }

    /// <summary>A second paper refines the picture instead of replacing it.</summary>
    internal static Style Blend(Style before, Style latest)
    {
        var weight = Math.Max(1, before.PapersRead);
        double Mix(double old, double fresh) => Math.Round((old * weight + fresh) / (weight + 1), 2);
        return new Style
        {
            Choice = Mix(before.Choice, latest.Choice),
            Short = Mix(before.Short, latest.Short),
            Maths = Mix(before.Maths, latest.Maths),
            CommandWords = before.CommandWords.Concat(latest.CommandWords).Distinct().Take(10).ToList(),
            UsualMarks = before.UsualMarks.Concat(latest.UsualMarks).Distinct().Take(5).ToList(),
            Layout = latest.Layout.Length > 0 ? latest.Layout : before.Layout,
            Examples = latest.Examples.Concat(before.Examples).Distinct().Take(6).ToList(),
            PapersRead = before.PapersRead + 1,
        };
    }

    [GeneratedRegex(@"[\[\(]\s*(\d{1,2})\s*(?:marks?)?\s*[\]\)]|\b(\d{1,2})\s*marks?\b")]
    private static partial Regex MarksPattern();

    [GeneratedRegex(@"(?m)^\s*\(?A[\.\)]\s+\S")]
    private static partial Regex OptionA();

    [GeneratedRegex(@"(?m)^\s*(?:question\s+)?\d{1,2}[\.\)]\s+\S", RegexOptions.IgnoreCase)]
    private static partial Regex QuestionStart();
}

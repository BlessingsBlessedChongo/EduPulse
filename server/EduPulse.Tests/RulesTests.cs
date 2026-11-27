using System.Text.Json.Nodes;
using EduPulse.Api;
using EduPulse.Api.Data;
using EduPulse.Api.Marking;
using EduPulse.Api.Questions;
using EduPulse.Api.Reading;
using EduPulse.Api.Study;

namespace EduPulse.Tests;

/// <summary>The parts that need no database and no model: the rules everything else leans on.</summary>
public class MathsEngineTests
{
    [Theory]
    [InlineData("3", "3")]
    [InlineData("3", "x = 3")]
    [InlineData("3", "6/2")]
    [InlineData("3", "3.0")]
    [InlineData("1/2", "0.5")]
    [InlineData("1/2", "\\frac{1}{2}")]
    [InlineData("3, 4", "x = 4 or x = 3")]
    [InlineData("3, 4", "x=3, x=4")]
    [InlineData("1/2, -2", "-2 and 0.5")]
    [InlineData("a^8", "a^8")]
    [InlineData("2*x + 2", "2(x + 1)")]
    [InlineData("15*x^2 - 4*x", "15x^2 - 4x")]
    [InlineData("15*x^2 - 4*x", "x(15x - 4)")]
    [InlineData("15*x^2 - 4*x", "dy/dx = 15x² − 4x")]
    [InlineData("64", "2^6")]
    [InlineData("12", "12 cm")]
    [InlineData("1500", "K1,500.00")]
    [InlineData("0.25", "25%")]
    [InlineData("sqrt(2)", "2^(1/2)")]
    [InlineData("-8", "−8")]
    [InlineData("0.25", "0.25 mol/dm^3")]
    [InlineData("2", "n = 2 mol")]
    [InlineData("6.02*10^23", "6.02 x 10^23 particles")]
    public void TheSameAnswerWrittenDifferentlyIsStillRight(string expected, string given) =>
        Assert.Equal(MathsEngine.Outcome.Same, MathsEngine.Compare(expected, given));

    [Theory]
    [InlineData("3", "4")]
    [InlineData("3, 4", "3")]
    [InlineData("3, 4", "3, 5")]
    [InlineData("1/2", "2")]
    [InlineData("15*x^2 - 4*x", "15x^2 + 4x")]
    [InlineData("15*x^2 - 4*x", "15x^2 - 4")]
    [InlineData("a^8", "a^15")]
    [InlineData("-8", "8")]
    [InlineData("7", "7.1")]
    public void ADifferentAnswerIsWrong(string expected, string given) =>
        Assert.Equal(MathsEngine.Outcome.Different, MathsEngine.Compare(expected, given));

    [Theory]
    [InlineData("3", "three")]
    [InlineData("3", "I am not sure")]
    [InlineData("3", "")]
    public void WhatCannotBeReadIsNotGuessed(string expected, string given) =>
        Assert.NotEqual(MathsEngine.Outcome.Same, MathsEngine.Compare(expected, given));
}

public class WordsTests
{
    private const string Page = "Mitochondria are the site of aerobic respiration, where most of the cell's ATP is produced.\n" +
                                "A mitochondrion has a double membrane; the inner membrane is folded into cristae.";

    [Fact]
    public void AQuoteThatIsOnThePageIsFoundDespiteSpacingAndPunctuation() =>
        Assert.True(Words.AppearsOn("mitochondria are the site of   aerobic respiration where most of the cells ATP is produced", Page));

    [Fact]
    public void AQuoteWithOneMisreadWordIsStillFound() =>
        Assert.True(Words.AppearsOn("A mitochondrion has a double membrane; the inner membrane is folded in cristae", Page));

    [Fact]
    public void AQuoteThatIsNotOnThePageIsRefused() =>
        Assert.False(Words.AppearsOn("Chloroplasts are the site of photosynthesis and contain chlorophyll", Page));

    [Fact]
    public void AFewWordsAreNotEnoughToCountAsAQuote() => Assert.False(Words.AppearsOn("the site", Page));
}

public class QuestionCheckTests
{
    private static readonly List<ReadPage> Pages = [new(1, "The nucleus contains the cell's DNA and controls the activities of the cell. Inside the nucleus, the nucleolus makes ribosomes.")];

    private static JsonNode Proposed(string kind = "short", string quote = "Inside the nucleus, the nucleolus makes ribosomes.",
        string answer = "It makes ribosomes.", string[]? options = null, string expression = "") => Http.Node(new
    {
        topic = "nucleus", kind, prompt = "State the function of the nucleolus.", options = options ?? [], answer,
        answer_expression = expression, scheme = new[] { new { point = "It makes ribosomes.", marks = 1 } }, marks = 1, page = 1, quote,
    });

    [Fact]
    public void AQuestionRestingOnThePageIsKept()
    {
        var (draft, _) = QuestionMaker.Check(Proposed(), Pages);
        Assert.NotNull(draft);
        Assert.Equal("Nucleus", draft.Topic);
        Assert.Equal(1, draft.Page);
    }

    [Fact]
    public void AQuestionWhoseSourceIsNotOnThePageIsRefused()
    {
        var (draft, reason) = QuestionMaker.Check(Proposed(quote: "Lysosomes contain digestive enzymes that break down worn-out organelles."), Pages);
        Assert.Null(draft);
        Assert.Equal("page", reason);
    }

    [Fact]
    public void AMultipleChoiceQuestionMustHaveItsAnswerAmongTheOptions()
    {
        var bad = QuestionMaker.Check(Proposed("choice", answer: "Ribosomes", options: ["Lipids", "DNA", "Starch", "Water"]), Pages);
        var good = QuestionMaker.Check(Proposed("choice", answer: "ribosomes", options: ["Lipids", "Ribosomes", "Starch", "Water"]), Pages);
        Assert.Null(bad.Draft);
        Assert.Equal("Ribosomes", good.Draft!.Answer);
    }

    [Fact]
    public void AMathsQuestionMustHaveAnAnswerTheEngineCanRead()
    {
        Assert.Null(QuestionMaker.Check(Proposed("maths", expression: "about three"), Pages).Draft);
        Assert.NotNull(QuestionMaker.Check(Proposed("maths", expression: "3"), Pages).Draft);
    }

    [Fact]
    public void WithNoModelFillInQuestionsComeStraightFromThePage()
    {
        var drafts = RuleQuestions.Make(Pages, "Cell notes").ToList();
        Assert.NotEmpty(drafts);
        Assert.All(drafts, draft =>
        {
            Assert.Equal(QuestionKind.Blank, draft.Kind);
            Assert.Contains("_____", draft.Prompt);
            Assert.True(Words.AppearsOn(draft.Quote, Pages[0].Text));
            Assert.Contains(draft.Answer, draft.Quote);
        });
    }
}

public class StyleTests
{
    private const string Paper = "SECTION A\n1. Which organelle makes proteins?\n   A. Lysosome\n   B. Ribosome\n" +
                                 "2. State two differences between plant and animal cells. [2]\n3. Define the term osmosis. [2]\n" +
                                 "SECTION B\n4. (a) Describe the structure of a mitochondrion. [4]\n   (b) Explain why muscle cells contain many mitochondria. [4]\n" +
                                 "5. Calculate the magnification of the image. [3]";

    [Fact]
    public void APastPaperTeachesItsMarksAndInstructionWords()
    {
        var style = StyleLearner.ByRules(Paper);
        Assert.Contains("state", style.CommandWords);
        Assert.Contains("describe", style.CommandWords);
        Assert.Contains(2, style.UsualMarks);
        Assert.Contains(4, style.UsualMarks);
        Assert.True(style.Choice > 0);
        Assert.True(style.Short > style.Choice);
        Assert.InRange(style.Choice + style.Short + style.Maths, 0.98, 1.02);
    }

    [Fact]
    public void ASecondPaperRefinesTheStyleInsteadOfReplacingIt()
    {
        var first = StyleLearner.ByRules(Paper);
        var second = StyleLearner.ByRules("1. Solve x^2 - 5x + 6 = 0. [3]\n2. Differentiate y = 3x^2. [2]\n3. Evaluate 2^5. [1]");
        var blended = StyleLearner.Blend(first, second);
        Assert.Equal(2, blended.PapersRead);
        Assert.Contains("state", blended.CommandWords);
        Assert.Contains("solve", blended.CommandWords);
        Assert.True(blended.Maths > first.Maths);
    }
}

public class SchedulerTests
{
    private static readonly DateOnly Monday = new(2026, 11, 30);

    private static Review Fresh() => new() { DueOn = Monday, LastSeenOn = Monday };

    [Fact]
    public void RightAnswersComeBackLessAndLessOften()
    {
        var review = Fresh();
        var gaps = new List<int>();
        var day = Monday;
        for (var i = 0; i < 5; i++)
        {
            Scheduler.Apply(review, 1.0, day);
            gaps.Add(review.IntervalDays);
            day = review.DueOn;
        }
        Assert.Equal([1, 3, 7, 15, 33], gaps);
    }

    [Fact]
    public void AWrongAnswerComesBackTomorrowAndIsCounted()
    {
        var review = Fresh();
        Scheduler.Apply(review, 1.0, Monday);
        Scheduler.Apply(review, 1.0, Monday.AddDays(1));
        Scheduler.Apply(review, 0.0, Monday.AddDays(4));
        Assert.Equal(Monday.AddDays(5), review.DueOn);
        Assert.Equal(0, review.Streak);
        Assert.Equal(1, review.Lapses);
    }

    [Fact]
    public void TheGapNeverGrowsPastTwoMonths()
    {
        var review = Fresh();
        for (var i = 0; i < 12; i++) Scheduler.Apply(review, 1.0, Monday);
        Assert.Equal(Scheduler.LongestGap, review.IntervalDays);
    }

    [Fact]
    public void StrengthFadesWhenAQuestionIsLeftTooLong()
    {
        var review = Fresh();
        Scheduler.Apply(review, 1.0, Monday);
        Assert.Equal(1.0, Scheduler.Strength(review, Monday), 3);
        Assert.True(Scheduler.Strength(review, Monday.AddDays(2)) < 0.6);
        Assert.True(Scheduler.Strength(review, Monday.AddDays(10)) < 0.1);
    }
}

public class SettingsTests
{
    [Fact]
    public void ADatabaseAddressInWebFormIsUnderstood()
    {
        var text = Settings.ConnectionString(" postgresql://owner:p%40ss@ep-cool-name.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require\n");
        Assert.Contains("Host=ep-cool-name.eu-central-1.aws.neon.tech", text);
        Assert.Contains("Database=neondb", text);
        Assert.Contains("Username=owner", text);
        Assert.Contains("Password=p@ss", text);
        Assert.Contains("SSL Mode=Require", text);
    }

    [Fact]
    public void ADatabaseAddressInKeyValueFormIsLeftAlone() =>
        Assert.Equal("Host=localhost;Database=x", Settings.ConnectionString("Host=localhost;Database=x"));
}

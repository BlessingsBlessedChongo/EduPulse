using System.Text;
using System.Text.Json;
using EduPulse.Api.Ai;
using EduPulse.Api.Data;
using EduPulse.Api.Questions;
using EduPulse.Api.Reading;

namespace EduPulse.Api.Marking;

/// <summary>One line of the marking scheme and what the learner earned on it.</summary>
public record Award(string Point, int Marks, int Earned, string Note);

/// <summary>
/// What happened when a learner challenged a mark: what they said, whether the
/// mark changed, and the marker's answer to them.
/// </summary>
public record SecondLook(string Reason, string Decision, string Reply, int Before);

/// <summary>The result of marking one answer, with the reasoning shown.</summary>
public record Verdict
{
    public int Score { get; init; }
    public int Max { get; init; }
    /// <summary>What decided the marks: "exact", "engine", "ai" or "rules".</summary>
    public string MarkedBy { get; init; } = "";
    public List<Award> Awards { get; init; } = [];
    public string Summary { get; init; } = "";
    /// <summary>For maths: whether the final answer was right, as calculated. Null when it could not be calculated.</summary>
    public bool? FinalAnswerRight { get; init; }
    /// <summary>For a photo: the working as it was read, line by line.</summary>
    public List<string> Read { get; init; } = [];
    /// <summary>Lines the reader was not sure of. The learner is asked to check these.</summary>
    public List<string> Unsure { get; init; } = [];
    /// <summary>Set once the learner has challenged the mark and it has been looked at again.</summary>
    public SecondLook? Review { get; init; }

    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    public string ToJson() => JsonSerializer.Serialize(this, Web);

    public static Verdict FromJson(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<Verdict>(json, Web) ?? new Verdict();
        }
        catch (JsonException)
        {
            return new Verdict();
        }
    }
}

/// <summary>
/// Marks an answer, using the most trustworthy method that fits:
///
///   multiple choice and fill-in      exact comparison
///   a maths final answer             calculation (<see cref="MathsEngine"/>)
///   written answers and working      a model, held to the marking scheme
///   written answers, no model        word overlap with the scheme
///
/// A model is never the judge of whether a maths answer is right. It reads
/// handwriting and awards method marks; the engine decides the final answer.
/// </summary>
public class Marker(IAi ai)
{
    private const string Instructions =
        "You are a fair exam marker. You mark strictly against the marking scheme given: one decision per scheme point. " +
        "You award a point only when the student's answer clearly shows it, in any wording. You never award marks for " +
        "material that is not in the answer. You do not decide whether a maths final answer is correct; you only judge the method steps.";

    public async Task<Verdict> MarkAsync(Question question, string response, Attachment? photo, Guid userId, CancellationToken stop)
    {
        var scheme = QuestionMaker.SchemeFrom(question.SchemeJson);
        if (scheme.Count == 0) scheme = [new SchemePoint(question.Answer, Math.Max(1, question.Marks))];

        return question.Kind switch
        {
            QuestionKind.Choice => Exact(question, scheme, Words.Flatten(response) == Words.Flatten(question.Answer)),
            QuestionKind.Blank => Exact(question, scheme, SameWord(response, question.Answer)),
            QuestionKind.Maths => await Maths(question, scheme, response, photo, userId, stop),
            _ => await Written(question, scheme, response, photo, userId, stop),
        };
    }

    private static Verdict Exact(Question question, List<SchemePoint> scheme, bool right) => new()
    {
        Score = right ? question.Marks : 0,
        Max = question.Marks,
        MarkedBy = "exact",
        Awards = scheme.Select(p => new Award(p.Point, p.Marks, right ? p.Marks : 0, "")).ToList(),
        Summary = right ? "Correct." : $"Not quite. The answer is: {question.Answer}",
    };

    private static bool SameWord(string response, string answer)
    {
        var given = Words.Flatten(response).Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(Words.Stem).ToList();
        var wanted = Words.Flatten(answer).Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(Words.Stem).ToList();
        return wanted.Count > 0 && given.SequenceEqual(wanted);
    }

    private async Task<Verdict> Maths(Question question, List<SchemePoint> scheme, string response, Attachment? photo,
        Guid userId, CancellationToken stop)
    {
        var expected = question.AnswerExpression ?? question.Answer;
        var typedOnlyAnAnswer = photo is null && !response.Contains('\n') && response.Length < 60;

        // A lone final answer needs no model at all.
        if (typedOnlyAnAnswer)
        {
            var outcome = MathsEngine.Compare(expected, response);
            if (outcome != MathsEngine.Outcome.CannotTell)
            {
                var right = outcome == MathsEngine.Outcome.Same;
                return new Verdict
                {
                    Score = right ? question.Marks : 0,
                    Max = question.Marks,
                    MarkedBy = "engine",
                    FinalAnswerRight = right,
                    Awards = scheme.Select(p => new Award(p.Point, p.Marks, right ? p.Marks : 0, "")).ToList(),
                    Summary = right
                        ? "Correct. Your final answer matches, checked by calculation."
                        : $"Your final answer does not match. The answer is {question.Answer}. Show your working next time to earn method marks.",
                };
            }
        }

        // Working was shown (typed or photographed): a model reads it and judges the method.
        var judged = await Judge(question, scheme, response, photo, userId, stop);
        if (judged is null)
        {
            var outcome = photo is null ? MathsEngine.Compare(expected, LastLine(response)) : MathsEngine.Outcome.CannotTell;
            if (outcome == MathsEngine.Outcome.CannotTell)
            {
                return CouldNotMark(question, scheme, photo is not null
                    ? "The photo could not be read just now. Type your final answer, or try the photo again in a few minutes."
                    : "This could not be marked automatically. Compare your working with the scheme below and mark yourself.");
            }
            var right = outcome == MathsEngine.Outcome.Same;
            return new Verdict
            {
                Score = right ? question.Marks : 0, Max = question.Marks, MarkedBy = "engine", FinalAnswerRight = right,
                Awards = scheme.Select(p => new Award(p.Point, p.Marks, right ? p.Marks : 0, "")).ToList(),
                Summary = right ? "Your final answer matches, checked by calculation." : $"Your final answer does not match. The answer is {question.Answer}.",
            };
        }

        var final = judged.Final.Length > 0 ? judged.Final : LastLine(photo is null ? response : string.Join('\n', judged.Read));
        var check = MathsEngine.Compare(expected, final);
        var awards = judged.Awards;
        var score = awards.Sum(a => a.Earned);
        string summary;
        bool? finalRight = check switch { MathsEngine.Outcome.Same => true, MathsEngine.Outcome.Different => false, _ => null };

        if (finalRight == true)
        {
            // The calculation agrees with the answer, so the working is given full credit.
            awards = awards.Select(a => a with { Earned = a.Marks }).ToList();
            score = question.Marks;
            summary = "Correct. Your final answer matches, checked by calculation.";
        }
        else if (finalRight == false)
        {
            // A wrong final answer cannot earn full marks, whatever the model thought of the steps.
            if (score >= question.Marks && awards.Count > 0)
            {
                var last = awards[^1];
                awards[^1] = last with { Earned = Math.Max(0, last.Earned - 1), Note = "The final answer does not match." };
                score = awards.Sum(a => a.Earned);
            }
            summary = $"Your final answer ({Words.Short(final, 40)}) does not match {question.Answer}. " +
                      (score > 0 ? $"You earned {score} of {question.Marks} for your method." : "No method marks could be given.");
        }
        else
        {
            summary = judged.Summary.Length > 0 ? judged.Summary : "Your final answer could not be checked by calculation, so the marks are for your method only.";
        }

        return new Verdict
        {
            Score = Math.Clamp(score, 0, question.Marks), Max = question.Marks, MarkedBy = "ai", Awards = awards,
            Summary = summary, FinalAnswerRight = finalRight, Read = judged.Read, Unsure = judged.Unsure,
        };
    }

    private async Task<Verdict> Written(Question question, List<SchemePoint> scheme, string response, Attachment? photo,
        Guid userId, CancellationToken stop)
    {
        var judged = await Judge(question, scheme, response, photo, userId, stop);
        if (judged is not null)
        {
            var score = Math.Clamp(judged.Awards.Sum(a => a.Earned), 0, question.Marks);
            return new Verdict
            {
                Score = score, Max = question.Marks, MarkedBy = "ai", Awards = judged.Awards, Read = judged.Read, Unsure = judged.Unsure,
                Summary = judged.Summary.Length > 0 ? judged.Summary : Outcome(score, question.Marks),
            };
        }

        if (photo is not null)
        {
            return CouldNotMark(question, scheme, "The photo could not be read just now. Type your answer, or try the photo again in a few minutes.");
        }

        // No model: award a point when most of its meaningful words are in the answer.
        var said = new HashSet<string>(Words.Meaningful(response));
        var awards = scheme.Select(point =>
        {
            var needed = Words.Meaningful(point.Point).Distinct().ToList();
            var hit = needed.Count == 0 ? 0 : needed.Count(said.Contains) / (double)needed.Count;
            return new Award(point.Point, point.Marks, hit >= 0.6 ? point.Marks : 0, "");
        }).ToList();
        var total = Math.Clamp(awards.Sum(a => a.Earned), 0, question.Marks);
        return new Verdict
        {
            Score = total, Max = question.Marks, MarkedBy = "rules", Awards = awards,
            Summary = Outcome(total, question.Marks) + " Marked by matching your words to the scheme, so check it against the scheme below.",
        };
    }

    private static string Outcome(int score, int max) =>
        score == max ? "Full marks." : score == 0 ? "No marks this time." : $"{score} of {max}.";

    private static Verdict CouldNotMark(Question question, List<SchemePoint> scheme, string why) => new()
    {
        Score = 0, Max = question.Marks, MarkedBy = "none", Summary = why,
        Awards = scheme.Select(p => new Award(p.Point, p.Marks, 0, "")).ToList(),
    };

    private static string LastLine(string text) =>
        text.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).LastOrDefault() ?? "";

    private const string ReviewInstructions =
        "You are a senior examiner reviewing a student's challenge to a mark. You are fair and you are firm. " +
        "You look again at the student's ORIGINAL answer against the marking scheme, point by point. " +
        "The student's challenge may point you to something the first marker missed, and if they are right you change the mark. " +
        "But a claim is not evidence: marks are only for what is actually written in the answer. You never award a point because the " +
        "student says they knew it, meant it, or deserve it. If a new photo shows different working from the answer first marked, " +
        "that is a new answer, not a correction, and the mark stands. You explain your decision to the student plainly and kindly, " +
        "naming the scheme point and the words in their answer that settle it.";

    /// <summary>
    /// Looks again at a mark the learner has challenged. Returns null when the
    /// review cannot be done right now (it needs a model, and none answered).
    ///
    /// The learner cannot set their own mark. Answers with one exact answer, and
    /// maths final answers, are settled by comparison and calculation, so the
    /// review explains the result. Everything else goes back to a model acting
    /// as a second examiner, who may raise the mark or let it stand, and must
    /// say why. A review never lowers a mark, and a maths answer whose final
    /// answer is wrong still cannot reach full marks.
    /// </summary>
    public async Task<Verdict?> ReviewAsync(Question question, string response, Verdict first, string reason, Attachment? photo,
        Guid userId, CancellationToken stop)
    {
        var scheme = QuestionMaker.SchemeFrom(question.SchemeJson);
        if (scheme.Count == 0) scheme = [new SchemePoint(question.Answer, Math.Max(1, question.Marks))];

        if (question.Kind is QuestionKind.Choice or QuestionKind.Blank)
        {
            return first with
            {
                Review = new SecondLook(reason, "upheld",
                    $"This question has one exact answer: \"{question.Answer}\". Your answer was \"{Words.Short(response, 80)}\", so the mark stands.", first.Score),
            };
        }

        var expected = question.AnswerExpression ?? question.Answer;
        if (question.Kind == QuestionKind.Maths && first.MarkedBy == "engine" && photo is null)
        {
            return first with
            {
                Review = new SecondLook(reason, "upheld",
                    $"Your final answer \"{Words.Short(response, 60)}\" was compared with {question.Answer} by calculation, and they are not equal, so the mark stands. " +
                    "A calculation cannot be argued with, but if you slipped while typing, answer it again when it comes back, and show your working to earn method marks.",
                    first.Score),
            };
        }

        if (!ai.Available || (photo is not null && !ai.CanSee)) return null;

        var request = new StringBuilder();
        request.AppendLine($"QUESTION ({question.Marks} marks): {question.Prompt}");
        request.AppendLine();
        request.AppendLine("MARKING SCHEME, with the marks the first marker gave:");
        for (var i = 0; i < scheme.Count; i++)
        {
            var given = i < first.Awards.Count ? first.Awards[i].Earned : 0;
            request.AppendLine($"{i + 1}. [{scheme[i].Marks}] {scheme[i].Point}  (first marker gave {given})");
        }
        request.AppendLine();
        request.AppendLine("THE STUDENT'S ORIGINAL ANSWER:");
        request.AppendLine(first.Read.Count > 0 ? string.Join('\n', first.Read) + "\n(read from a photo of their handwriting)" : Words.Short(response, 4000));
        request.AppendLine();
        request.AppendLine("THE STUDENT'S CHALLENGE:");
        request.AppendLine(Words.Short(reason, 800));
        request.AppendLine();
        if (photo is not null)
        {
            request.AppendLine("The student has attached a photo of their working. Copy it line by line exactly as written. Decide whether it is the SAME working " +
                               "as the original answer above, only read more accurately, or DIFFERENT working.");
            request.AppendLine();
        }
        request.AppendLine("Answer as JSON:");
        request.AppendLine("{");
        if (photo is not null)
        {
            request.AppendLine("  \"read\": [\"each line of the photo, as written\"],");
            request.AppendLine("  \"same_working\": true,");
        }
        if (question.Kind == QuestionKind.Maths) request.AppendLine("  \"final_answer\": \"the student's final answer alone, as written\",");
        request.AppendLine("  \"awards\": [{\"n\": 1, \"earned\": 0, \"note\": \"one short sentence on this point\"}],");
        request.AppendLine("  \"decision\": \"changed\" | \"upheld\",");
        request.AppendLine("  \"reply\": \"two or three sentences to the student explaining the decision\"");
        request.AppendLine("}");
        request.AppendLine("Give one award for every scheme point. \"earned\" is between 0 and that point's marks.");

        var answer = await ai.AskAsync(photo is null ? "review-answer" : "review-photo", ReviewInstructions, request.ToString(), photo, userId, stop);
        if (answer is null) return null;
        var decided = answer.Items("awards").ToDictionary(a => a.Number("n"), a => a, EqualityComparer<int>.Default);
        if (decided.Count == 0) return null;

        var reply = Words.Short(answer.Text("reply"), 600);
        var read = answer.Strings("read").Select(line => Words.Short(line, 200)).Take(40).ToList();

        // A photo of different working is a new answer, not a correction.
        if (photo is not null && !answer.Flag("same_working"))
        {
            return first with
            {
                Review = new SecondLook(reason, "upheld", reply.Length > 0 ? reply
                    : "The photo shows different working from the answer that was marked, so the mark stands. This question will come back for another try.", first.Score),
            };
        }

        var awards = scheme.Select((point, index) =>
        {
            decided.TryGetValue(index + 1, out var award);
            var before = index < first.Awards.Count ? first.Awards[index].Earned : 0;
            // A review can find marks that were missed; it does not take away marks already given.
            var earned = Math.Max(before, Math.Clamp(award.Number("earned"), 0, point.Marks));
            var note = Words.Short(award.Text("note"), 240);
            return new Award(point.Point, point.Marks, earned, note.Length > 0 ? note : index < first.Awards.Count ? first.Awards[index].Note : "");
        }).ToList();

        bool? finalRight = first.FinalAnswerRight;
        if (question.Kind == QuestionKind.Maths)
        {
            var final = answer.Text("final_answer");
            if (final.Length == 0) final = LastLine(read.Count > 0 ? string.Join('\n', read) : first.Read.Count > 0 ? string.Join('\n', first.Read) : response);
            finalRight = MathsEngine.Compare(expected, final) switch
            {
                MathsEngine.Outcome.Same => true,
                MathsEngine.Outcome.Different => false,
                _ => first.FinalAnswerRight,
            };
            if (finalRight == true)
            {
                awards = awards.Select(a => a with { Earned = a.Marks }).ToList();
            }
            else if (finalRight == false && awards.Sum(a => a.Earned) >= question.Marks && awards.Count > 0)
            {
                // Whatever the reviewer thought of the steps, a wrong final answer cannot earn full marks.
                var last = awards[^1];
                awards[^1] = last with { Earned = Math.Max(0, last.Earned - 1), Note = "The final answer does not match, checked by calculation." };
            }
        }

        var score = Math.Clamp(awards.Sum(a => a.Earned), 0, question.Marks);
        var changed = score > first.Score;
        if (!changed)
        {
            return first with
            {
                Review = new SecondLook(reason, "upheld", reply.Length > 0 && answer.Text("decision") != "changed" ? reply
                    : "Your answer was looked at again against each point of the scheme, and the mark stands.", first.Score),
            };
        }

        return first with
        {
            Score = score,
            Awards = awards,
            FinalAnswerRight = finalRight,
            Read = read.Count > 0 ? read : first.Read,
            Unsure = read.Count > 0 ? [] : first.Unsure,
            Summary = finalRight == true ? "Correct. Your final answer matches, checked by calculation." : first.Summary,
            Review = new SecondLook(reason, "changed", reply.Length > 0 ? reply : $"You were right. Your mark is now {score} of {question.Marks}.", first.Score),
        };
    }

    private record Judged(List<Award> Awards, string Summary, List<string> Read, List<string> Unsure, string Final);

    /// <summary>Asks a model to read the answer (from a photo if there is one) and decide each scheme point.</summary>
    private async Task<Judged?> Judge(Question question, List<SchemePoint> scheme, string response, Attachment? photo,
        Guid userId, CancellationToken stop)
    {
        if (!ai.Available || (photo is not null && !ai.CanSee)) return null;

        var request = new StringBuilder();
        request.AppendLine($"QUESTION ({question.Marks} marks): {question.Prompt}");
        request.AppendLine();
        request.AppendLine("MARKING SCHEME:");
        for (var i = 0; i < scheme.Count; i++) request.AppendLine($"{i + 1}. [{scheme[i].Marks}] {scheme[i].Point}");
        request.AppendLine();
        if (photo is null)
        {
            request.AppendLine("STUDENT'S ANSWER:");
            request.AppendLine(Words.Short(response, 4000));
        }
        else
        {
            request.AppendLine("The student's answer is in the photo. First copy it line by line exactly as written, mistakes included.");
            if (response.Trim().Length > 0) request.AppendLine($"The student also typed: {Words.Short(response, 500)}");
        }
        request.AppendLine();
        request.AppendLine("Answer as JSON:");
        request.AppendLine("{");
        if (photo is not null)
        {
            request.AppendLine("  \"read\": [\"each line of the student's working, as written\"],");
            request.AppendLine("  \"unsure\": [\"any line you could not read with confidence\"],");
        }
        if (question.Kind == QuestionKind.Maths) request.AppendLine("  \"final_answer\": \"the student's final answer alone, as written\",");
        request.AppendLine("  \"awards\": [{\"n\": 1, \"earned\": 0, \"note\": \"one short sentence to the student on this point\"}],");
        request.AppendLine("  \"summary\": \"one or two sentences to the student: what was right and the first thing that went wrong\"");
        request.AppendLine("}");
        request.AppendLine("Give one award for every scheme point. \"earned\" is between 0 and that point's marks.");

        var answer = await ai.AskAsync(photo is null ? "mark-answer" : "mark-photo", Instructions, request.ToString(), photo, userId, stop);
        if (answer is null) return null;

        var decided = answer.Items("awards").ToDictionary(a => a.Number("n"), a => a, EqualityComparer<int>.Default);
        if (decided.Count == 0) return null;

        var awards = scheme.Select((point, index) =>
        {
            decided.TryGetValue(index + 1, out var award);
            return new Award(point.Point, point.Marks, Math.Clamp(award.Number("earned"), 0, point.Marks), Words.Short(award.Text("note"), 240));
        }).ToList();

        return new Judged(awards, Words.Short(answer.Text("summary"), 400),
            answer.Strings("read").Select(line => Words.Short(line, 200)).Take(40).ToList(),
            answer.Strings("unsure").Select(line => Words.Short(line, 200)).Take(10).ToList(),
            answer.Text("final_answer"));
    }
}

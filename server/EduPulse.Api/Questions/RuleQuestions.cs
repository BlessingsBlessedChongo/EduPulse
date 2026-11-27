using System.Text.RegularExpressions;
using EduPulse.Api.Data;
using EduPulse.Api.Reading;

namespace EduPulse.Api.Questions;

/// <summary>
/// Questions made with no model at all: a sentence from the notes with its key
/// word left out. Plain, but always available, always from the learner's own
/// page, and enough to keep daily practice going when the models are unreachable.
/// </summary>
public static partial class RuleQuestions
{
    public static IEnumerable<Draft> Make(IReadOnlyList<ReadPage> pages, string documentTitle)
    {
        var topic = QuestionMaker.Tidy(documentTitle.Length > 0 ? documentTitle : "Notes");
        var used = new HashSet<string>();

        foreach (var page in pages)
        {
            var onThisPage = 0;
            foreach (var sentence in Words.Sentences(page.Text))
            {
                if (onThisPage >= 4) break;
                if (sentence.Length is < 50 or > 240) continue;
                if (!Defining().IsMatch(sentence)) continue;

                var word = KeyWord(sentence);
                if (word is null || !used.Add(word.ToLowerInvariant())) continue;

                var blanked = Regex.Replace(sentence, $@"\b{Regex.Escape(word)}\b", "_____", RegexOptions.None, TimeSpan.FromSeconds(1));
                if (!blanked.Contains("_____")) continue;

                onThisPage++;
                yield return new Draft(topic, QuestionKind.Blank, $"Fill in the missing word: {blanked}", null, word, null,
                    [new SchemePoint($"The missing word is \"{word}\".", 1)], 1, page.Number, sentence, "rules");
            }
        }
    }

    /// <summary>The word worth testing: the longest meaningful word that is not the sentence's first.</summary>
    private static string? KeyWord(string sentence)
    {
        var words = WordPattern().Matches(sentence).Select(m => m.Value).Skip(1).ToList();
        var meaningful = new HashSet<string>(Words.Meaningful(sentence));
        return words
            .Where(w => w.Length >= 6 && meaningful.Contains(Words.Stem(w.ToLowerInvariant())))
            .OrderByDescending(w => char.IsUpper(w[0]) ? w.Length + 3 : w.Length)
            .FirstOrDefault();
    }

    // Sentences that state a fact or a definition make fair questions; asides and headings do not.
    [GeneratedRegex(@"\b(is|are|was|were|means|refers to|consists of|contains|occurs|produces|converts|called|known as|defined as|equals)\b", RegexOptions.IgnoreCase)]
    private static partial Regex Defining();

    [GeneratedRegex(@"[A-Za-z][A-Za-z\-]+")]
    private static partial Regex WordPattern();
}

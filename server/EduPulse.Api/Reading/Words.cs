using System.Text;
using System.Text.RegularExpressions;

namespace EduPulse.Api.Reading;

/// <summary>Plain-text helpers shared by reading, question making and marking.</summary>
public static partial class Words
{
    private static readonly HashSet<string> Small = new(StringComparer.OrdinalIgnoreCase)
    {
        "the", "a", "an", "and", "or", "of", "to", "in", "on", "at", "for", "by", "with", "from", "as", "is", "are", "was",
        "were", "be", "been", "it", "its", "this", "that", "these", "those", "which", "who", "whom", "what", "when", "where",
        "why", "how", "not", "no", "but", "if", "then", "than", "so", "such", "can", "may", "will", "would", "should", "could",
        "has", "have", "had", "do", "does", "did", "into", "over", "under", "between", "about", "also", "more", "most", "each",
        "other", "their", "there", "they", "them", "we", "you", "your", "our", "his", "her", "he", "she", "one", "two", "all",
        "any", "some", "called", "known", "used", "using", "very", "many", "much", "only", "both",
    };

    /// <summary>Lower case, letters and digits only, single spaces. Two texts that read the same compare equal.</summary>
    public static string Flatten(string text)
    {
        var builder = new StringBuilder(text.Length);
        var space = true;
        foreach (var character in text.Normalize(NormalizationForm.FormKC))
        {
            if (char.IsLetterOrDigit(character))
            {
                builder.Append(char.ToLowerInvariant(character));
                space = false;
            }
            else if (!space)
            {
                builder.Append(' ');
                space = true;
            }
        }
        return builder.ToString().Trim();
    }

    /// <summary>The words that carry meaning: no "the", "of" and the like, nothing under three letters.</summary>
    public static List<string> Meaningful(string text) =>
        Flatten(text).Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(word => word.Length >= 3 && !Small.Contains(word))
            .Select(Stem).ToList();

    /// <summary>A light stem so "cells" matches "cell" and "oxidised" matches "oxidise".</summary>
    public static string Stem(string word)
    {
        if (word.Length > 5 && word.EndsWith("ing")) return word[..^3];
        if (word.Length > 4 && word.EndsWith("ies")) return word[..^3] + "y";
        if (word.Length > 4 && word.EndsWith("ed")) return word[..^2];
        if (word.Length > 4 && word.EndsWith("es")) return word[..^2];
        if (word.Length > 3 && word.EndsWith('s') && !word.EndsWith("ss")) return word[..^1];
        return word;
    }

    /// <summary>
    /// True when the quote really is on the page. Reading a photo or PDF changes
    /// spacing and punctuation, so the test is on the words: nearly all of the
    /// quote's words must appear on the page, close together and in order.
    /// </summary>
    public static bool AppearsOn(string quote, string page)
    {
        var needle = Flatten(quote);
        var hay = Flatten(page);
        if (needle.Length < 12) return false;
        if (hay.Contains(needle, StringComparison.Ordinal)) return true;

        var wanted = needle.Split(' ');
        var words = hay.Split(' ');
        if (wanted.Length < 4 || words.Length < wanted.Length) return false;

        // Slide a window a little longer than the quote and count words matched in order.
        var window = wanted.Length + Math.Max(3, wanted.Length / 4);
        for (var start = 0; start + Math.Min(window, words.Length) <= words.Length; start++)
        {
            var end = Math.Min(words.Length, start + window);
            var matched = 0;
            var from = start;
            foreach (var word in wanted)
            {
                for (var i = from; i < end; i++)
                {
                    if (words[i] == word)
                    {
                        matched++;
                        from = i + 1;
                        break;
                    }
                }
            }
            if (matched >= wanted.Length * 0.9) return true;
            if (end == words.Length) break;
        }
        return false;
    }

    public static List<string> Sentences(string text) =>
        SentenceEnd().Split(Spaces().Replace(text, " ")).Select(s => s.Trim()).Where(s => s.Length > 0).ToList();

    public static string Squash(string text) => Spaces().Replace(text, " ").Trim();

    public static string Short(string text, int length) =>
        text.Length <= length ? text : text[..length].TrimEnd() + "...";

    [GeneratedRegex(@"(?<=[.!?])\s+(?=[A-Z0-9(])")]
    private static partial Regex SentenceEnd();

    [GeneratedRegex(@"\s+")]
    private static partial Regex Spaces();
}

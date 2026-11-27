using System.Text;
using EduPulse.Api.Ai;
using UglyToad.PdfPig;

namespace EduPulse.Api.Reading;

public record ReadPage(int Number, string Text);

public record ReadResult(List<ReadPage> Pages, string? Problem)
{
    public static ReadResult Failed(string problem) => new([], problem);
}

/// <summary>
/// Takes the words out of what a learner uploads, page by page.
///
/// A PDF with real text is read here, with no model involved. A scanned PDF or
/// a photo of handwriting has no text to take, so a model that can see reads it.
/// </summary>
public class DocumentReader(IAi ai)
{
    public const int MaxPages = 30;
    public const int MaxBytes = 10 * 1024 * 1024;

    private const string Instructions =
        "You copy study material into text exactly as written. You never summarise, correct, explain or add anything. " +
        "Maths is written in plain text, for example x^2 + 3x - 4 = 0 and sqrt(16). Unreadable words become [unreadable].";

    public async Task<ReadResult> ReadAsync(byte[] upload, string mediaType, Guid userId, CancellationToken stop)
    {
        if (upload.Length == 0) return ReadResult.Failed("The file was empty.");
        if (upload.Length > MaxBytes) return ReadResult.Failed("The file is larger than 10 MB. Try fewer pages.");

        if (mediaType.StartsWith("text/", StringComparison.OrdinalIgnoreCase))
        {
            return FromText(Encoding.UTF8.GetString(upload));
        }

        if (mediaType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase))
        {
            var typed = FromPdf(upload, out var pageCount);
            if (typed is not null) return typed;
            if (pageCount > MaxPages) return ReadResult.Failed($"That PDF has {pageCount} pages. The most EduPulse reads at once is {MaxPages}.");
            return await ByModel(upload, "application/pdf", userId, stop);
        }

        if (mediaType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return await ByModel(upload, mediaType, userId, stop);
        }

        return ReadResult.Failed("EduPulse reads PDFs, photos and pasted text.");
    }

    /// <summary>Pasted text has no pages, so it is cut into page-sized pieces at paragraph breaks.</summary>
    public static ReadResult FromText(string text)
    {
        var pages = new List<ReadPage>();
        var current = new StringBuilder();
        foreach (var paragraph in text.Replace("\r\n", "\n").Split("\n\n", StringSplitOptions.RemoveEmptyEntries))
        {
            if (current.Length > 0 && current.Length + paragraph.Length > 1800)
            {
                pages.Add(new ReadPage(pages.Count + 1, current.ToString().Trim()));
                current.Clear();
            }
            current.AppendLine(paragraph.Trim()).AppendLine();
        }
        if (current.ToString().Trim().Length > 0) pages.Add(new ReadPage(pages.Count + 1, current.ToString().Trim()));

        if (pages.Sum(p => p.Text.Length) < 80) return ReadResult.Failed("There was too little text to make questions from.");
        return new ReadResult(pages.Take(MaxPages).ToList(), null);
    }

    /// <summary>Returns null when the PDF holds pictures of pages instead of text.</summary>
    private static ReadResult? FromPdf(byte[] upload, out int pageCount)
    {
        pageCount = 0;
        try
        {
            using var pdf = PdfDocument.Open(upload);
            pageCount = pdf.NumberOfPages;
            if (pageCount > MaxPages)
            {
                return ReadResult.Failed($"That PDF has {pageCount} pages. The most EduPulse reads at once is {MaxPages}.");
            }

            var pages = new List<ReadPage>();
            foreach (var page in pdf.GetPages())
            {
                var words = page.GetWords().ToList();
                var lines = words
                    .GroupBy(word => Math.Round(word.BoundingBox.Bottom / 4.0))
                    .OrderByDescending(line => line.Key)
                    .Select(line => string.Join(' ', line.OrderBy(word => word.BoundingBox.Left).Select(word => word.Text)));
                pages.Add(new ReadPage(page.Number, string.Join('\n', lines).Trim()));
            }

            var letters = pages.Sum(p => p.Text.Count(char.IsLetter));
            if (letters < 60 * Math.Max(1, pageCount)) return null; // a scan: hardly any real text
            return new ReadResult(pages.Where(p => p.Text.Length > 0).ToList(), null);
        }
        catch (Exception)
        {
            return ReadResult.Failed("That PDF could not be opened. It may be damaged or locked with a password.");
        }
    }

    private async Task<ReadResult> ByModel(byte[] upload, string mediaType, Guid userId, CancellationToken stop)
    {
        if (!ai.CanSee)
        {
            return ReadResult.Failed("Reading photos and scanned pages is switched off on this server. Paste the text or upload a PDF with selectable text.");
        }

        var answer = await ai.AskAsync("read-document", Instructions,
            "Copy every page of this material into text. Answer as JSON: {\"pages\": [{\"number\": 1, \"text\": \"...\"}]}. " +
            "A single photo is page 1. Keep headings, numbering and line breaks.",
            new Attachment(upload, mediaType), userId, stop);

        if (answer is null) return ReadResult.Failed("The pages could not be read just now. Please try again in a few minutes.");

        var pages = answer.Items("pages")
            .Select((page, index) => new ReadPage(page.Number("number", index + 1), page.Text("text")))
            .Where(page => page.Text.Length > 0)
            .GroupBy(page => page.Number).Select(group => group.First())
            .OrderBy(page => page.Number).Take(MaxPages).ToList();

        if (pages.Sum(p => p.Text.Length) < 80) return ReadResult.Failed("Too little could be read from that. A clearer photo in good light usually helps.");
        return new ReadResult(pages, null);
    }
}

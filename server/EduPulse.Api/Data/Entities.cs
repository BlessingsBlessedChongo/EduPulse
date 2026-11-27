namespace EduPulse.Api.Data;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = "";
    public string Name { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    /// <summary>Raised when the password changes, so older sign-ins stop working.</summary>
    public int TokenVersion { get; set; }
    /// <summary>A try-it-out learner made by the demo button. Removed after a day.</summary>
    public bool IsDemo { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>One subject a learner is studying, with the question style of its lecturer or exam board.</summary>
public class Course
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
    public DateOnly? ExamDate { get; set; }
    /// <summary>The learned question format, as JSON (see <see cref="Questions.Style"/>). Null until a past paper is read.</summary>
    public string? StyleJson { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public enum DocumentKind { Notes, PastPaper }

public enum DocumentStatus { Queued, Reading, Ready, Failed }

/// <summary>Something the learner added: notes, a handout or a past paper. Only its text is kept.</summary>
public class Document
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public DocumentKind Kind { get; set; }
    public string Title { get; set; } = "";
    public DocumentStatus Status { get; set; }
    /// <summary>What the learner sees while it is being read, or why it failed.</summary>
    public string? Note { get; set; }
    public int PageCount { get; set; }
    public int QuestionCount { get; set; }
    /// <summary>How many questions were proposed for this document, before the checks.</summary>
    public int Proposed { get; set; }
    /// <summary>How many were refused because their source words were not on the page.</summary>
    public int NotOnPage { get; set; }
    /// <summary>The upload waiting to be read. Cleared once the text has been taken out.</summary>
    public byte[]? Upload { get; set; }
    public string? UploadType { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public class Page
{
    public Guid Id { get; set; }
    public Guid DocumentId { get; set; }
    public int Number { get; set; }
    public string Text { get; set; } = "";
}

public class Topic
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public string Name { get; set; } = "";
}

public enum QuestionKind { Choice, Short, Maths, Blank }

public class Question
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public Guid TopicId { get; set; }
    public Guid DocumentId { get; set; }
    public int PageNumber { get; set; }
    public QuestionKind Kind { get; set; }
    public string Prompt { get; set; } = "";
    /// <summary>For multiple choice: the options, as a JSON array of strings.</summary>
    public string? OptionsJson { get; set; }
    /// <summary>The model answer shown after marking. For multiple choice, the correct option's text.</summary>
    public string Answer { get; set; } = "";
    /// <summary>For maths: the final answer as an expression the maths engine can compare, such as "3" or "2*x+1".</summary>
    public string? AnswerExpression { get; set; }
    /// <summary>The marking scheme: a JSON array of { "point", "marks" }.</summary>
    public string SchemeJson { get; set; } = "[]";
    public int Marks { get; set; }
    /// <summary>The words from the learner's own page that this question rests on.</summary>
    public string SourceQuote { get; set; } = "";
    /// <summary>Who wrote it: "ai" or "rules".</summary>
    public string MadeBy { get; set; } = "ai";
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>When a question is next due for one learner, and how well it is holding.</summary>
public class Review
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid QuestionId { get; set; }
    public Guid CourseId { get; set; }
    public Guid TopicId { get; set; }
    public DateOnly DueOn { get; set; }
    public int IntervalDays { get; set; }
    /// <summary>Correct answers in a row.</summary>
    public int Streak { get; set; }
    public int Lapses { get; set; }
    /// <summary>The share of the marks earned last time, 0 to 1.</summary>
    public double LastScore { get; set; }
    public DateOnly LastSeenOn { get; set; }
}

public class Attempt
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid QuestionId { get; set; }
    public Guid CourseId { get; set; }
    public string Response { get; set; } = "";
    public bool FromPhoto { get; set; }
    public int Score { get; set; }
    public int MaxScore { get; set; }
    /// <summary>What was awarded and why, as JSON (see <see cref="Marking.Verdict"/>).</summary>
    public string VerdictJson { get; set; } = "{}";
    /// <summary>What did the marking: "engine", "ai", "rules" or "exact".</summary>
    public string MarkedBy { get; set; } = "";
    /// <summary>The learner said the marking was wrong and set their own score.</summary>
    public bool Disputed { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>One call to an AI model: what for, how long, and whether it worked.</summary>
public class AiCall
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string Purpose { get; set; } = "";
    public string Model { get; set; } = "";
    public int Milliseconds { get; set; }
    public bool Succeeded { get; set; }
    public bool HadImage { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

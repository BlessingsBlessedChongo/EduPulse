using EduPulse.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace EduPulse.Api.Study;

public record TopicPulse(Guid TopicId, string Topic, int Percent, int Questions, int Seen, int Due, string Reading);

public record CoursePulse(Guid CourseId, string Course, int Percent, int Questions, int Seen, int Due, DateOnly? ExamDate,
    int? DaysToExam, List<TopicPulse> Topics);

public record Day(DateOnly Date, int Answered, int Marks, int OutOf);

public record PulseView(int Percent, int Questions, int Seen, int DueToday, int Streak, List<CoursePulse> Courses, List<Day> Days);

/// <summary>
/// The learner's pulse: for each topic, the share of its questions they would
/// likely get right today. A question never attempted counts as zero, so the
/// number cannot flatter. It is private to the learner; nothing is ranked.
/// </summary>
public class Pulse(AppDb db)
{
    public async Task<PulseView> ForAsync(Guid userId, DateOnly today, CancellationToken stop)
    {
        var courses = await db.Courses.Where(c => c.UserId == userId).OrderBy(c => c.CreatedAt).ToListAsync(stop);
        var courseIds = courses.Select(c => c.Id).ToList();
        var topics = await db.Topics.Where(t => courseIds.Contains(t.CourseId)).ToListAsync(stop);
        var questions = await db.Questions.Where(q => courseIds.Contains(q.CourseId))
            .Select(q => new { q.Id, q.CourseId, q.TopicId }).ToListAsync(stop);
        var reviews = (await db.Reviews.Where(r => r.UserId == userId).ToListAsync(stop)).ToDictionary(r => r.QuestionId);

        var views = new List<CoursePulse>();
        foreach (var course in courses)
        {
            var inCourse = questions.Where(q => q.CourseId == course.Id).ToList();
            var topicViews = new List<TopicPulse>();
            foreach (var topic in topics.Where(t => t.CourseId == course.Id).OrderBy(t => t.Name))
            {
                var inTopic = inCourse.Where(q => q.TopicId == topic.Id).ToList();
                if (inTopic.Count == 0) continue;
                var seen = inTopic.Where(q => reviews.ContainsKey(q.Id)).ToList();
                var strength = inTopic.Sum(q => reviews.TryGetValue(q.Id, out var r) ? Scheduler.Strength(r, today) : 0) / inTopic.Count;
                var due = seen.Count(q => reviews[q.Id].DueOn <= today);
                var lapses = seen.Sum(q => reviews[q.Id].Lapses);
                topicViews.Add(new TopicPulse(topic.Id, topic.Name, Percent(strength), inTopic.Count, seen.Count, due,
                    Reading(strength, inTopic.Count, seen.Count, lapses)));
            }

            var total = inCourse.Count;
            var courseStrength = total == 0 ? 0 : inCourse.Sum(q => reviews.TryGetValue(q.Id, out var r) ? Scheduler.Strength(r, today) : 0) / total;
            views.Add(new CoursePulse(course.Id, course.Name, Percent(courseStrength), total,
                inCourse.Count(q => reviews.ContainsKey(q.Id)),
                inCourse.Count(q => reviews.TryGetValue(q.Id, out var r) && r.DueOn <= today),
                course.ExamDate, course.ExamDate is null ? null : course.ExamDate.Value.DayNumber - today.DayNumber,
                topicViews.OrderBy(t => t.Percent).ToList()));
        }

        var since = today.AddDays(-13);
        var from = new DateTimeOffset(since.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var attempts = await db.Attempts.Where(a => a.UserId == userId && a.CreatedAt >= from)
            .Select(a => new { a.CreatedAt, a.Score, a.MaxScore }).ToListAsync(stop);
        var days = Enumerable.Range(0, 14).Select(offset =>
        {
            var date = since.AddDays(offset);
            var that = attempts.Where(a => DateOnly.FromDateTime(a.CreatedAt.UtcDateTime) == date).ToList();
            return new Day(date, that.Count, that.Sum(a => a.Score), that.Sum(a => a.MaxScore));
        }).ToList();

        var allDays = (await db.Attempts.Where(a => a.UserId == userId).Select(a => a.CreatedAt).ToListAsync(stop))
            .Select(at => DateOnly.FromDateTime(at.UtcDateTime)).ToHashSet();
        var streak = 0;
        for (var date = allDays.Contains(today) ? today : today.AddDays(-1); allDays.Contains(date); date = date.AddDays(-1)) streak++;

        var all = questions.Count;
        var overall = all == 0 ? 0 : questions.Sum(q => reviews.TryGetValue(q.Id, out var r) ? Scheduler.Strength(r, today) : 0) / all;
        return new PulseView(Percent(overall), all, questions.Count(q => reviews.ContainsKey(q.Id)),
            questions.Count(q => reviews.TryGetValue(q.Id, out var r) && r.DueOn <= today), streak, views, days);
    }

    private static int Percent(double share) => (int)Math.Round(Math.Clamp(share, 0, 1) * 100);

    /// <summary>The number, in words the learner can act on.</summary>
    private static string Reading(double strength, int questions, int seen, int lapses)
    {
        if (seen == 0) return "Not started yet.";
        if (seen < questions && strength < 0.5) return $"{questions - seen} of {questions} questions not tried yet.";
        if (lapses >= 3 && strength < 0.7) return "You keep missing some of these. Worth rereading your notes on it.";
        if (strength >= 0.8) return "Strong. It will come back less often.";
        if (strength >= 0.5) return "Getting there.";
        return "Weak today. It will come up again soon.";
    }
}

using EduPulse.Api.Data;

namespace EduPulse.Api.Study;

/// <summary>
/// Decides when a question should come back.
///
/// Answer it well and the gap grows: tomorrow, then three days, then about a
/// week, then longer. Get it wrong and it returns tomorrow. Spacing revision
/// like this is what makes it stick, and it is the part learners never plan
/// for themselves.
/// </summary>
public static class Scheduler
{
    public const int LongestGap = 60;

    public static void Apply(Review review, double share, DateOnly today)
    {
        if (share >= 0.8)
        {
            review.Streak++;
            review.IntervalDays = review.Streak switch
            {
                1 => 1,
                2 => 3,
                _ => Math.Min(LongestGap, (int)Math.Round(Math.Max(3, review.IntervalDays) * 2.2)),
            };
        }
        else if (share >= 0.5)
        {
            // Partly right: keep it close, without throwing away what was built.
            review.IntervalDays = Math.Max(1, (int)Math.Round(review.IntervalDays * 0.5));
        }
        else
        {
            review.Streak = 0;
            review.Lapses++;
            review.IntervalDays = 1;
        }

        review.LastScore = Math.Clamp(share, 0, 1);
        review.LastSeenOn = today;
        review.DueOn = today.AddDays(review.IntervalDays);
    }

    /// <summary>
    /// How likely the learner is to get this right today, from 0 to 1: the last
    /// result, fading as time passes beyond the gap it was scheduled for.
    /// </summary>
    public static double Strength(Review review, DateOnly today)
    {
        var days = Math.Max(0, today.DayNumber - review.LastSeenOn.DayNumber);
        var halfLife = Math.Max(1.0, review.IntervalDays * 2.0);
        return review.LastScore * Math.Pow(0.5, days / halfLife);
    }
}

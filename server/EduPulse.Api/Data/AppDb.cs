using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;

namespace EduPulse.Api.Data;

/// <summary>
/// The database, as the code sees it. The tables themselves are created by the
/// SQL files in Migrations (see <see cref="Migrator"/>); this class only maps to them.
/// </summary>
public partial class AppDb(DbContextOptions<AppDb> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<Page> Pages => Set<Page>();
    public DbSet<Topic> Topics => Set<Topic>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Attempt> Attempts => Set<Attempt>();
    public DbSet<AiCall> AiCalls => Set<AiCall>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<User>().ToTable("learner");
        model.Entity<Course>().ToTable("course");
        model.Entity<Document>().ToTable("document");
        model.Entity<Page>().ToTable("page");
        model.Entity<Topic>().ToTable("topic");
        model.Entity<Question>().ToTable("question");
        model.Entity<Review>().ToTable("review");
        model.Entity<Attempt>().ToTable("attempt");
        model.Entity<AiCall>().ToTable("ai_call");

        model.Entity<Course>().Property(c => c.StyleJson).HasColumnType("jsonb");
        model.Entity<Question>().Property(q => q.OptionsJson).HasColumnType("jsonb");
        model.Entity<Question>().Property(q => q.SchemeJson).HasColumnType("jsonb");
        model.Entity<Attempt>().Property(a => a.VerdictJson).HasColumnType("jsonb");

        model.Entity<Document>().Property(d => d.Kind).HasConversion<string>();
        model.Entity<Document>().Property(d => d.Status).HasConversion<string>();
        model.Entity<Question>().Property(q => q.Kind).HasConversion<string>();

        // Who belongs to whom. This is what lets a topic be saved before the questions that point at it.
        model.Entity<Course>().HasOne<User>().WithMany().HasForeignKey(c => c.UserId);
        model.Entity<Document>().HasOne<Course>().WithMany().HasForeignKey(d => d.CourseId);
        model.Entity<Page>().HasOne<Document>().WithMany().HasForeignKey(p => p.DocumentId);
        model.Entity<Topic>().HasOne<Course>().WithMany().HasForeignKey(t => t.CourseId);
        model.Entity<Question>().HasOne<Course>().WithMany().HasForeignKey(q => q.CourseId);
        model.Entity<Question>().HasOne<Topic>().WithMany().HasForeignKey(q => q.TopicId);
        model.Entity<Question>().HasOne<Document>().WithMany().HasForeignKey(q => q.DocumentId);
        model.Entity<Review>().HasOne<User>().WithMany().HasForeignKey(r => r.UserId);
        model.Entity<Review>().HasOne<Question>().WithMany().HasForeignKey(r => r.QuestionId);
        model.Entity<Attempt>().HasOne<User>().WithMany().HasForeignKey(a => a.UserId);
        model.Entity<Attempt>().HasOne<Question>().WithMany().HasForeignKey(a => a.QuestionId);

        // Columns are snake_case in the database: PageNumber is page_number.
        foreach (var entity in model.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                property.SetColumnName(Snake().Replace(property.Name, "$1_$2").ToLowerInvariant());
            }
        }
    }

    [GeneratedRegex("([a-z0-9])([A-Z])")]
    private static partial Regex Snake();
}

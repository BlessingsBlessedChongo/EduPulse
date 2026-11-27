using EduPulse.Api.Data;
using EduPulse.Api.Marking;
using EduPulse.Api.Questions;
using EduPulse.Api.Reading;

namespace EduPulse.Api.Study;

/// <summary>
/// The try-it-out account. Each visitor who presses "Try the demo" gets their
/// own private learner with two courses, notes, a learned exam style, questions
/// and a week of study history, so every screen has something real on it.
/// Nothing here calls a model: the notes and questions are written out below.
/// </summary>
public static class DemoSchool
{
    private const string BiologyPage1 =
        "BIO 110 Cell Biology. Lecture 4: The cell and its organelles.\n\n" +
        "The cell is the basic structural and functional unit of all living organisms. " +
        "Cells are divided into two groups: prokaryotic cells, which have no nucleus, and eukaryotic cells, which have a true nucleus enclosed by a nuclear envelope. " +
        "Bacteria are prokaryotes. Plants, animals and fungi are eukaryotes.\n\n" +
        "The cell membrane is a phospholipid bilayer that controls what enters and leaves the cell. " +
        "It is described as selectively permeable because it allows some substances through and not others. " +
        "Proteins embedded in the membrane act as channels and carriers.\n\n" +
        "The nucleus contains the cell's DNA and controls the activities of the cell. " +
        "Inside the nucleus, the nucleolus makes ribosomes.";

    private const string BiologyPage2 =
        "Mitochondria are the site of aerobic respiration, where most of the cell's ATP is produced. " +
        "A mitochondrion has a double membrane; the inner membrane is folded into cristae, which increase the surface area for respiration. " +
        "Cells that need a lot of energy, such as muscle cells, contain many mitochondria.\n\n" +
        "Ribosomes are the site of protein synthesis. They are found free in the cytoplasm or attached to the rough endoplasmic reticulum. " +
        "The rough endoplasmic reticulum transports proteins made by its ribosomes. " +
        "The smooth endoplasmic reticulum makes lipids and has no ribosomes.\n\n" +
        "The Golgi apparatus modifies, sorts and packages proteins into vesicles for transport out of the cell. " +
        "Lysosomes contain digestive enzymes that break down worn-out organelles and foreign material.";

    private const string BiologyPage3 =
        "Plant cells have three structures that animal cells lack: a cell wall, chloroplasts and a large permanent vacuole. " +
        "The cell wall is made of cellulose and gives the plant cell its shape and strength. " +
        "Chloroplasts are the site of photosynthesis and contain the green pigment chlorophyll.\n\n" +
        "Movement across the membrane. Diffusion is the net movement of particles from a region of higher concentration to a region of lower concentration. " +
        "Osmosis is the diffusion of water across a selectively permeable membrane from a dilute solution to a more concentrated solution. " +
        "Active transport moves substances against their concentration gradient and requires energy from ATP.\n\n" +
        "A cell placed in a concentrated salt solution loses water by osmosis. An animal cell shrinks; a plant cell becomes plasmolysed.";

    private const string BiologyPaper =
        "THE COPPERBELT UNIVERSITY. SCHOOL OF MATHEMATICS AND NATURAL SCIENCES. BIO 110 TEST 1. Time: 1 hour 30 minutes.\n" +
        "Answer ALL questions in Section A and any TWO questions in Section B.\n\n" +
        "SECTION A\n" +
        "1. Which organelle is the site of protein synthesis?\n   A. Lysosome\n   B. Ribosome\n   C. Golgi apparatus\n   D. Vacuole\n" +
        "2. State two differences between prokaryotic and eukaryotic cells. [2]\n" +
        "3. Define the term osmosis. [2]\n" +
        "4. State the function of the nucleolus. [1]\n\n" +
        "SECTION B\n" +
        "5. (a) Describe the structure of a mitochondrion. [4]\n   (b) Explain why muscle cells contain many mitochondria. [3]\n" +
        "6. (a) Explain what is meant by a selectively permeable membrane. [3]\n   (b) Describe what happens to a plant cell placed in a concentrated salt solution. [4]\n" +
        "7. Compare diffusion and active transport. [6]";

    private const string MathsPage1 =
        "MA 110 Engineering Mathematics. Week 3: Quadratic equations and indices.\n\n" +
        "A quadratic equation has the form ax^2 + bx + c = 0, where a is not zero. " +
        "It can be solved by factorising, by completing the square, or with the quadratic formula x = (-b ± sqrt(b^2 - 4ac)) / (2a).\n\n" +
        "Worked example 1. Solve x^2 - 5x + 6 = 0. Factorising gives (x - 2)(x - 3) = 0, so x = 2 or x = 3.\n\n" +
        "The discriminant is b^2 - 4ac. If the discriminant is positive the equation has two real roots; if it is zero the roots are equal; if it is negative there are no real roots.\n\n" +
        "Laws of indices. a^m × a^n = a^(m+n). a^m ÷ a^n = a^(m-n). (a^m)^n = a^(mn). Any non-zero number to the power zero is 1.";

    private const string MathsPage2 =
        "Week 4: Differentiation.\n\n" +
        "The derivative of x^n with respect to x is n x^(n-1). This is called the power rule. " +
        "The derivative of a constant is zero. The derivative of a sum is the sum of the derivatives.\n\n" +
        "Worked example 2. Differentiate y = 3x^2 + 4x - 7. Using the power rule on each term, dy/dx = 6x + 4.\n\n" +
        "The gradient of a curve at a point is the value of the derivative at that point. " +
        "A stationary point is a point where the derivative is zero.\n\n" +
        "Worked example 3. Find the gradient of y = x^3 at x = 2. dy/dx = 3x^2, so at x = 2 the gradient is 12.";

    public static async Task<User> CreateAsync(AppDb db, DateOnly today, CancellationToken stop)
    {
        var now = DateTimeOffset.UtcNow;
        var user = new User
        {
            Id = Guid.NewGuid(), Name = "Demo learner", Email = $"demo-{Guid.NewGuid():N}@demo.edupulse", PasswordHash = "",
            IsDemo = true, CreatedAt = now,
        };
        db.Users.Add(user);

        // Course one: biology, with a past paper that has taught the question style.
        var biology = new Course
        {
            Id = Guid.NewGuid(), UserId = user.Id, Name = "BIO 110 Cell Biology", ExamDate = today.AddDays(18), CreatedAt = now.AddDays(-7),
            StyleJson = (StyleLearner.ByRules(BiologyPaper) with
            {
                Layout = "Section A is short compulsory questions including multiple choice; Section B is longer structured questions with parts (a) and (b), answer any two.",
                Examples =
                [
                    "State two differences between prokaryotic and eukaryotic cells. [2]",
                    "Explain why muscle cells contain many mitochondria. [3]",
                    "Describe what happens to a plant cell placed in a concentrated salt solution. [4]",
                ],
            }).ToJson(),
        };
        db.Courses.Add(biology);
        var bioNotes = AddDocument(db, biology.Id, DocumentKind.Notes, "Lecture 4: Cells and organelles", [BiologyPage1, BiologyPage2, BiologyPage3], now.AddDays(-7));
        var bioPaper = AddDocument(db, biology.Id, DocumentKind.PastPaper, "BIO 110 Test 1 (2025)", [BiologyPaper], now.AddDays(-6));
        bioPaper.Note = "Question style learned. New practice questions will follow it.";

        var bio = new List<Draft>
        {
            new("Cell types", QuestionKind.Short, "State two differences between prokaryotic and eukaryotic cells.", null,
                "Prokaryotic cells have no nucleus; eukaryotic cells have a true nucleus enclosed by a nuclear envelope.", null,
                [new("Prokaryotic cells have no nucleus.", 1), new("Eukaryotic cells have a true nucleus enclosed by a nuclear envelope.", 1)], 2, 1,
                "prokaryotic cells, which have no nucleus, and eukaryotic cells, which have a true nucleus enclosed by a nuclear envelope", "ai"),
            new("Cell types", QuestionKind.Choice, "Which of the following is a prokaryote?", ["A bacterium", "A fungus", "A plant", "An animal"],
                "A bacterium", null, [new("Chooses the correct option.", 1)], 1, 1, "Bacteria are prokaryotes.", "ai"),
            new("Cell membrane", QuestionKind.Short, "Explain what is meant by a selectively permeable membrane.", null,
                "A membrane that allows some substances to pass through and not others.", null,
                [new("It allows some substances through.", 1), new("It does not allow other substances through.", 1)], 2, 1,
                "It is described as selectively permeable because it allows some substances through and not others.", "ai"),
            new("Cell membrane", QuestionKind.Blank, "Fill in the missing word: The cell membrane is a _____ bilayer that controls what enters and leaves the cell.", null,
                "phospholipid", null, [new("The missing word is \"phospholipid\".", 1)], 1, 1,
                "The cell membrane is a phospholipid bilayer that controls what enters and leaves the cell.", "rules"),
            new("Nucleus", QuestionKind.Short, "State the function of the nucleolus.", null, "It makes ribosomes.", null,
                [new("The nucleolus makes ribosomes.", 1)], 1, 1, "Inside the nucleus, the nucleolus makes ribosomes.", "ai"),
            new("Mitochondria", QuestionKind.Short, "Describe the structure of a mitochondrion.", null,
                "It has a double membrane. The inner membrane is folded into cristae, which increase the surface area for respiration.", null,
                [new("It has a double membrane.", 1), new("The inner membrane is folded into cristae.", 1), new("The cristae increase the surface area for respiration.", 2)], 4, 2,
                "A mitochondrion has a double membrane; the inner membrane is folded into cristae, which increase the surface area for respiration.", "ai"),
            new("Mitochondria", QuestionKind.Short, "Explain why muscle cells contain many mitochondria.", null,
                "Muscle cells need a lot of energy, and mitochondria are the site of aerobic respiration, where most of the cell's ATP is produced.", null,
                [new("Muscle cells need a lot of energy.", 1), new("Mitochondria are the site of aerobic respiration.", 1), new("Respiration produces ATP.", 1)], 3, 2,
                "Cells that need a lot of energy, such as muscle cells, contain many mitochondria.", "ai"),
            new("Protein synthesis", QuestionKind.Choice, "Which organelle is the site of protein synthesis?", ["Ribosome", "Lysosome", "Golgi apparatus", "Vacuole"],
                "Ribosome", null, [new("Chooses the correct option.", 1)], 1, 2, "Ribosomes are the site of protein synthesis.", "ai"),
            new("Protein synthesis", QuestionKind.Short, "State the function of the Golgi apparatus.", null,
                "It modifies, sorts and packages proteins into vesicles for transport out of the cell.", null,
                [new("It modifies and sorts proteins.", 1), new("It packages proteins into vesicles for transport out of the cell.", 1)], 2, 2,
                "The Golgi apparatus modifies, sorts and packages proteins into vesicles for transport out of the cell.", "ai"),
            new("Plant cells", QuestionKind.Short, "State three structures found in plant cells but not in animal cells.", null,
                "A cell wall, chloroplasts and a large permanent vacuole.", null,
                [new("A cell wall.", 1), new("Chloroplasts.", 1), new("A large permanent vacuole.", 1)], 3, 3,
                "Plant cells have three structures that animal cells lack: a cell wall, chloroplasts and a large permanent vacuole.", "ai"),
            new("Transport", QuestionKind.Short, "Define the term osmosis.", null,
                "The diffusion of water across a selectively permeable membrane from a dilute solution to a more concentrated solution.", null,
                [new("It is the diffusion (movement) of water across a selectively permeable membrane.", 1), new("From a dilute solution to a more concentrated solution.", 1)], 2, 3,
                "Osmosis is the diffusion of water across a selectively permeable membrane from a dilute solution to a more concentrated solution.", "ai"),
            new("Transport", QuestionKind.Short, "Compare diffusion and active transport.", null,
                "Diffusion moves particles from higher to lower concentration and needs no energy. Active transport moves substances against their concentration gradient and requires energy from ATP.", null,
                [new("Diffusion moves particles from a higher concentration to a lower concentration.", 2), new("Active transport moves substances against their concentration gradient.", 2), new("Active transport requires energy from ATP; diffusion does not.", 2)], 6, 3,
                "Active transport moves substances against their concentration gradient and requires energy from ATP.", "ai"),
            new("Transport", QuestionKind.Short, "Describe what happens to a plant cell placed in a concentrated salt solution.", null,
                "The cell loses water by osmosis and becomes plasmolysed.", null,
                [new("Water leaves the cell.", 1), new("The water moves by osmosis.", 1), new("The cell becomes plasmolysed.", 2)], 4, 3,
                "A cell placed in a concentrated salt solution loses water by osmosis. An animal cell shrinks; a plant cell becomes plasmolysed.", "ai"),
        };

        // Course two: maths, where final answers are checked by calculation.
        var maths = new Course { Id = Guid.NewGuid(), UserId = user.Id, Name = "MA 110 Engineering Mathematics", ExamDate = today.AddDays(31), CreatedAt = now.AddDays(-5) };
        db.Courses.Add(maths);
        var mathsNotes = AddDocument(db, maths.Id, DocumentKind.Notes, "Weeks 3 and 4: Quadratics, indices, differentiation", [MathsPage1, MathsPage2], now.AddDays(-5));

        var sums = new List<Draft>
        {
            new("Quadratic equations", QuestionKind.Maths, "Solve x^2 - 7x + 12 = 0.", null, "x = 3 or x = 4", "3, 4",
                [new("Factorises to (x - 3)(x - 4) = 0.", 2), new("States both roots, x = 3 and x = 4.", 1)], 3, 1,
                "Factorising gives (x - 2)(x - 3) = 0, so x = 2 or x = 3.", "ai"),
            new("Quadratic equations", QuestionKind.Maths, "Solve 2x^2 + 3x - 2 = 0.", null, "x = 1/2 or x = -2", "1/2, -2",
                [new("Factorises to (2x - 1)(x + 2) = 0, or substitutes correctly into the quadratic formula.", 2), new("States both roots, x = 1/2 and x = -2.", 2)], 4, 1,
                "It can be solved by factorising, by completing the square, or with the quadratic formula", "ai"),
            new("Quadratic equations", QuestionKind.Maths, "Find the discriminant of 3x^2 - 4x + 2 = 0.", null, "-8", "-8",
                [new("Uses b^2 - 4ac with a = 3, b = -4, c = 2.", 1), new("Obtains 16 - 24 = -8.", 1)], 2, 1,
                "The discriminant is b^2 - 4ac.", "ai"),
            new("Quadratic equations", QuestionKind.Choice, "The discriminant of a quadratic equation is negative. How many real roots does the equation have?",
                ["None", "One repeated root", "Two", "Three"], "None", null, [new("Chooses the correct option.", 1)], 1, 1,
                "if it is negative there are no real roots", "ai"),
            new("Indices", QuestionKind.Maths, "Simplify a^5 × a^3.", null, "a^8", "a^8",
                [new("Adds the powers: 5 + 3.", 1), new("Writes a^8.", 1)], 2, 1, "Laws of indices. a^m × a^n = a^(m+n).", "ai"),
            new("Indices", QuestionKind.Maths, "Evaluate (2^3)^2.", null, "64", "64",
                [new("Multiplies the powers to get 2^6.", 1), new("Evaluates 2^6 = 64.", 1)], 2, 1, "(a^m)^n = a^(mn). Any non-zero number to the power zero is 1.", "ai"),
            new("Differentiation", QuestionKind.Maths, "Differentiate y = 5x^3 - 2x^2 + 9 with respect to x.", null, "15x^2 - 4x", "15*x^2 - 4*x",
                [new("Differentiates 5x^3 to 15x^2.", 1), new("Differentiates -2x^2 to -4x.", 1), new("Differentiates the constant 9 to 0.", 1)], 3, 2,
                "The derivative of x^n with respect to x is n x^(n-1).", "ai"),
            new("Differentiation", QuestionKind.Maths, "Find the gradient of the curve y = 2x^2 + 3x at the point where x = 1.", null, "7", "7",
                [new("Differentiates to dy/dx = 4x + 3.", 2), new("Substitutes x = 1 to get 7.", 1)], 3, 2,
                "The gradient of a curve at a point is the value of the derivative at that point.", "ai"),
            new("Differentiation", QuestionKind.Maths, "Find the x-coordinate of the stationary point of y = x^2 - 6x + 4.", null, "x = 3", "3",
                [new("Differentiates to dy/dx = 2x - 6.", 1), new("Sets the derivative equal to zero.", 1), new("Solves to get x = 3.", 1)], 3, 2,
                "A stationary point is a point where the derivative is zero.", "ai"),
            new("Differentiation", QuestionKind.Short, "State the power rule for differentiation.", null,
                "The derivative of x^n with respect to x is n x^(n-1).", null, [new("The derivative of x^n is n x^(n-1).", 1)], 1, 2,
                "The derivative of x^n with respect to x is n x^(n-1). This is called the power rule.", "ai"),
        };

        var bioQuestions = Save(db, biology.Id, bioNotes, bio);
        var mathsQuestions = Save(db, maths.Id, mathsNotes, sums);
        bioNotes.QuestionCount = bio.Count;
        bioNotes.Proposed = bio.Count + 2;
        bioNotes.NotOnPage = 2;
        mathsNotes.QuestionCount = sums.Count;
        mathsNotes.Proposed = sums.Count + 3;
        mathsNotes.NotOnPage = 1;

        // A week of study, so the pulse has a shape: some topics strong, some slipping, some untouched.
        var history = new (Question Question, int DaysAgo, double Share)[]
        {
            (bioQuestions[0], 6, 1.0), (bioQuestions[0], 5, 1.0), (bioQuestions[0], 2, 1.0),
            (bioQuestions[1], 6, 1.0), (bioQuestions[1], 5, 1.0),
            (bioQuestions[2], 5, 0.5), (bioQuestions[2], 4, 1.0), (bioQuestions[2], 1, 1.0),
            (bioQuestions[3], 4, 1.0),
            (bioQuestions[5], 4, 0.25), (bioQuestions[5], 3, 0.5), (bioQuestions[5], 1, 0.5),
            (bioQuestions[6], 3, 0.33), (bioQuestions[6], 2, 0.33), (bioQuestions[6], 1, 0.0),
            (bioQuestions[7], 3, 1.0), (bioQuestions[7], 2, 1.0),
            (bioQuestions[10], 2, 0.5), (bioQuestions[10], 1, 1.0),
            (mathsQuestions[0], 4, 1.0), (mathsQuestions[0], 3, 1.0),
            (mathsQuestions[1], 4, 0.5), (mathsQuestions[1], 3, 0.0), (mathsQuestions[1], 1, 0.5),
            (mathsQuestions[4], 3, 1.0), (mathsQuestions[4], 2, 1.0),
            (mathsQuestions[6], 2, 0.67), (mathsQuestions[6], 1, 1.0),
        };
        var reviews = new Dictionary<Guid, Review>();
        foreach (var (question, daysAgo, share) in history.OrderByDescending(h => h.DaysAgo))
        {
            var day = today.AddDays(-daysAgo);
            if (!reviews.TryGetValue(question.Id, out var review))
            {
                review = new Review
                {
                    Id = Guid.NewGuid(), UserId = user.Id, QuestionId = question.Id, CourseId = question.CourseId, TopicId = question.TopicId,
                    DueOn = day, LastSeenOn = day,
                };
                reviews[question.Id] = review;
                db.Reviews.Add(review);
            }
            Scheduler.Apply(review, share, day);

            var score = (int)Math.Round(share * question.Marks);
            var scheme = QuestionMaker.SchemeFrom(question.SchemeJson);
            db.Attempts.Add(new Attempt
            {
                Id = Guid.NewGuid(), UserId = user.Id, QuestionId = question.Id, CourseId = question.CourseId, Response = "(earlier answer)",
                Score = score, MaxScore = question.Marks, MarkedBy = question.Kind == QuestionKind.Maths ? "engine" : "ai",
                VerdictJson = new Verdict
                {
                    Score = score, Max = question.Marks, MarkedBy = question.Kind == QuestionKind.Maths ? "engine" : "ai",
                    Awards = scheme.Select(p => new Award(p.Point, p.Marks, share >= 0.99 ? p.Marks : 0, "")).ToList(),
                }.ToJson(),
                CreatedAt = new DateTimeOffset(day.ToDateTime(new TimeOnly(18, 30)), TimeSpan.Zero),
            });
        }

        await db.SaveChangesAsync(stop);
        return user;
    }

    private static Document AddDocument(AppDb db, Guid courseId, DocumentKind kind, string title, string[] pages, DateTimeOffset at)
    {
        var document = new Document
        {
            Id = Guid.NewGuid(), CourseId = courseId, Kind = kind, Title = title, Status = DocumentStatus.Ready,
            Note = kind == DocumentKind.Notes ? "Questions ready." : "", PageCount = pages.Length, CreatedAt = at,
        };
        db.Documents.Add(document);
        for (var i = 0; i < pages.Length; i++)
        {
            db.Pages.Add(new Page { Id = Guid.NewGuid(), DocumentId = document.Id, Number = i + 1, Text = pages[i] });
        }
        return document;
    }

    private static List<Question> Save(AppDb db, Guid courseId, Document document, List<Draft> drafts)
    {
        var topics = new Dictionary<string, Topic>();
        var saved = new List<Question>();
        var at = document.CreatedAt;
        foreach (var draft in drafts)
        {
            if (!topics.TryGetValue(draft.Topic, out var topic))
            {
                topic = new Topic { Id = Guid.NewGuid(), CourseId = courseId, Name = draft.Topic };
                topics[draft.Topic] = topic;
                db.Topics.Add(topic);
            }
            var question = Library.ToQuestion(draft, courseId, topic.Id, document.Id);
            at = at.AddSeconds(1);
            question.CreatedAt = at;
            db.Questions.Add(question);
            saved.Add(question);
        }
        return saved;
    }
}

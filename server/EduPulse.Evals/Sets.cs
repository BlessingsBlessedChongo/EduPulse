using EduPulse.Api.Questions;

/// <summary>The test sets, written and labelled by hand.</summary>
internal static class Sets
{
    public record MathsPair(string Expected, string Given, bool Same);

    public static readonly List<MathsPair> Maths =
    [
        // the same answer, written the ways learners write it
        new("3", "x = 3", true), new("3", "3.0", true), new("3", "6/2", true), new("3", "9^(1/2)", true),
        new("1/2", "0.5", true), new("1/2", "\\frac{1}{2}", true), new("1/2", "2/4", true), new("0.25", "1/4", true),
        new("3, 4", "x = 4 or x = 3", true), new("3, 4", "x=3, x=4", true), new("1/2, -2", "-2 and 0.5", true), new("-1, 5", "x = 5; x = -1", true),
        new("2*x + 2", "2(x + 1)", true), new("x^2 - 9", "(x - 3)(x + 3)", true), new("x^2 + 2*x + 1", "(x + 1)^2", true), new("6*x + 4", "2(3x + 2)", true),
        new("15*x^2 - 4*x", "15x^2 - 4x", true), new("15*x^2 - 4*x", "x(15x - 4)", true), new("3*x^2", "dy/dx = 3x²", true), new("2*x - 6", "2(x - 3)", true),
        new("a^8", "a^8", true), new("a^8", "a^5 * a^3", true), new("64", "2^6", true), new("64", "8^2", true),
        new("12", "12 cm", true), new("1500", "K1,500.00", true), new("0.25", "25%", true), new("0.25", "0.25 mol/dm^3", true),
        new("2", "n = 2 mol", true), new("10", "F = 10 N", true), new("6.02*10^23", "6.02 x 10^23", true), new("sqrt(2)", "2^(1/2)", true),
        new("-8", "−8", true), new("7", "7.00", true), new("1/3", "2/6", true), new("x/2", "0.5x", true),
        // a different answer
        new("3", "4", false), new("3", "-3", false), new("3", "3.1", false), new("3", "1/3", false),
        new("1/2", "2", false), new("1/2", "0.05", false), new("0.25", "2.5", false), new("0.25", "1/3", false),
        new("3, 4", "3", false), new("3, 4", "3, 5", false), new("3, 4", "-3, -4", false), new("1/2, -2", "1/2, 2", false),
        new("2*x + 2", "2x + 1", false), new("x^2 - 9", "(x - 3)^2", false), new("x^2 + 2*x + 1", "x^2 + 1", false), new("6*x + 4", "6x - 4", false),
        new("15*x^2 - 4*x", "15x^2 + 4x", false), new("15*x^2 - 4*x", "15x^2 - 4", false), new("3*x^2", "3x", false), new("2*x - 6", "2x + 6", false),
        new("a^8", "a^15", false), new("a^8", "8a", false), new("64", "32", false), new("64", "2^5", false),
        new("12", "21 cm", false), new("1500", "K150.00", false), new("0.25", "25", false), new("0.25", "0.52 mol/dm^3", false),
        new("2", "n = 20 mol", false), new("10", "F = 100 N", false), new("6.02*10^23", "6.02 x 10^22", false), new("sqrt(2)", "2", false),
        new("-8", "8", false), new("7", "17", false), new("1/3", "3", false), new("x/2", "2x", false),
    ];

    public const string Page =
        "Mitochondria are the site of aerobic respiration, where most of the cell's ATP is produced. " +
        "A mitochondrion has a double membrane; the inner membrane is folded into cristae, which increase the surface area for respiration. " +
        "Cells that need a lot of energy, such as muscle cells, contain many mitochondria.\n\n" +
        "Ribosomes are the site of protein synthesis. They are found free in the cytoplasm or attached to the rough endoplasmic reticulum. " +
        "The rough endoplasmic reticulum transports proteins made by its ribosomes. The smooth endoplasmic reticulum makes lipids and has no ribosomes.\n\n" +
        "The Golgi apparatus modifies, sorts and packages proteins into vesicles for transport out of the cell. " +
        "Lysosomes contain digestive enzymes that break down worn-out organelles and foreign material.";

    public record QuoteCase(string Quote, bool OnPage);

    public static readonly List<QuoteCase> Quotes =
    [
        // on the page, sometimes as a photo reader would return it
        new("Mitochondria are the site of aerobic respiration, where most of the cell's ATP is produced.", true),
        new("mitochondria are the site of aerobic respiration where most of the cells ATP is produced", true),
        new("A mitochondrion has a double membrane; the inner membrane is folded into cristae", true),
        new("the inner membrane is folded in cristae, which increase the surface area for respiration", true),
        new("Cells that need a lot of energy, such as muscle cells, contain many mitochondria.", true),
        new("Ribosomes are the site of protein synthesis.", true),
        new("They are found free in the cytoplasm or attached to the rough endoplasmic reticulum", true),
        new("The rough endoplasmic   reticulum transports proteins made by its ribosomes.", true),
        new("The smooth endoplasmic reticulum makes lipids and has no ribosomes", true),
        new("The Golgi apparatus modifies, sorts and packages proteins into vesicles for transport out of the cell.", true),
        new("the golgi apparatus modifies sorts and packages proteins into vesicles", true),
        new("Lysosomes contain digestive enzymes that break down worn-out organelles and foreign material.", true),
        new("Lysosomes contain digestive enzymes that break down worn out organelles", true),
        new("increase the surface area for respiration. Cells that need a lot of energy", true),
        new("where most of the cell's ATP is produced. A mitochondrion has a double membrane", true),
        // from other notes on the same subject: true statements, but not on this page
        new("Chloroplasts are the site of photosynthesis and contain the green pigment chlorophyll.", false),
        new("The nucleus contains the cell's DNA and controls the activities of the cell.", false),
        new("Mitochondria contain their own DNA and are thought to have evolved from bacteria.", false),
        new("Ribosomes are made of ribosomal RNA and protein and have two subunits.", false),
        new("The cell membrane is a phospholipid bilayer that controls what enters and leaves the cell.", false),
        new("Aerobic respiration produces about 36 molecules of ATP from one molecule of glucose.", false),
        new("The Golgi apparatus was discovered by Camillo Golgi in 1898.", false),
        new("Lysosomes are formed by the Golgi apparatus and have an acidic interior.", false),
        new("The rough endoplasmic reticulum is continuous with the nuclear envelope.", false),
        new("Osmosis is the diffusion of water across a selectively permeable membrane.", false),
        new("Muscle cells contain the proteins actin and myosin, which slide past each other.", false),
        new("The inner membrane of the mitochondrion contains the electron transport chain.", false),
        new("Proteins are made of amino acids joined by peptide bonds.", false),
        new("Vesicles fuse with the cell membrane to release their contents by exocytosis.", false),
        new("The smooth endoplasmic reticulum also detoxifies drugs in liver cells.", false),
    ];

    public record AnswerCase(string Prompt, SchemePoint[] Scheme, string Answer, int Human);

    private static readonly SchemePoint[] CellTypes =
        [new("Prokaryotic cells have no nucleus.", 1), new("Eukaryotic cells have a true nucleus enclosed by a nuclear envelope.", 1)];
    private static readonly SchemePoint[] Structure =
        [new("It has a double membrane.", 1), new("The inner membrane is folded into cristae.", 1), new("The cristae increase the surface area for respiration.", 2)];
    private static readonly SchemePoint[] Muscle =
        [new("Muscle cells need a lot of energy.", 1), new("Mitochondria are the site of aerobic respiration.", 1), new("Respiration produces ATP.", 1)];
    private static readonly SchemePoint[] Osmosis =
        [new("It is the diffusion (movement) of water across a selectively permeable membrane.", 1), new("From a dilute solution to a more concentrated solution.", 1)];
    private static readonly SchemePoint[] Plant = [new("A cell wall.", 1), new("Chloroplasts.", 1), new("A large permanent vacuole.", 1)];
    private static readonly SchemePoint[] Transport =
    [
        new("Diffusion moves particles from a higher concentration to a lower concentration.", 2),
        new("Active transport moves substances against their concentration gradient.", 2),
        new("Active transport requires energy from ATP; diffusion does not.", 2),
    ];

    private const string Q1 = "State two differences between prokaryotic and eukaryotic cells.";
    private const string Q2 = "Describe the structure of a mitochondrion.";
    private const string Q3 = "Explain why muscle cells contain many mitochondria.";
    private const string Q4 = "Define the term osmosis.";
    private const string Q5 = "State three structures found in plant cells but not in animal cells.";
    private const string Q6 = "Compare diffusion and active transport.";

    public static readonly List<AnswerCase> Answers =
    [
        new(Q1, CellTypes, "Prokaryotes do not have a nucleus but eukaryotes have a nucleus surrounded by a nuclear envelope.", 2),
        new(Q1, CellTypes, "Prokaryotic cells lack a nucleus.", 1),
        new(Q1, CellTypes, "Eukaryotes are bigger and prokaryotes are smaller.", 0),
        new(Q1, CellTypes, "Bacteria have no nucleus, while plant and animal cells have a true nucleus inside a nuclear membrane.", 2),
        new(Q2, Structure, "It has two membranes. The inner one is folded to form cristae which give a large surface area for respiration.", 4),
        new(Q2, Structure, "It has a double membrane.", 1),
        new(Q2, Structure, "It is the powerhouse of the cell and makes energy.", 0),
        new(Q2, Structure, "A double membrane, with the inner membrane folded into cristae.", 2),
        new(Q3, Muscle, "Muscles need lots of energy to contract. Mitochondria carry out aerobic respiration which makes ATP.", 3),
        new(Q3, Muscle, "Because muscle cells need a lot of energy.", 1),
        new(Q3, Muscle, "Because they are big cells.", 0),
        new(Q3, Muscle, "Mitochondria are where aerobic respiration happens and muscles use much energy.", 2),
        new(Q4, Osmosis, "The movement of water molecules through a partially permeable membrane from a dilute solution to a concentrated one.", 2),
        new(Q4, Osmosis, "Water moving across a selectively permeable membrane.", 1),
        new(Q4, Osmosis, "Movement of particles from high concentration to low concentration.", 0),
        new(Q4, Osmosis, "Diffusion of water from a dilute solution into a more concentrated solution across a selectively permeable membrane.", 2),
        new(Q5, Plant, "Cell wall, chloroplasts and a large permanent vacuole.", 3),
        new(Q5, Plant, "Cell wall and chloroplast.", 2),
        new(Q5, Plant, "Nucleus, mitochondria and ribosomes.", 0),
        new(Q5, Plant, "A cellulose cell wall, a big vacuole, and the nucleus.", 2),
        new(Q6, Transport, "Diffusion moves particles from a high concentration to a low concentration without energy. Active transport moves substances against the concentration gradient and needs energy from ATP.", 6),
        new(Q6, Transport, "Active transport needs energy but diffusion does not.", 2),
        new(Q6, Transport, "Diffusion is from high to low concentration. Active transport is from low to high concentration.", 4),
        new(Q6, Transport, "They both move things in and out of cells.", 0),
    ];

    public static readonly List<(string Title, string Text)> Notes =
    [
        ("Cell organelles", Page + "\n\n" +
            "Plant cells have three structures that animal cells lack: a cell wall, chloroplasts and a large permanent vacuole. " +
            "The cell wall is made of cellulose and gives the plant cell its shape and strength. Chloroplasts are the site of photosynthesis and contain the green pigment chlorophyll."),
        ("Acids and the mole",
            "An acid is a substance that donates a proton (H+) to another substance. A base is a substance that accepts a proton. This is the Bronsted-Lowry definition.\n\n" +
            "A strong acid ionises completely in water. Hydrochloric acid, HCl, is a strong acid. A weak acid only partly ionises in water. Ethanoic acid, CH3COOH, is a weak acid.\n\n" +
            "The number of moles is found from n = m / M, where m is the mass in grams and M is the molar mass in g/mol. " +
            "Worked example. Calculate the number of moles in 36 g of water, H2O. The molar mass of water is 18 g/mol, so n = 36 / 18 = 2 mol.\n\n" +
            "Concentration is the number of moles of solute per cubic decimetre of solution: c = n / V, with V in dm^3. " +
            "Worked example. 0.5 mol of sodium hydroxide is dissolved to make 2 dm^3 of solution. The concentration is c = 0.5 / 2 = 0.25 mol/dm^3."),
        ("Quadratics and differentiation",
            "A quadratic equation has the form ax^2 + bx + c = 0, where a is not zero. It can be solved by factorising, by completing the square, or with the quadratic formula.\n\n" +
            "Worked example 1. Solve x^2 - 5x + 6 = 0. Factorising gives (x - 2)(x - 3) = 0, so x = 2 or x = 3.\n\n" +
            "The discriminant is b^2 - 4ac. If the discriminant is positive the equation has two real roots; if it is zero the roots are equal; if it is negative there are no real roots.\n\n" +
            "The derivative of x^n with respect to x is n x^(n-1). This is called the power rule. The derivative of a constant is zero.\n\n" +
            "Worked example 2. Differentiate y = 3x^2 + 4x - 7. Using the power rule on each term, dy/dx = 6x + 4.\n\n" +
            "Worked example 3. Find the gradient of y = x^3 at x = 2. dy/dx = 3x^2, so at x = 2 the gradient is 12."),
    ];
}

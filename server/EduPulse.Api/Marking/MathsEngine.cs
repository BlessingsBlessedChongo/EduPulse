using System.Globalization;
using System.Text.RegularExpressions;
using AngouriMath;

namespace EduPulse.Api.Marking;

/// <summary>
/// Decides whether two maths answers are the same answer, by calculation.
///
/// "x = 3", "3", "6/2" and "3.0" are all the same; so are "2(x+1)" and "2x + 2".
/// No language model is involved, so a right answer is never marked wrong on a
/// model's bad day. When the engine cannot read what was written it says so
/// instead of guessing.
/// </summary>
public static partial class MathsEngine
{
    public enum Outcome { Same, Different, CannotTell }

    // A few values to try. Chosen to stay clear of zeros and poles of ordinary school expressions.
    private static readonly double[] Samples = [0.37, 1.3, 2.9, -0.71, 4.6, -2.3];

    public static Outcome Compare(string expected, string given)
    {
        var wanted = Parts(expected);
        var offered = Parts(given);
        if (wanted.Count == 0 || offered.Count == 0) return Outcome.CannotTell;

        // Several answers ("x = 2 or x = -3") must match as a set, in any order.
        if (wanted.Count != offered.Count) return Outcome.Different;
        var left = new List<string>(offered);
        var unsure = false;
        foreach (var want in wanted)
        {
            var found = -1;
            for (var i = 0; i < left.Count; i++)
            {
                var result = CompareOne(want, left[i]);
                if (result == Outcome.Same) { found = i; break; }
                if (result == Outcome.CannotTell) unsure = true;
            }
            if (found < 0) return unsure ? Outcome.CannotTell : Outcome.Different;
            left.RemoveAt(found);
        }
        return Outcome.Same;
    }

    /// <summary>True when the text reads as maths the engine understands.</summary>
    public static bool Understands(string text)
    {
        var parts = Parts(text);
        return parts.Count > 0 && parts.All(part => TryParse(part, out _));
    }

    private static Outcome CompareOne(string expected, string given)
    {
        if (!TryParse(expected, out var a) || !TryParse(given, out var b)) return Outcome.CannotTell;

        var names = Names(a).Union(Names(b)).OrderBy(n => n, StringComparer.Ordinal).ToList();
        if (names.Count > 4) return Outcome.CannotTell;

        var compared = 0;
        foreach (var sample in Assignments(names))
        {
            var x = Value(a, names, sample);
            var y = Value(b, names, sample);
            if (x is null || y is null) continue; // outside the expression's domain here; try another point
            compared++;
            var scale = Math.Max(1.0, Math.Max(Math.Abs(x.Value), Math.Abs(y.Value)));
            if (Math.Abs(x.Value - y.Value) > 1e-6 * scale) return Outcome.Different;
        }
        return compared >= (names.Count == 0 ? 1 : 3) ? Outcome.Same : Outcome.CannotTell;
    }

    private static IEnumerable<double[]> Assignments(List<string> names)
    {
        if (names.Count == 0)
        {
            yield return [];
            yield break;
        }
        for (var round = 0; round < Samples.Length; round++)
        {
            var values = new double[names.Count];
            for (var i = 0; i < names.Count; i++) values[i] = Samples[(round + i * 2) % Samples.Length] + i * 0.11;
            yield return values;
        }
    }

    private static double? Value(Entity expression, List<string> names, double[] values)
    {
        try
        {
            var current = expression;
            for (var i = 0; i < names.Count; i++)
            {
                current = current.Substitute(names[i], values[i]);
            }
            var number = current.EvalNumerical();
            var real = (double)number.RealPart;
            var imaginary = (double)number.ImaginaryPart;
            if (double.IsNaN(real) || double.IsInfinity(real) || Math.Abs(imaginary) > 1e-9) return null;
            return real;
        }
        catch (Exception)
        {
            return null;
        }
    }

    private static IEnumerable<string> Names(Entity expression) => expression.Vars.Select(v => v.Name);

    private static bool TryParse(string text, out Entity expression)
    {
        expression = 0;
        // Ordinary words are not maths: "about three" must not be read as letters multiplied together.
        foreach (Match word in Word().Matches(text))
        {
            if (word.Value.Length > 1 && !Known.Contains(word.Value)) return false;
        }
        try
        {
            expression = MathS.FromString(text);
            return true;
        }
        catch (Exception)
        {
            return false;
        }
    }

    /// <summary>
    /// Turns what a person writes into the separate answers it contains, each in
    /// a form the engine reads: "x = 2 or x = -3" becomes ["2", "-3"].
    /// </summary>
    internal static List<string> Parts(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return [];
        var cleaned = Clean(text);
        var pieces = Separator().Split(cleaned).Select(p => p.Trim()).Where(p => p.Length > 0);
        var parts = new List<string>();
        foreach (var piece in pieces)
        {
            // Keep the side after the last "=": "x = 3" is the answer 3.
            var side = piece.Contains('=') ? piece[(piece.LastIndexOf('=') + 1)..].Trim() : piece;
            // A number followed by a unit ("0.25 mol/dm^3", "2 mol") is that number.
            var withUnit = NumberThenUnit().Match(side);
            if (withUnit.Success) side = withUnit.Groups[1].Value;
            if (side.Length > 0) parts.Add(side);
        }
        return parts;
    }

    private static string Clean(string text)
    {
        var s = text.Trim();
        s = s.Replace("\\left", "").Replace("\\right", "").Replace("$", "");
        s = Frac().Replace(s, "(($1)/($2))");
        s = Sqrt().Replace(s, "sqrt($1)");
        s = s.Replace("\\times", "*").Replace("\\cdot", "*").Replace("\\div", "/").Replace("\\pi", "pi");
        s = s.Replace("×", "*").Replace("·", "*").Replace("÷", "/").Replace("−", "-").Replace("–", "-").Replace("π", "pi");
        s = s.Replace("²", "^2").Replace("³", "^3").Replace("√", "sqrt");
        s = s.Replace("{", "(").Replace("}", ")").Replace("\\", "");
        // Standard form: "6.02 x 10^23" is a multiplication, not a variable called x.
        s = StandardForm().Replace(s, "$1*10^");
        // Units and currency are not part of the number: "K1,500.00" and "12 cm".
        s = Thousands().Replace(s, "$1$2");
        s = Currency().Replace(s, "$1");
        s = Units().Replace(s, "$1");
        s = Percent().Replace(s, "($1/100)");
        return s;
    }

    private static readonly HashSet<string> Known = new(StringComparer.OrdinalIgnoreCase)
    {
        "sin", "cos", "tan", "sec", "csc", "cot", "arcsin", "arccos", "arctan", "sinh", "cosh", "tanh", "sqrt", "cbrt", "ln", "log",
        "exp", "abs", "pi", "alpha", "beta", "gamma", "theta", "lambda", "mu", "omega", "phi", "sigma",
    };

    [GeneratedRegex("[A-Za-z]+")]
    private static partial Regex Word();

    [GeneratedRegex(@"(\d)\s*[xX]\s*10\s*\^")]
    private static partial Regex StandardForm();

    [GeneratedRegex(@"^(-?\d+(?:\.\d+)?(?:\*10\^-?\d+)?)\s+[A-Za-z][A-Za-z0-9/^.\-]*$")]
    private static partial Regex NumberThenUnit();

    public static string Show(double value) => value.ToString("0.######", CultureInfo.InvariantCulture);

    [GeneratedRegex(@"\s*(?:,(?!\d{3}\b)|;|\bor\b|\band\b)\s*", RegexOptions.IgnoreCase)]
    private static partial Regex Separator();

    [GeneratedRegex(@"frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}")]
    private static partial Regex Frac();

    [GeneratedRegex(@"\\sqrt\s*\{([^{}]+)\}")]
    private static partial Regex Sqrt();

    [GeneratedRegex(@"(\d),(\d{3})\b")]
    private static partial Regex Thousands();

    [GeneratedRegex(@"\b(?:K|ZMW|USD|\$)\s*(\d)", RegexOptions.IgnoreCase)]
    private static partial Regex Currency();

    [GeneratedRegex(@"(\d)\s*(?:cm|mm|km|kg|ml|m/s|ms|hours?|hrs?|minutes?|mins?|seconds?|secs?|degrees?|°|units?|metres?|meters?|litres?|liters?|grams?)\b\.?", RegexOptions.IgnoreCase)]
    private static partial Regex Units();

    [GeneratedRegex(@"(\d+(?:\.\d+)?)\s*%")]
    private static partial Regex Percent();
}

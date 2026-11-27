# How EduPulse works

A tour of the code in the order a learner's notes travel through it, followed
by the questions an interviewer is likely to ask about a project like this.

## 1. The one idea

A language model is useful and unreliable. EduPulse never passes a model's
answer straight to the learner. Every model call returns a *proposal*, and
plain code decides whether to accept it. Where code can do the whole job (a
maths answer, a multiple-choice answer), no model is called at all.

That is why `IAi.AskAsync` returns a nullable value: every caller has to say
what happens when no model answers.

## 2. Reading a document (`Reading`)

`DocumentReader.ReadAsync` takes the upload and returns pages of text.

- **Pasted text** is cut into page-sized pieces at paragraph breaks.
- **A PDF with real text** is read locally with PdfPig. Words are grouped into
  lines by their position on the page. No model is involved.
- **A scanned PDF or a photo** has no text to take, so it is sent to a model
  that can see, with the instruction to copy and never summarise.

Only the text is kept. `Library.ProcessAsync` clears the uploaded bytes as soon
as the pages are saved.

Reading happens in the background. `LibraryWorker` is a hosted service that
polls the `document` table for rows marked `Queued`. The table is the queue, so
a restart loses nothing: on start-up, anything left as `Reading` is put back.

## 3. Learning the exam's style (`Questions/Style.cs`)

A past paper is not turned into questions. `StyleLearner` reads it to learn how
this exam asks:

- **By rules, always:** the marks in brackets, the instruction words ("state",
  "explain", "derive"), and the mix of multiple choice, written and calculation
  questions.
- **By a model, when available:** one or two sentences on the layout, and up to
  five questions copied word for word as models of the wording. Each copied
  question is checked against the paper, so the model cannot invent one.

The style is stored as JSON on the course. A second paper blends into it.

## 4. Writing questions (`Questions/QuestionMaker.cs`)

Pages are sent three at a time with the course's style and the topics already
in use. The model answers with JSON: topic, kind, prompt, options, answer,
marking scheme, marks, page, and `quote`, the sentence the answer rests on.

`QuestionMaker.Check` then decides, for each proposed question:

1. **Is the quote on the page?** `Words.AppearsOn` flattens both texts to plain
   words and looks for the quote. Because reading a photo changes spacing and
   the odd word, it accepts a quote when at least 90% of its words appear close
   together and in order. If the quote is not on the named page or a
   neighbouring one, the question is refused and counted.
2. **Is it well formed?** A multiple-choice answer must be one of the options.
   A maths answer must be something the engine can read. The scheme's marks
   must add up.
3. **For maths, does a second working agree?** `ConfirmMaths` sends only the
   problem statements to the model again and compares its final answers with
   the first ones, by calculation. A sum whose two workings disagree is dropped.

If no model answers at all, `RuleQuestions` makes fill-in-the-blank questions
from defining sentences, so a learner is never left with nothing.

The counts of proposed and refused questions are stored on the document and
shown to the learner.

## 5. The maths engine (`Marking/MathsEngine.cs`)

`MathsEngine.Compare(expected, given)` answers Same, Different or CannotTell.

- **Cleaning:** LaTeX fractions, `×`, `²`, currency, thousands separators,
  percentages and units are normalised. "x = 3" becomes "3".
- **Several answers:** "x = 2 or x = -3" becomes a set, matched in any order.
- **Comparing:** both sides are parsed with AngouriMath and evaluated at
  several values of their variables. If they agree to within a small tolerance
  everywhere, they are the same expression. This is how `2(x+1)` equals
  `2x + 2` without symbolic simplification having to succeed.
- **Refusing to guess:** ordinary words are rejected before parsing, so "about
  three" is not read as letters multiplied together.

## 6. Marking (`Marking/Marker.cs`)

| Kind of answer | Method | Model involved |
|---|---|---|
| Multiple choice, fill-in | Exact comparison | No |
| Maths, final answer only | The engine | No |
| Maths with working, typed or in a photo | A model reads it and judges each scheme point; the engine judges the final answer | Yes, for the method only |
| Written | A model decides each scheme point | Yes |
| Written, no model available | A point is awarded when 60% of its meaningful words are in the answer | No |

Two rules bound the model on maths:

- If the engine says the final answer is right, the working gets full marks.
- If the engine says it is wrong, the answer cannot earn full marks, even if
  the model awarded every step.

Every verdict records what decided it (`exact`, `engine`, `ai`, `rules`), and
the screen says so.

### Challenging a mark

A learner who thinks a mark is wrong cannot change it themselves. They say what
they think was marked wrongly, and may attach a clearer photo of the same
working. `Marker.ReviewAsync` then decides:

- Exact-answer questions and maths final answers were settled by comparison or
  calculation, so the review explains the result and no model is asked.
- Everything else goes to a model briefed as a second examiner: look again at
  the original answer, point by point; a claim is not evidence; a photo of
  different working is a new answer. It must reply with its reasons.
- Code then bounds the model again: a review never lowers a mark, a wrong maths
  final answer still cannot reach full marks, and each answer is reviewed once.

## 7. The schedule and the pulse (`Study`)

`Scheduler.Apply` moves a question's next date: 1 day, 3 days, then about 2.2
times longer each time, to a ceiling of 60. A wrong answer resets it to
tomorrow and counts a lapse.

`Scheduler.Strength` estimates the chance of a right answer today: the last
score, halving every two intervals of neglect. `Pulse` averages that over every
question in a topic, counting untried questions as zero.

`GET /api/today` returns what is due, topped up with at most six new questions,
drawn first from the course whose exam is nearest.

## 8. Accounts (`Auth`)

Passwords are hashed with PBKDF2. Sign-in is a JWT in an HttpOnly cookie. The
token carries a version number that is compared with the learner's row on every
request, so changing the password ends every older sign-in. A middleware
refuses any changing request whose `Origin` is another site.

## 9. The data (`Data`)

`AppDb` maps the tables; it does not create them. `Migrator` runs the SQL files
in `Data/Migrations` once each at start-up, under an advisory lock, and records
them in `schema_history`. Every table that belongs to a learner cascades from
`learner`, so deleting an account is one delete.

## 10. The tests

`TestApp` starts the whole service in memory against a real PostgreSQL and
replaces `IAi` with `FakeAi`, where each test states what the "model" answers.
That makes it possible to test the interesting cases directly: a model that
invents a source, one that gets its own sum wrong, one that is too generous
with handwriting.

---

## Questions you should expect

**How do you stop the model inventing questions?**
Each question must quote its source sentence, and code searches for that quote
on the learner's page. No match, no question. See `Words.AppearsOn`. The check
is fuzzy on purpose, because text read from a photo is never character-perfect.

**Why not ask the model whether the question is grounded?**
That would be asking the thing I do not trust to vouch for itself. A string
search cannot be talked round.

**How do you know a maths answer is right?**
By evaluating both expressions at several points and comparing the numbers. It
does not depend on a model, and it does not depend on symbolic simplification
finding the same form.

**Could two different expressions agree at your sample points by chance?**
In principle, for specially constructed expressions. For school and first-year
answers, six real-valued points make it vanishingly unlikely, and the test set
has 36 wrong answers with none accepted.

**What if the model reads the handwriting wrongly?**
The working is shown back as it was read, with unsure lines underlined, and the
learner can challenge the mark with a clearer photo, which a second examiner
compares with the first reading. A misread cannot silently pass a wrong final
answer, because the engine checks that separately.

**Why a background worker and not marking inside the upload request?**
Reading and writing questions takes 10 to 60 seconds and depends on an outside
service. The upload returns at once and the screen polls. Because the queue is
a table, nothing is lost on restart.

**Why store the style as JSON?**
It is read and written as a whole, never queried by its parts, and its shape
will change as more is learned from papers.

**What happens when the free AI allowance runs out?**
A model that fails is rested for two minutes and the next one is tried. With
none, questions fall back to fill-in-the-blank and written answers are marked
by word matching, clearly labelled.

**How would you measure whether it works?**
`EduPulse.Evals` measures the checks: the engine, the source check, and
agreement between automatic marks and mine. Whether it improves exam results
needs real learners over a term, and I have not measured that.

**What is the weakest part?**
Reading handwriting. It is tested by hand on clear samples only, and it is the
one place where a model's error reaches the learner, softened by showing what
was read and by letting them challenge the mark.

**What would you build next?**
Timed mock papers in the learned layout, a labelled set of real handwriting to
measure the reader, and password reset by email.

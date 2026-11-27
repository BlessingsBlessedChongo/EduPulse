# What has been measured

Produced by `dotnet run --project server/EduPulse.Evals` on 27 November 2026.
Models: gemini-3.8-flash, gemini-3.5-flash, gemini-3.5-flash-lite; then openai/gpt-oss-20b.

These are small test sets written and labelled by the project's author. They show how the checks behave; they are not a claim about every subject or every handwriting.

## 1. Maths final answers, checked by calculation

72 pairs of an expected answer and a learner's answer, half the same answer written differently and half a different answer. No model is involved.

| | Result |
|---|---|
| Judged correctly | 72 of 72 (100%) |
| Wrong answers accepted as right | 0 |


## 2. Is the quoted sentence really on the learner's page?

30 quotes checked against one page of notes: half taken from the page (some with the spacing, punctuation or one word changed, as reading a photo does), half taken from other notes on the same subject.

| | Result |
|---|---|
| Judged correctly | 30 of 30 (100%) |
| Quotes from elsewhere accepted | 0 |

## 3. Written answers, marked against a scheme

24 answers to six biology questions, from full-mark answers to wrong ones, each given a mark by the author first. The table shows how often the automatic mark agreed.

| | Marked by AI | Marked by rules (no AI) |
|---|---|---|
| Same mark as the author | 21 of 21 (100%) | 17 of 24 (71%) |
| Within one mark | 21 of 21 (100%) | 22 of 24 (92%) |
| Average distance from the author's mark | 0.00 marks | 0.46 marks |
| More generous than the author | 0 | |
| Harsher than the author | 0 | |

The model gave no answer for 3 of the 24; those are not counted on the AI side.

## 4. Writing questions from notes

3 short sets of notes (biology, chemistry, mathematics) were given to the question writer.

| | Count |
|---|---|
| Questions the model proposed | 13 |
| Refused: the quoted source was not on the page | 0 |
| Refused: badly formed, or a maths answer a second working did not confirm | 0 |
| Kept | 13 (100%) |
| Of those kept, calculations confirmed by a second working | 1 |

## What has not been measured

- How accurately handwriting is read from a photo. It was tried by hand on a few clear samples only.
- Subjects beyond the three above, and long documents.
- Whether daily use improves exam results. That would need real learners over a term.

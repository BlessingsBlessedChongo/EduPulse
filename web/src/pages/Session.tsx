import { ArrowRight, Camera, CircleCheck, CircleMinus, CircleX, FileText, Frown, Gavel, PartyPopper, RotateCcw, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, type Marked, type Question, type SourcePage, type Today, type Verdict } from '../api';
import { useAccount } from '../App';
import { Confetti, Doodles, Loading, Maths, Modal, Notice, Ring, whenDue } from '../ui';

/** One question at a time: answer, see the marking and its reasons, move on. */
export function Session() {
  const { about } = useAccount();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const course = params.get('course');
  const topic = params.get('topic');

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [photosLeft, setPhotosLeft] = useState(0);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState('');
  const [earned, setEarned] = useState(0);
  const [possible, setPossible] = useState(0);

  useEffect(() => {
    const path = course ? `/api/courses/${course}/practice${topic ? `?topicId=${topic}` : ''}` : '/api/today';
    api.get<Today>(path)
      .then((data) => {
        setQuestions(data.questions);
        setPhotosLeft(data.photosLeft);
      })
      .catch((failed: Error) => setError(failed.message));
  }, [course, topic]);

  if (error) return <div className="session"><Notice>{error}</Notice></div>;
  if (!questions) return <Loading />;

  const back = course ? `/courses/${course}` : '/today';

  if (questions.length === 0) {
    return (
      <div className="session finish">
        <Doodles count={6} />
        <h1>Nothing to practise here yet.</h1>
        <p className="muted">Add notes to a course and questions will appear.</p>
        <Link className="button" to={back} style={{ justifySelf: 'center' }}>Go back</Link>
      </div>
    );
  }

  if (index >= questions.length) {
    const share = possible === 0 ? 0 : Math.round((earned / possible) * 100);
    return (
      <div className="session finish">
        <div className="glow" aria-hidden="true" />
        {share >= 80 && <Confetti />}
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }}>
          <Ring percent={share} size={190} stroke={16} label="this session" />
        </motion.div>
        <h1>{share >= 80 ? 'You smashed it.' : share >= 50 ? 'Solid work.' : 'That is how it sticks.'}</h1>
        <p className="muted">
          {earned} of {possible} marks across {questions.length} {questions.length === 1 ? 'question' : 'questions'}.
          {share < 50 ? ' The ones you missed come back tomorrow.' : ' Everything is booked to come back at the right time.'}
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="button" onClick={() => navigate(back)}>Done</button>
          <Link className="button button-quiet" to="/pulse">See your pulse</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="session">
      <div className="glow" aria-hidden="true" />
      <div className="session-top">
        <button className="icon-button" onClick={() => navigate(back)} aria-label="Leave this session">
          <X aria-hidden />
        </button>
        <div className="meter" role="img" aria-label={`Question ${index + 1} of ${questions.length}`}>
          <span style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
        <span className="mono muted">{index + 1}/{questions.length}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={questions[index].id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
      <QuestionCard
        question={questions[index]}
        canPhoto={Boolean(about?.photos)}
        photosLeft={photosLeft}
        onMarked={(marked) => setPhotosLeft(marked.photosLeft)}
        onNext={(score, max) => {
          setEarned((value) => value + score);
          setPossible((value) => value + max);
          setIndex((value) => value + 1);
          window.scrollTo({ top: 0 });
        }}
        last={index === questions.length - 1}
      />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function QuestionCard({ question, canPhoto, photosLeft, onMarked, onNext, last }: {
  question: Question;
  canPhoto: boolean;
  photosLeft: number;
  onMarked: (marked: Marked) => void;
  onNext: (score: number, max: number) => void;
  last: boolean;
}) {
  const [response, setResponse] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [marked, setMarked] = useState<Marked | null>(null);
  const [slow, setSlow] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  // If marking drags on, say so instead of leaving the learner guessing.
  useEffect(() => {
    if (!busy) {
      setSlow(false);
      return;
    }
    const timer = window.setTimeout(() => setSlow(true), 12000);
    return () => window.clearTimeout(timer);
  }, [busy]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const send = async (answer: string, file: File | null) => {
    setBusy(true);
    setError('');
    const form = new FormData();
    form.append('response', answer);
    if (file) form.append('photo', file);
    try {
      const result = await api.post<Marked>(`/api/questions/${question.id}/answer`, form);
      setMarked(result);
      onMarked(result);
    } catch (failed) {
      setError((failed as Error).message);
    }
    setBusy(false);
  };

  const choosePhoto = (file: File | undefined) => {
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const worded = question.kind === 'Short' || question.kind === 'Maths';
  const ready = photo !== null || response.trim().length > 0;

  return (
    <div className="question">
      <div className="row">
        <span className="chip chip-brand">{question.course}</span>
        <span className="chip">{question.topic}</span>
        <span className="chip">{question.marks} {question.marks === 1 ? 'mark' : 'marks'}</span>
        {question.isNew && <span className="chip chip-part">New</span>}
      </div>
      <p className="question-prompt"><Maths text={question.prompt} /></p>

      {!marked && (
        <>
          {question.kind === 'Choice' ? (
            <div className="options">
              {question.options.map((option, i) => (
                <button key={option} type="button" className="option" aria-pressed={response === option} onClick={() => setResponse(option)}>
                  <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                  <span><Maths text={option} /></span>
                </button>
              ))}
            </div>
          ) : (
            <div className="field">
              <label htmlFor="answer" className="sr-only">Your answer</label>
              {question.kind === 'Blank' ? (
                <input id="answer" className="input" value={response} onChange={(e) => setResponse(e.target.value)} placeholder="The missing word" autoComplete="off" />
              ) : (
                <textarea id="answer" className={`textarea ${question.kind === 'Maths' ? 'input-maths' : ''}`} value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder={question.kind === 'Maths' ? 'Type your final answer, for example x = 3\nor your working, one step per line' : 'Write your answer'} />
              )}
              {question.kind === 'Maths' && <span className="hint">A final answer on its own is checked by calculation. Show working to earn method marks.</span>}
            </div>
          )}

          {worded && canPhoto && (
            <div className="photo-drop">
              {preview ? <img src={preview} alt="Your photo" /> : <Camera aria-hidden style={{ color: 'var(--muted)' }} />}
              <div className="grow">
                <b className="small">{photo ? photo.name : 'Solved it on paper?'}</b>
                <p className="muted small">
                  {photosLeft > 0 ? `Take a clear photo of your working. ${photosLeft} photo markings left today.` : 'You have used today\'s photo markings. Type your answer.'}
                </p>
              </div>
              <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={(e) => choosePhoto(e.target.files?.[0])} />
              {photo
                ? <button type="button" className="button button-quiet button-small" onClick={() => { setPhoto(null); setPreview(''); }}>Remove</button>
                : <button type="button" className="button button-quiet button-small" disabled={photosLeft <= 0} onClick={() => picker.current?.click()}>Add photo</button>}
            </div>
          )}

          {error && <Notice>{error}</Notice>}
          {busy && <div className="reading-bar" />}
          {slow && <Notice tone="info">The AI service is slow right now. Hang on, or type your final answer instead for an instant check.</Notice>}
          <div className="row">
            <button className="button grow" disabled={!ready || busy} onClick={() => send(response, photo)}>
              {busy ? (photo ? 'Reading your working...' : 'Marking...') : 'Check my answer'}
            </button>
            <button className="button button-quiet" disabled={busy} onClick={() => { setSkipped(true); send('?', null); }}>I don't know</button>
          </div>
        </>
      )}

      {marked && (
        <Feedback question={question} marked={marked} onNext={onNext} last={last} canPhoto={canPhoto} skipped={skipped}
          onRetry={() => { setMarked(null); setError(''); setPhoto(null); setPreview(''); setSkipped(false); }} />
      )}
    </div>
  );
}

function Feedback({ question, marked, onNext, last, canPhoto, skipped, onRetry }: {
  question: Question;
  marked: Marked;
  onNext: (score: number, max: number) => void;
  last: boolean;
  canPhoto: boolean;
  skipped: boolean;
  onRetry: () => void;
}) {
  const [verdict, setVerdict] = useState<Verdict>(marked.verdict);
  const [nextDue, setNextDue] = useState(marked.nextDue);
  const [challenging, setChallenging] = useState(false);
  const [page, setPage] = useState<SourcePage | null>(null);
  const [error, setError] = useState('');
  const score = verdict.score;
  const tone = score === verdict.max ? 'good' : score === 0 ? 'miss' : 'part';
  const unmarked = verdict.markedBy === 'none';
  const review = verdict.review;

  const showPage = async () => {
    try {
      setPage(await api.get<SourcePage>(`/api/documents/${marked.documentId}/pages/${marked.page}`));
    } catch (failed) {
      setError((failed as Error).message);
    }
  };

  const how: Record<string, string> = {
    exact: 'Marked by exact match.',
    engine: 'Final answer checked by calculation.',
    ai: 'Marked by AI against the scheme below.',
    rules: 'Marked by matching your words to the scheme.',
    none: 'Not marked.',
  };

  return (
    <div className="stack">
      <div className={`verdict verdict-${tone}`} role="status">
        {tone === 'good' && <Confetti />}
        <div className="verdict-head">
          <span className="verdict-score">
            {tone === 'good' ? <PartyPopper aria-hidden /> : tone === 'part' ? <Sparkles aria-hidden /> : <Frown aria-hidden />}
            {score} / {verdict.max}
          </span>
          <span className="small">{how[verdict.markedBy]}</span>
        </div>
        <p><Maths text={verdict.summary} /></p>
      </div>

      {review && (
        <div className={`review review-${review.decision}`} role="status">
          <div className="row"><Gavel aria-hidden /><b>{review.decision === 'changed' ? `Reviewed: your mark went from ${review.before} to ${score}` : 'Reviewed: the mark stands'}</b></div>
          <p><Maths text={review.reply} /></p>
          <p className="muted small">You said: "{review.reason}"</p>
        </div>
      )}

      {verdict.read.length > 0 && (
        <div className="stack-small">
          <span className="label">Your working, as it was read</span>
          <div className="working">
            {verdict.read.map((line, i) => (
              <span key={i} className={verdict.unsure.includes(line) ? 'unsure' : ''}><Maths text={line} /></span>
            ))}
          </div>
          {verdict.unsure.length > 0 && <p className="muted small">Underlined lines were hard to read. If one was read wrongly, challenge the marking below with a clearer photo.</p>}
        </div>
      )}

      {question.kind !== 'Choice' && question.kind !== 'Blank' && (
        <div className="stack-small">
          <span className="label">Marking scheme</span>
          <ul className="awards">
            {verdict.awards.map((award, i) => {
              const Icon = award.earned === award.marks ? CircleCheck : award.earned === 0 ? CircleX : CircleMinus;
              const state = award.earned === award.marks ? 'got' : award.earned === 0 ? 'not' : 'some';
              return (
                <li key={i}>
                  <Icon className={state} aria-hidden />
                  <span><Maths text={award.point} />{award.note && <small><Maths text={award.note} /></small>}</span>
                  <span className="marks">{unmarked ? `${award.marks}` : `${award.earned} / ${award.marks}`}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="stack-small">
        <span className="label">Model answer</span>
        <p className={question.kind === 'Maths' ? 'mono' : ''}><Maths text={marked.answer} /></p>
      </div>

      <div className="source stack-small">
        <span className="muted small">From your notes: {marked.document}, page {marked.page}</span>
        <p><span className="quote"><Maths text={marked.quote} /></span></p>
        <button className="button button-plain button-small" style={{ justifySelf: 'start', paddingLeft: 0 }} onClick={showPage}>
          <FileText aria-hidden />Read the page
        </button>
      </div>

      {error && <Notice>{error}</Notice>}

      {unmarked ? (
        <button className="button button-quiet" style={{ justifySelf: 'start' }} onClick={onRetry}><RotateCcw aria-hidden />Try this question again</button>
      ) : !review && !skipped && score < verdict.max ? (
        <button className="button button-plain button-small" style={{ justifySelf: 'start', paddingLeft: 0 }} onClick={() => setChallenging(true)}>
          <Gavel aria-hidden />I think this marking is wrong
        </button>
      ) : null}

      <div className="between">
        <span className="muted small">{nextDue ? `Comes back ${whenDue(nextDue)}.` : ''}</span>
        <button className="button" onClick={() => onNext(score, verdict.max)}>
          {last ? 'Finish' : 'Next question'}
          <ArrowRight aria-hidden />
        </button>
      </div>

      {page && (
        <Modal title={`${page.title}, page ${page.number}`} onClose={() => setPage(null)}>
          <p className="source-page">{highlight(page.text, marked.quote)}</p>
        </Modal>
      )}

      {challenging && (
        <Challenge attemptId={marked.attemptId} canPhoto={canPhoto && (question.kind === 'Short' || question.kind === 'Maths')}
          wasPhoto={verdict.read.length > 0} onClose={() => setChallenging(false)}
          onReviewed={(reviewed, due) => { setVerdict(reviewed); if (due) setNextDue(due); setChallenging(false); }} />
      )}
    </div>
  );
}

/**
 * Asks for a second look at a mark. The learner says what they think was
 * marked wrongly and may add a clearer photo; the marker then answers. The
 * learner cannot set the mark, and each answer is reviewed once.
 */
function Challenge({ attemptId, canPhoto, wasPhoto, onClose, onReviewed }: {
  attemptId: string;
  canPhoto: boolean;
  wasPhoto: boolean;
  onClose: () => void;
  onReviewed: (verdict: Verdict, nextDue: string | null) => void;
}) {
  const [reason, setReason] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const picker = useRef<HTMLInputElement>(null);
  const short = reason.trim().length < 10;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (short) return;
    setBusy(true);
    setError('');
    const form = new FormData();
    form.append('reason', reason);
    if (photo) form.append('photo', photo);
    try {
      const result = await api.post<{ verdict: Verdict; nextDue: string | null }>(`/api/attempts/${attemptId}/dispute`, form);
      onReviewed(result.verdict, result.nextDue);
    } catch (failed) {
      setError((failed as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal title="Challenge this marking" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <p className="muted">
          Say what you think was marked wrongly. Your answer will be looked at again against the scheme. The mark may go up or stay the same,
          and you will be told why. Each answer can be reviewed once.
        </p>
        {error && <Notice>{error}</Notice>}
        <div className="field">
          <label htmlFor="reason">What was marked wrongly?</label>
          <textarea id="reason" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={800}
            placeholder={wasPhoto ? 'For example: my last line says x = 4, but it was read as x = 5.' : 'For example: I did explain the second point, in my last sentence.'} />
          <span className="hint">Point to what is in your answer. Marks are for what you wrote, so "I knew it" will not change the mark.</span>
        </div>
        {canPhoto && (
          <div className="photo-drop">
            <Camera aria-hidden style={{ color: 'var(--muted)' }} />
            <div className="grow">
              <b className="small">{photo ? photo.name : wasPhoto ? 'Was your handwriting misread?' : 'Have it on paper?'}</b>
              <p className="muted small">Add a clearer photo of the same working. New working is a new answer, and will not change this mark.</p>
            </div>
            <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            {photo
              ? <button type="button" className="button button-quiet button-small" onClick={() => setPhoto(null)}>Remove</button>
              : <button type="button" className="button button-quiet button-small" onClick={() => picker.current?.click()}>Add photo</button>}
          </div>
        )}
        {busy && <div className="reading-bar" />}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="button button-quiet" onClick={onClose} disabled={busy}>Never mind</button>
          <button className="button" disabled={busy || short}>{busy ? 'Reviewing...' : 'Ask for a review'}</button>
        </div>
      </form>
    </Modal>
  );
}

/** Shows the page with the quoted words highlighted, when they can be found exactly. */
function highlight(text: string, quote: string) {
  const at = text.toLowerCase().indexOf(quote.toLowerCase());
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <span className="quote">{text.slice(at, at + quote.length)}</span>
      {text.slice(at + quote.length)}
    </>
  );
}

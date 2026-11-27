import { ArrowLeft, FileQuestion, FileText, Play, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type CourseDetail, type DocumentRow, type Style } from '../api';
import { useAccount } from '../App';
import { Confirm, Loading, Meter, Modal, Notice, Ring, Subject, shortDate, useLoad } from '../ui';

export function Course() {
  const { id } = useParams();
  const navigate = useNavigate();
  const course = useLoad(() => api.get<CourseDetail>(`/api/courses/${id}`), [id]);
  const [adding, setAdding] = useState<'Notes' | 'PastPaper' | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<DocumentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // While a document is being read, look again every few seconds.
  const working = course.data?.documents.some((d) => d.status === 'Queued' || d.status === 'Reading') ?? false;
  useEffect(() => {
    if (!working) return;
    const timer = window.setInterval(course.reload, 4000);
    return () => window.clearInterval(timer);
  }, [working, course.reload]);

  if (course.error) return <Notice>{course.error}</Notice>;
  if (!course.data) return <Loading />;
  const data = course.data;

  const act = async (work: () => Promise<unknown>) => {
    setError('');
    try {
      await work();
      course.reload();
    } catch (failed) {
      setError((failed as Error).message);
    }
  };

  return (
    <div className="stack">
      <Link className="row small muted" to="/courses" style={{ textDecoration: 'none' }}><ArrowLeft aria-hidden size={16} />Courses</Link>

      <div className="card stack rise">
        <div className="between" style={{ alignItems: 'flex-start' }}>
          <div className="stack-small">
            <Subject name={data.name} />
            <h1 style={{ fontSize: '1.8rem' }}>{data.name}</h1>
            <button className="button button-plain button-small" style={{ justifySelf: 'start', paddingLeft: 0 }} onClick={() => setEditing(true)}>
              {data.examDate ? `Exam on ${shortDate(data.examDate)}${data.daysToExam !== null && data.daysToExam >= 0 ? `, in ${data.daysToExam} days` : ''}` : 'Set the exam date'}
            </button>
          </div>
          <Ring percent={data.percent} size={112} stroke={11} label="pulse" />
        </div>
        <p className="muted small">
          {data.questions === 0
            ? 'Add notes to get your first questions.'
            : `You have tried ${data.seen} of ${data.questions} questions. Questions you have not tried count as zero, so this number is honest.`}
        </p>
        {data.questions > 0 && (
          <Link className="button" to={`/practice?course=${data.id}`} style={{ justifySelf: 'start' }}><Play aria-hidden />Practise this course</Link>
        )}
      </div>

      {error && <Notice>{error}</Notice>}

      {data.topics.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Topics</h2>
          {data.topics.map((topic) => (
            <div className="topic" key={topic.topicId}>
              <div className="topic-head"><b>{topic.topic}</b><span>{topic.percent}%</span></div>
              <Meter percent={topic.percent} />
              <div className="between">
                <span className="muted small">{topic.reading}</span>
                <Link className="small" to={`/practice?course=${data.id}&topic=${topic.topicId}`}>Practise</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card stack">
        <div className="between">
          <h2>Your material</h2>
          <div className="row">
            <button className="button button-small" onClick={() => setAdding('Notes')}><Plus aria-hidden />Notes</button>
            <button className="button button-quiet button-small" onClick={() => setAdding('PastPaper')}><Plus aria-hidden />Past paper</button>
          </div>
        </div>
        {data.documents.length === 0 ? (
          <p className="muted">Nothing here yet. Add your notes for questions, and a past paper to teach EduPulse how your exam asks them.</p>
        ) : (
          <div>
            {data.documents.map((document) => (
              <DocumentLine key={document.id} document={document}
                onMore={() => act(() => api.post(`/api/documents/${document.id}/more`))}
                onRemove={() => setRemoving(document)} />
            ))}
          </div>
        )}
      </div>

      <StyleCard style={data.style} onAdd={() => setAdding('PastPaper')} />

      <button className="button button-danger" style={{ justifySelf: 'start' }}
        onClick={() => setDeleting(true)}>
        <Trash2 aria-hidden />Delete this course
      </button>

      {removing && (
        <Confirm title="Remove this document?" action="Remove" onClose={() => setRemoving(null)}
          onConfirm={async () => { const id = removing.id; setRemoving(null); await act(() => api.del(`/api/documents/${id}`)); }}>
          "{removing.title}" will be removed{removing.kind === 'Notes' && removing.questionCount > 0 ? `, along with its ${removing.questionCount} questions and your history on them` : ''}. This cannot be undone.
        </Confirm>
      )}
      {deleting && (
        <Confirm title="Delete this course?" action="Delete course" onClose={() => setDeleting(false)}
          onConfirm={async () => {
            try {
              await api.del(`/api/courses/${data.id}`);
              navigate('/courses');
            } catch (failed) {
              setDeleting(false);
              setError((failed as Error).message);
            }
          }}>
          "{data.name}" will be deleted with all its notes, questions and history. This cannot be undone.
        </Confirm>
      )}
      {adding && <AddMaterial courseId={data.id} kind={adding} onClose={() => setAdding(null)} onAdded={() => { setAdding(null); course.reload(); }} />}
      {editing && <EditCourse course={data} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); course.reload(); }} />}
    </div>
  );
}

function DocumentLine({ document, onMore, onRemove }: { document: DocumentRow; onMore: () => void; onRemove: () => void }) {
  const working = document.status === 'Queued' || document.status === 'Reading';
  const notes = document.kind === 'Notes';
  return (
    <div className="document">
      <div className={`document-icon ${notes ? '' : 'paper'}`}>{notes ? <FileText aria-hidden /> : <FileQuestion aria-hidden />}</div>
      <div className="stack-small" style={{ gap: 4 }}>
        <b>{document.title}</b>
        <div className="row">
          <span className="chip">{notes ? 'Notes' : 'Past paper'}</span>
          {document.pageCount > 0 && <span className="chip">{document.pageCount} {document.pageCount === 1 ? 'page' : 'pages'}</span>}
          {notes && document.questionCount > 0 && <span className="chip chip-good">{document.questionCount} questions</span>}
          {document.status === 'Failed' && <span className="chip chip-miss">Could not be used</span>}
        </div>
        {working ? (
          <span className="stack-small" style={{ gap: 6 }}><span className="small" style={{ color: 'var(--brand)', fontWeight: 700 }}>{document.note}</span><span className="reading-bar" /></span>
        ) : (
          <span className="muted small">
            {document.note}
            {notes && document.notOnPage > 0 && ` ${document.notOnPage} proposed ${document.notOnPage === 1 ? 'question was' : 'questions were'} refused because the source was not on your page.`}
          </span>
        )}
        {notes && document.status === 'Ready' && (
          <button className="button button-plain button-small" style={{ justifySelf: 'start', paddingLeft: 0 }} onClick={onMore}>Write more questions</button>
        )}
      </div>
      <button className="icon-button" onClick={onRemove} aria-label={`Remove ${document.title}`} disabled={working}><Trash2 aria-hidden /></button>
    </div>
  );
}

function StyleCard({ style, onAdd }: { style: Style | null; onAdd: () => void }) {
  if (!style) {
    return (
      <div className="card card-flat stack-small">
        <h2>How your exam asks</h2>
        <p className="muted">Add a past paper and EduPulse will learn its instruction words, marks and mix of question kinds, then write your practice questions the same way.</p>
        <button className="button button-quiet button-small" style={{ justifySelf: 'start' }} onClick={onAdd}><Plus aria-hidden />Add a past paper</button>
      </div>
    );
  }
  const total = style.choice + style.short + style.maths || 1;
  const share = (value: number) => Math.round((value / total) * 100);
  return (
    <div className="card stack">
      <div className="stack-small">
        <h2>How your exam asks</h2>
        <p className="muted small">Learned from {style.papersRead} past {style.papersRead === 1 ? 'paper' : 'papers'}. New questions follow this.</p>
      </div>
      {style.layout && <p>{style.layout}</p>}
      <div className="stack-small">
        <div className="mix" role="img" aria-label={`${share(style.short)} percent written, ${share(style.choice)} percent multiple choice, ${share(style.maths)} percent calculations`}>
          <span style={{ width: `${share(style.short)}%` }} /><span style={{ width: `${share(style.choice)}%` }} /><span style={{ width: `${share(style.maths)}%` }} />
        </div>
        <div className="legend">
          <span><i style={{ background: 'var(--brand)' }} />Written answers {share(style.short)}%</span>
          <span><i style={{ background: 'var(--peach)' }} />Multiple choice {share(style.choice)}%</span>
          <span><i style={{ background: 'var(--sky)' }} />Calculations {share(style.maths)}%</span>
        </div>
      </div>
      {style.commandWords.length > 0 && (
        <div className="stack-small">
          <span className="label">Instruction words it uses</span>
          <div className="row">{style.commandWords.map((word) => <span className="chip chip-brand" key={word}>{word}</span>)}</div>
        </div>
      )}
      {style.usualMarks.length > 0 && (
        <div className="stack-small">
          <span className="label">Usual marks per question</span>
          <div className="row">{[...style.usualMarks].sort((a, b) => a - b).map((marks) => <span className="chip" key={marks}>{marks}</span>)}</div>
        </div>
      )}
      {style.examples.length > 0 && (
        <div className="stack-small">
          <span className="label">Questions it has asked</span>
          {style.examples.slice(0, 3).map((example) => <p className="muted small" key={example}>"{example}"</p>)}
        </div>
      )}
    </div>
  );
}

function AddMaterial({ courseId, kind, onClose, onAdded }: { courseId: string; kind: 'Notes' | 'PastPaper'; onClose: () => void; onAdded: () => void }) {
  const { about } = useAccount();
  const [way, setWay] = useState<'file' | 'text'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const notes = kind === 'Notes';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData();
    form.append('kind', kind);
    form.append('title', title);
    if (way === 'file' && file) form.append('file', file);
    if (way === 'text') form.append('text', text);
    try {
      await api.post(`/api/courses/${courseId}/documents`, form);
      onAdded();
    } catch (failed) {
      setError((failed as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal title={notes ? 'Add notes' : 'Add a past paper'} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <p className="muted">
          {notes
            ? 'Questions are written only from what is on these pages.'
            : 'A past paper is not turned into questions. It teaches EduPulse how your exam words and weights them.'}
        </p>
        {error && <Notice>{error}</Notice>}
        <div className="segmented">
          <button type="button" aria-pressed={way === 'file'} onClick={() => setWay('file')}>A file or photo</button>
          <button type="button" aria-pressed={way === 'text'} onClick={() => setWay('text')}>Paste text</button>
        </div>
        {way === 'file' ? (
          <div className="field">
            <input ref={picker} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button type="button" className="button button-quiet" onClick={() => picker.current?.click()}>{file ? file.name : 'Choose a PDF or photo'}</button>
            <span className="hint">
              Up to 10 MB and {about?.maxPages ?? 30} pages.
              {about?.photos ? ' Photos of handwriting and scanned pages are read by AI.' : ' Photos and scans cannot be read on this server; use a PDF with selectable text or paste the text.'}
            </span>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="pasted">Your text</label>
            <textarea id="pasted" className="textarea" style={{ minHeight: 180 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste at least a paragraph" />
          </div>
        )}
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={notes ? 'For example, Lecture 4: Cells' : 'For example, Test 1, 2025'} />
          <span className="hint">Optional. The file name is used if you leave it empty.</span>
        </div>
        <button className="button" disabled={busy || (way === 'file' ? !file : text.trim().length < 80)}>{busy ? 'Uploading...' : notes ? 'Add notes' : 'Add past paper'}</button>
      </form>
    </Modal>
  );
}

function EditCourse({ course, onClose, onSaved }: { course: CourseDetail; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(course.name);
  const [examDate, setExamDate] = useState(course.examDate ?? '');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api.patch(`/api/courses/${course.id}`, { name, examDate: examDate || null, clearExamDate: !examDate });
      onSaved();
    } catch (failed) {
      setError((failed as Error).message);
    }
  };

  return (
    <Modal title="Course details" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        {error && <Notice>{error}</Notice>}
        <div className="field">
          <label htmlFor="edit-name">Course name</label>
          <input id="edit-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="edit-date">Exam date</label>
          <input id="edit-date" className="input" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </div>
        <button className="button">Save</button>
      </form>
    </Modal>
  );
}

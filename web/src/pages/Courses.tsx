import { BookPlus, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type CourseCard } from '../api';
import { Loading, Meter, Modal, Notice, Subject, useLoad } from '../ui';

export function Courses() {
  const courses = useLoad(() => api.get<CourseCard[]>('/api/courses'));
  const [adding, setAdding] = useState(false);

  if (courses.error) return <Notice>{courses.error}</Notice>;
  if (!courses.data) return <Loading />;

  return (
    <div className="stack">
      <div className="between">
        <h1>Your courses</h1>
        {courses.data.length > 0 && (
          <button className="button button-small" onClick={() => setAdding(true)}><Plus aria-hidden />Add</button>
        )}
      </div>

      {courses.data.length === 0 ? (
        <div className="card empty stack">
          <BookPlus aria-hidden style={{ margin: '0 auto' }} />
          <h2>No courses yet</h2>
          <p className="muted">A course is one subject, such as "Organic Chemistry" or "MA 110". Each keeps its own notes, question style and pulse.</p>
          <button className="button" style={{ justifySelf: 'center' }} onClick={() => setAdding(true)}>Add your first course</button>
        </div>
      ) : (
        <div className="course-grid">
          {courses.data.map((course) => (
            <Link key={course.id} className="card card-link course-card rise" to={`/courses/${course.id}`}>
              <div className="course-head">
                <Subject name={course.name} />
                <h2 className="grow" style={{ fontSize: '1.2rem' }}>{course.name}</h2>
                <span className="percent" style={{ fontSize: '1.7rem' }}>{course.percent}<small>%</small></span>
              </div>
              <Meter percent={course.percent} />
              <div className="row">
                <span className="chip">{course.questions} {course.questions === 1 ? 'question' : 'questions'}</span>
                {course.due > 0 && <span className="chip chip-part">{course.due} due</span>}
                {course.working > 0 && <span className="chip chip-brand">Reading {course.working}...</span>}
                {course.daysToExam !== null && course.daysToExam >= 0 && (
                  <span className="chip chip-brand">Exam in {course.daysToExam} {course.daysToExam === 1 ? 'day' : 'days'}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {adding && <AddCourse onClose={() => setAdding(false)} />}
    </div>
  );
}

function AddCourse({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const created = await api.post<{ id: string }>('/api/courses', { name, examDate: examDate || null });
      navigate(`/courses/${created.id}`);
    } catch (failed) {
      setError((failed as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal title="Add a course" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        {error && <Notice>{error}</Notice>}
        <div className="field">
          <label htmlFor="course-name">Course name</label>
          <input id="course-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="For example, BIO 110 Cell Biology" required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="exam-date">Exam date</label>
          <input id="exam-date" className="input" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          <span className="hint">Leave empty if you do not know yet. The nearest exam gets new questions first.</span>
        </div>
        <button className="button" disabled={busy}>{busy ? 'Adding...' : 'Add course'}</button>
      </form>
    </Modal>
  );
}

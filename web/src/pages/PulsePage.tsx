import { Link } from 'react-router-dom';
import { api, type PulseView } from '../api';
import { Loading, Meter, Notice, PulseLine, Ring, Subject, useLoad } from '../ui';

export function PulsePage() {
  const pulse = useLoad(() => api.get<PulseView>('/api/pulse'));
  if (pulse.error) return <Notice>{pulse.error}</Notice>;
  if (!pulse.data) return <Loading />;
  const data = pulse.data;

  return (
    <div className="stack">
      <h1>Your pulse</h1>

      <div className="card stack rise">
        <div className="pulse-row">
          <Ring percent={data.percent} size={150} stroke={14} />
          <p className="grow" style={{ fontSize: '1.12rem' }}>That is how much of everything in your courses you would likely get right <b>today</b>.</p>
        </div>
        <PulseLine days={data.days} />
        <p className="muted small">
          You have tried {data.seen} of {data.questions} questions. {data.dueToday > 0 ? `${data.dueToday} are due for revision.` : 'Nothing is overdue.'}
          {' '}Questions you have not tried count as zero, and what you leave too long fades.
        </p>
      </div>

      {data.courses.length === 0 && (
        <div className="card empty stack-small">
          <h2>Nothing to measure yet</h2>
          <p className="muted">Add a course and some notes, answer a few questions, and your pulse will appear here.</p>
          <Link className="button" to="/courses" style={{ justifySelf: 'center' }}>Go to your courses</Link>
        </div>
      )}

      {data.courses.map((course) => (
        <div className="card rise" key={course.courseId}>
          <div className="course-head" style={{ marginBottom: 16 }}>
            <Subject name={course.course} />
            <div className="stack-small grow" style={{ gap: 2 }}>
              <h2><Link to={`/courses/${course.courseId}`} style={{ color: 'inherit', textDecoration: 'none' }}>{course.course}</Link></h2>
              {course.daysToExam !== null && course.daysToExam >= 0 && <span className="muted small">Exam in {course.daysToExam} {course.daysToExam === 1 ? 'day' : 'days'}</span>}
            </div>
            <span className="percent" style={{ fontSize: '2rem' }}>{course.percent}<small>%</small></span>
          </div>
          {course.topics.length === 0 ? (
            <p className="muted">No questions in this course yet.</p>
          ) : (
            course.topics.map((topic) => (
              <div className="topic" key={topic.topicId}>
                <div className="topic-head"><b>{topic.topic}</b><span>{topic.percent}%</span></div>
                <Meter percent={topic.percent} />
                <div className="between">
                  <span className="muted small">{topic.reading}</span>
                  <Link className="small" to={`/practice?course=${course.courseId}&topic=${topic.topicId}`}>Practise</Link>
                </div>
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}

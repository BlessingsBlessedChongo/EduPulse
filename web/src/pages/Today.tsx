import { ArrowRight, BookPlus, Flame, PartyPopper, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, type PulseView, type Today } from '../api';
import { useAccount } from '../App';
import { CountUp, Doodles, Loading, Meter, Notice, PulseLine, Ring, useLoad } from '../ui';

export function TodayPage() {
  const { me } = useAccount();
  const today = useLoad(() => api.get<Today>('/api/today'));
  const pulse = useLoad(() => api.get<PulseView>('/api/pulse'));

  if (today.error) return <Notice>{today.error}</Notice>;
  if (!today.data || !pulse.data) return <Loading />;

  const { questions, doneToday, courses, totalQuestions, documentsBeingRead } = today.data;
  const firstName = me?.name.split(' ')[0] ?? '';
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const minutes = Math.max(2, Math.round(questions.length * 1.2));
  const back = questions.filter((q) => !q.isNew).length;
  const fresh = questions.length - back;
  const weakest = pulse.data.courses.flatMap((c) => c.topics.map((t) => ({ ...t, course: c.course, courseId: c.courseId })))
    .filter((t) => t.seen > 0).sort((a, b) => a.percent - b.percent).slice(0, 3);

  return (
    <div className="stack">
      <div className="hello rise">
        <p className="muted" style={{ fontWeight: 600 }}>{date}</p>
        <h1>{me?.isDemo ? 'Here is your day' : `Hey ${firstName}`} <span className="wave" aria-hidden="true">👋</span></h1>
      </div>

      {courses === 0 ? (
        <div className="card empty stack rise">
          <BookPlus aria-hidden style={{ margin: '0 auto' }} />
          <h2>Add your first course</h2>
          <p className="muted">Name a subject, then drop in your notes. Your first questions will be ready in a minute or two.</p>
          <Link className="button" to="/courses" style={{ justifySelf: 'center' }}>Add a course</Link>
        </div>
      ) : questions.length > 0 ? (
        <div className="today-card rise">
          <Doodles only={['π', 'cell', '∑', 'mito', 'x²', 'atom']} />
          <div className="between" style={{ alignItems: 'flex-start' }}>
            <div className="stack-small">
              <span className="chip" style={{ background: 'rgba(255,255,255,.18)', color: '#fff', justifySelf: 'start' }}><Zap size={14} aria-hidden />About {minutes} minutes</span>
              <h2>{questions.length} {questions.length === 1 ? 'question' : 'questions'} for today</h2>
              <p className="muted">{back} coming back for revision, {fresh} new.</p>
            </div>
          </div>
          <Link className="button button-large button-block" to="/practice">
            {doneToday > 0 ? 'Carry on' : "Start today's set"}
            <ArrowRight aria-hidden />
          </Link>
        </div>
      ) : totalQuestions === 0 ? (
        <div className="card stack-small rise">
          <h2>{documentsBeingRead > 0 ? 'Reading your notes...' : 'No questions yet'}</h2>
          {documentsBeingRead > 0 && <div className="reading-bar" />}
          <p className="muted">
            {documentsBeingRead > 0
              ? 'Questions will appear here as soon as they are written. This usually takes a minute or two.'
              : 'Open a course and add your notes to get your first questions.'}
          </p>
          <Link className="button button-quiet" to="/courses" style={{ justifySelf: 'start' }}>Go to your courses</Link>
        </div>
      ) : (
        <div className="card stack-small rise">
          <div className="row"><PartyPopper aria-hidden style={{ color: 'var(--brand)' }} /><h2>Done for today</h2></div>
          <p className="muted">Nothing else is due. Come back tomorrow, or practise a topic from one of your courses.</p>
          <Link className="button button-quiet" to="/courses" style={{ justifySelf: 'start' }}>Practise a topic</Link>
        </div>
      )}

      <div className="card rise">
        <div className="pulse-row">
          <Ring percent={pulse.data.percent} label="your pulse" />
          <div className="stats stats-side grow" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="stat"><b><CountUp value={doneToday} /></b><span>answered today</span></div>
            <div className="stat"><b><CountUp value={pulse.data.streak} /><Flame className="flame" aria-hidden size={24} /></b><span>day streak</span></div>
          </div>
        </div>
      </div>

      <div className="card stack-small rise">
        <div className="between">
          <h3>Your last two weeks</h3>
          <Link className="small" to="/pulse" style={{ fontWeight: 700 }}>See your pulse</Link>
        </div>
        <PulseLine days={pulse.data.days} />
        <p className="muted small">Each beat is a day you studied. The taller it is, the more marks you earned.</p>
      </div>

      {weakest.length > 0 && (
        <div className="card rise">
          <h3 style={{ marginBottom: 14 }}>Needs a little love</h3>
          {weakest.map((topic) => (
            <div className="topic" key={topic.topicId}>
              <div className="topic-head">
                <b>{topic.topic}</b>
                <span>{topic.percent}%</span>
              </div>
              <Meter percent={topic.percent} />
              <div className="between">
                <span className="muted small">{topic.course}. {topic.reading}</span>
                <Link className="small" to={`/practice?course=${topic.courseId}&topic=${topic.topicId}`} style={{ fontWeight: 700 }}>Practise</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

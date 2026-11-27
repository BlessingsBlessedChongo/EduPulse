import { Atom, Camera, CircleCheck, CircleX, Dna, FlaskConical, Highlighter, Pi, Play, Repeat, Scale, ScrollText, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Me, type Measured } from '../api';
import { useAccount } from '../App';
import { Brand, CellScene, CountUp, Doodles, Notice, Ring, useLoad } from '../ui';

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
} as const;

const subjects = [
  { icon: Dna, label: 'Biology' }, { icon: Pi, label: 'Mathematics' }, { icon: FlaskConical, label: 'Chemistry' }, { icon: Atom, label: 'Physics' },
  { icon: Scale, label: 'Law' }, { icon: ScrollText, label: 'History' }, { icon: Sparkles, label: 'Economics' }, { icon: Dna, label: 'Nursing' },
  { icon: Pi, label: 'Statistics' }, { icon: Atom, label: 'Engineering' },
];

/** The short film. Only a still picture loads until someone presses play, so it costs no data for people who skip it. */
function Tour() {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  return (
    <div className="tour">
      <video ref={video} src="/video/meet-edupulse.mp4" poster="/video/meet-edupulse-poster.webp" preload="none" playsInline controls={started}
        aria-label="Meet EduPulse: a narrated film of the app, about a minute and a half long" />
      {!started && (
        <button type="button" className="tour-play" onClick={() => { setStarted(true); video.current?.play(); }}>
          <span className="tour-disc" aria-hidden="true"><Play /></span>
          <span className="tour-label"><b>Watch the film</b>90 seconds, with sound</span>
        </button>
      )}
    </div>
  );
}

export function Landing() {
  const { about, setMe } = useAccount();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const measured = useLoad(() => api.get<Measured>('/api/measured'));

  const tryDemo = async () => {
    setBusy(true);
    setError('');
    try {
      setMe(await api.post<Me>('/api/auth/demo'));
      navigate('/today');
    } catch (failed) {
      setError((failed as Error).message);
      setBusy(false);
    }
  };

  const kept = measured.data?.questions.kept ?? 0;
  const refused = measured.data?.questions.refusedNotOnPage ?? 0;
  const engine = measured.data?.marking.find((m) => m.by === 'engine')?.count ?? 0;

  return (
    <div className="shell">
      <div className="glow" aria-hidden="true" />
      <header className="topbar">
        <div className="topbar-inner between" style={{ width: '100%' }}>
          <Link className="brand" to="/"><Brand /></Link>
          <div className="row">
            <Link className="button button-plain" to="/sign-in">Sign in</Link>
            <Link className="button button-small" to="/sign-up">Get started</Link>
          </div>
        </div>
      </header>

      <main className="page page-wide" style={{ paddingBottom: 0 }}>
        <section className="hero">
          <div>
            <motion.span className="chip chip-brand" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Sparkles size={15} aria-hidden /> Your notes. Your exam. Ten minutes a day.
            </motion.span>
            <motion.h1 style={{ marginTop: 16 }} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              Know what to <span className="swipe">study today.</span>
            </motion.h1>
            <motion.p className="lead" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }}>
              Drop in your notes and past papers. EduPulse turns them into practice questions in your lecturer's style,
              marks your answers (even a photo of your working), and brings back what you are about to forget.
            </motion.p>
            <motion.div className="hero-actions" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6 }}>
              <button className="button button-large" onClick={tryDemo} disabled={busy}>
                <Play aria-hidden />
                {busy ? 'Opening...' : 'Try the demo'}
              </button>
              <Link className="button button-quiet button-large" to="/sign-up">Create a free account</Link>
            </motion.div>
            <p className="muted small" style={{ marginTop: 14 }}>No sign-up for the demo. It opens a sample learner with two courses.</p>
            {error && <div style={{ marginTop: 14 }}><Notice>{error}</Notice></div>}
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.86 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}>
            <CellScene>
              <div className="hero-score" aria-hidden="true">
                <Ring percent={84} size={58} stroke={7} />
                <div><b style={{ fontFamily: 'var(--display)' }}>Cell biology</b><div className="muted small">Strong today</div></div>
              </div>
              <div className="hero-card" aria-label="An example of a marked answer">
                <div className="row"><span className="chip chip-brand">Quadratics</span><span className="chip chip-part">2 / 3</span></div>
                <b style={{ fontFamily: 'var(--display)', fontSize: '1.05rem' }}>Solve x² − 7x + 12 = 0.</b>
                <div className="script-answer">
                  <span>(x − 3)(x − 4) = 0</span>
                  <span className="slip">x = 3 or x = 5</span>
                </div>
                <div className="row small"><CircleCheck size={17} style={{ color: 'var(--good)' }} aria-hidden />Factorised correctly</div>
                <div className="row small"><CircleX size={17} style={{ color: 'var(--miss)' }} aria-hidden />Last line says 5, not 4</div>
              </div>
            </CellScene>
          </motion.div>
        </section>

        <div className="ticker" aria-hidden="true">
          <div className="ticker-track">
            {[...subjects, ...subjects].map((subject, i) => (
              <span key={i}><subject.icon />{subject.label}</span>
            ))}
          </div>
        </div>

        <section className="section" style={{ paddingBottom: 10 }}>
          <motion.h2 {...reveal}>See it in 90 seconds.</motion.h2>
          <motion.p className="lead" {...reveal}>The real app, start to finish: your notes in, questions out, a photo of your working marked.</motion.p>
          <motion.div {...reveal}><Tour /></motion.div>
        </section>

        <section className="section">
          <motion.h2 {...reveal}>Three steps. That's the whole thing.</motion.h2>
          <ol className="steps">
            <motion.li {...reveal}><h3>Add what you already have</h3><p className="muted">A PDF handout, a photo of your handwritten notes, or pasted text. Add a past paper and EduPulse learns how your exam asks its questions.</p></motion.li>
            <motion.li {...reveal} transition={{ ...reveal.transition, delay: 0.1 }}><h3>Answer today's short set</h3><p className="muted">Type it, or solve on paper and snap a photo. Every answer is marked against a marking scheme, with the reasons shown.</p></motion.li>
            <motion.li {...reveal} transition={{ ...reveal.transition, delay: 0.2 }}><h3>Watch your pulse climb</h3><p className="muted">An honest score for every topic, and a schedule that returns each question just before you would forget it.</p></motion.li>
          </ol>
        </section>

        <section className="section" style={{ paddingTop: 10 }}>
          <motion.h2 {...reveal}>Marks you can actually trust.</motion.h2>
          <motion.p className="lead" {...reveal}>Most study apps ask an AI and hope. Here the AI proposes, and rules decide.</motion.p>
          <div className="bento">
            <motion.div className="tile tile-grape" {...reveal}>
              <span className="tile-icon"><Pi aria-hidden /></span>
              <h3>Maths is checked by calculation</h3>
              <p className="muted">Your final answer goes to a maths engine, not an opinion. These are all the same answer, and it knows it:</p>
              <div className="equal"><span>x = 3</span>=<span>6/2</span>=<span>3.0</span>=<span>√9</span></div>
            </motion.div>
            <motion.div className="tile tile-lime" {...reveal} transition={{ ...reveal.transition, delay: 0.08 }}>
              <span className="tile-icon"><Highlighter aria-hidden /></span>
              <h3>Straight from your page</h3>
              <p className="muted">A question is kept only if the sentence behind it really is in your notes. You see it highlighted after every answer.</p>
            </motion.div>
            <motion.div className="tile" {...reveal}>
              <span className="tile-icon"><Camera aria-hidden /></span>
              <h3>Snap your working</h3>
              <p className="muted">Solve on paper, take a photo, and get method marks line by line.</p>
            </motion.div>
            <motion.div className="tile" {...reveal} transition={{ ...reveal.transition, delay: 0.08 }}>
              <span className="tile-icon"><Repeat aria-hidden /></span>
              <h3>Your exam's style, and your call</h3>
              <p className="muted">The instruction words, the marks and the mix of questions are learned from your own past papers, per course. Think a mark is wrong? Challenge it, and it is looked at again and explained. Your pulse is private; nobody is ranked.</p>
            </motion.div>
          </div>

          {measured.data && kept + refused + engine > 0 && (
            <motion.div className="numbers" {...reveal}>
              <div className="stat"><b><CountUp value={kept} /></b><span>questions kept on this server</span></div>
              <div className="stat"><b><CountUp value={refused} /></b><span>refused: not on the learner's page</span></div>
              <div className="stat"><b><CountUp value={engine} /></b><span>maths answers marked by calculation</span></div>
            </motion.div>
          )}
        </section>

        {about && about.comingSoon.length > 0 && (
          <section className="section" style={{ paddingTop: 10 }}>
            <motion.h2 {...reveal}>Cooking next.</motion.h2>
            <motion.p className="lead" {...reveal}>Not built yet, and said plainly.</motion.p>
            <div className="bento" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
              {about.comingSoon.map((item, i) => (
                <motion.div className="tile" style={{ gridColumn: 'auto' }} key={item.name} {...reveal} transition={{ ...reveal.transition, delay: i * 0.06 }}>
                  <span className="chip chip-soon" style={{ justifySelf: 'start' }}>Coming soon</span>
                  <h3>{item.name}</h3>
                  <p className="muted">{item.detail}</p>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        <motion.section className="cta" {...reveal}>
          <Doodles only={['π', 'cell', '∑', 'mito', 'x²', 'dna', 'atom', '∫']} />
          <h2>Start with tonight's notes.</h2>
          <p style={{ opacity: 0.85, marginTop: 10 }}>Free. Private. Ready in a minute.</p>
          <div className="hero-actions" style={{ justifyContent: 'center' }}>
            <Link className="button button-lime button-large" to="/sign-up">Create a free account</Link>
            <button className="button button-quiet button-large" onClick={tryDemo} disabled={busy}>Try the demo first</button>
          </div>
        </motion.section>

        <footer className="footer between">
          <span className="brand" style={{ fontSize: '1.1rem' }}><Brand /></span>
          <span>Made in Zambia for learners everywhere.</span>
        </footer>
      </main>
    </div>
  );
}

import { Atom, BookOpen, Circle, CircleAlert, CircleCheck, Code, Dna, Eye, EyeOff, FlaskConical, Globe, Info, Pi, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Day } from './api';

/**
 * The mark: a lower-case "e" whose crossbar is a heartbeat. "e" for education,
 * the beat for the pulse. The beat redraws itself every few seconds.
 */
export function Mark({ className = 'mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="mark-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8468ff" />
          <stop offset="1" stopColor="#4322d8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="19" fill="url(#mark-fill)" />
      <path d="M47 33A15 15 0 1 0 43.5 42.6" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <path className="blip" d="M17 33h8l3.5-8 6 15 3.5-7h9" fill="none" stroke="#c8f53d" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Brand() {
  return (
    <>
      <Mark />
      <span>edu<b>pulse</b></span>
    </>
  );
}

export function Loading() {
  return (
    <div className="loading" role="status">
      <Mark />
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function Notice({ tone = 'error', children }: { tone?: 'error' | 'info' | 'warn'; children: ReactNode }) {
  return (
    <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {tone === 'info' ? <Info aria-hidden /> : <CircleAlert aria-hidden />}
      <div>{children}</div>
    </div>
  );
}

/**
 * A pop-up in the middle of the screen, above everything else.
 *
 * It is drawn straight into the page body, not inside the screen that opened
 * it, so nothing (the menu bar, a moving screen) can sit on top of it. While
 * it is open the page behind does not scroll, Escape or a tap outside closes
 * it, the Tab key stays inside it, and focus goes back to where it was.
 */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const scroll = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusable = () => Array.from(box.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
    // Start in the first box to fill in, or on the pop-up itself when there is none.
    (focusable().find((element) => element.matches('input, textarea, select')) ?? box.current)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = scroll;
      before?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="modal-back" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal stack" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={box}>
        <div className="between">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/**
 * A password box with a button to show what is being typed, because most
 * mistyped passwords are typed on a phone, unseen.
 */
export function PasswordField({ id, label, value, onChange, autoComplete, error, hint, autoFocus }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  error?: string;
  hint?: ReactNode;
  autoFocus?: boolean;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password">
        <input id={id} className="input" type={shown ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete} autoCapitalize="none" autoCorrect="off" spellCheck={false} required autoFocus={autoFocus}
          aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} />
        <button type="button" className="peek" onClick={() => setShown((value) => !value)} aria-pressed={shown}
          aria-label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>
          {shown ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </button>
      </div>
      {error ? <span className="field-error" id={`${id}-error`} role="alert"><CircleAlert aria-hidden />{error}</span>
        : hint ? <div id={`${id}-hint`}>{hint}</div> : null}
    </div>
  );
}

/** What a new password still needs, ticking off as it is typed. Mirrors the server's rules. */
export function PasswordChecks({ password }: { password: string }) {
  const rules = [
    { met: password.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Za-z]/.test(password), text: 'Includes a letter' },
  ];
  return (
    <ul className="checks">
      {rules.map((rule) => (
        <li key={rule.text} className={rule.met ? 'met' : ''}>
          {rule.met ? <CircleCheck aria-hidden /> : <Circle aria-hidden />}
          {rule.text}
          <span className="sr-only">{rule.met ? '(done)' : '(still needed)'}</span>
        </li>
      ))}
    </ul>
  );
}

export const passwordIsStrong = (password: string) => password.length >= 8 && /[A-Za-z]/.test(password);

export function Confirm({ title, children, action, onConfirm, onClose }: {
  title: string;
  children: ReactNode;
  action: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose}>
      <p className="muted">{children}</p>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="button button-quiet" onClick={onClose} disabled={busy}>Keep it</button>
        <button type="button" className="button button-danger" disabled={busy}
          onClick={async () => { setBusy(true); await onConfirm(); }}>
          {busy ? 'Removing...' : action}
        </button>
      </div>
    </Modal>
  );
}

/** A bar that says how strong a topic is, coloured the way a marker would: red, amber, green. */
export function Meter({ percent }: { percent: number }) {
  const tone = percent >= 70 ? 'good' : percent >= 40 ? 'part' : 'miss';
  return (
    <div className={`meter meter-${tone}`} role="img" aria-label={`${percent} percent`}>
      <span style={{ width: `${Math.max(percent, 3)}%` }} />
    </div>
  );
}

/** A number that counts up to its value when it first appears. */
export function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / 900);
      setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{shown}{suffix}</>;
}

/** A ring that fills to a percentage, with the number counting up inside it. */
export function Ring({ percent, size = 132, label, stroke = 12 }: { percent: number; size?: number; label?: string; stroke?: number }) {
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => setDrawn(percent), 80);
    return () => window.clearTimeout(timer);
  }, [percent]);
  const radius = (size - stroke) / 2;
  const around = 2 * Math.PI * radius;
  const colour = percent >= 70 ? '#10b981' : percent >= 40 ? '#f59e0b' : '#f43f5e';
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${percent} percent${label ? ` ${label}` : ''}`}>
      <svg width={size} height={size}>
        <circle className="track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <circle className="value" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} stroke={colour}
          strokeDasharray={around} strokeDashoffset={around * (1 - drawn / 100)} />
      </svg>
      <div className="inside">
        <b style={{ fontSize: size * 0.3 }}><CountUp value={percent} suffix="%" /></b>
        {label && <span>{label}</span>}
      </div>
    </div>
  );
}

/** A burst of coloured paper for a full-marks answer. */
export function Confetti() {
  const pieces = useMemo(() => {
    const colours = ['#5b3df5', '#c8f53d', '#ff8a5b', '#2aa7ee', '#f25fb0', '#10b981'];
    return Array.from({ length: 28 }, (_, i) => {
      const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.4;
      const reach = 90 + Math.random() * 130;
      return {
        colour: colours[i % colours.length],
        style: {
          '--x': `${Math.cos(angle) * reach}px`,
          '--y': `${Math.sin(angle) * reach - 40}px`,
          '--r': `${Math.random() * 720 - 360}deg`,
          animationDelay: `${Math.random() * 0.12}s`,
        } as CSSProperties,
      };
    });
  }, []);
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((piece, i) => <i key={i} style={{ ...piece.style, background: piece.colour }} />)}
    </div>
  );
}

/** Picks a picture and colour for a course from its name, so each course is easy to spot. */
export function Subject({ name }: { name: string }) {
  const n = name.toLowerCase();
  const pick = (words: string[]) => words.some((word) => n.includes(word));
  const [Icon, tone] = pick(['bio', 'cell', 'anatomy', 'genetic', 'ecology', 'medic', 'nurs', 'agric'])
    ? [Dna, 'bio'] as const
    : pick(['math', 'ma ', 'ma1', 'calculus', 'algebra', 'statistic', 'geometry', 'trig', 'numer'])
      ? [Pi, 'maths'] as const
      : pick(['chem', 'ch ', 'ch1', 'organic', 'pharma'])
        ? [FlaskConical, 'chem'] as const
        : pick(['phys', 'ph ', 'ph1', 'mechanic', 'electr', 'engineer'])
          ? [Atom, 'phys'] as const
          : pick(['comput', 'program', 'cs ', 'software', 'ict', 'data', 'coding'])
            ? [Code, 'code'] as const
            : pick(['geo', 'history', 'civic', 'econom', 'business', 'law', 'social', 'commerce', 'account'])
              ? [Globe, 'world'] as const
              : [BookOpen, 'book'] as const;
  return <span className={`subject subject-${tone}`}><Icon aria-hidden /></span>;
}

// ---- doodles: small drawings that float behind a screen

const shapes: Record<string, ReactNode> = {
  cell: (
    <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
      <path d="M40 6c20 0 34 12 34 32S62 74 40 74 6 60 6 40 20 6 40 6Z" />
      <circle cx="44" cy="38" r="11" fill="currentColor" fillOpacity=".25" />
      <circle cx="22" cy="50" r="3" fill="currentColor" stroke="none" /><circle cx="58" cy="60" r="3" fill="currentColor" stroke="none" />
    </svg>
  ),
  mito: (
    <svg viewBox="0 0 100 52" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="94" height="46" rx="23" />
      <path d="M18 26c4-12 8-12 12 0s8 12 12 0 8-12 12 0 8 12 12 0 8-12 12 0" />
    </svg>
  ),
  dna: (
    <svg viewBox="0 0 48 100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
      <path d="M8 4c0 22 32 26 32 46S8 74 8 96" /><path d="M40 4c0 22-32 26-32 46s32 24 32 46" />
      <path d="M13 20h22M11 38h26M11 62h26M13 80h22" strokeWidth="3" />
    </svg>
  ),
  atom: (
    <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="3.5">
      <ellipse cx="40" cy="40" rx="34" ry="13" /><ellipse cx="40" cy="40" rx="34" ry="13" transform="rotate(60 40 40)" /><ellipse cx="40" cy="40" rx="34" ry="13" transform="rotate(120 40 40)" />
      <circle cx="40" cy="40" r="5" fill="currentColor" stroke="none" />
    </svg>
  ),
  flask: (
    <svg viewBox="0 0 64 80" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 6h16M27 6v24L8 66c-3 5 0 10 6 10h36c6 0 9-5 6-10L37 30V6" /><path d="M17 54h30" />
    </svg>
  ),
  hex: (
    <svg viewBox="0 0 80 88" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round">
      <path d="M40 4 74 24v40L40 84 6 64V24Z" /><path d="M40 18 62 31v26L40 70" strokeWidth="3" />
    </svg>
  ),
  graph: (
    <svg viewBox="0 0 90 70" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4v58h78" /><path d="M14 54c12 0 16-40 30-40s14 30 36 34" />
    </svg>
  ),
};

type DoodleSpot = { kind: string; left: string; top: string; size: number; tone?: string; time?: number; wait?: number; tilt?: number };

const scatter: DoodleSpot[] = [
  { kind: 'π', left: '4%', top: '12%', size: 54, tone: '', time: 9, tilt: -8 },
  { kind: 'cell', left: '86%', top: '8%', size: 64, tone: 'mint', time: 11, wait: -3 },
  { kind: '∑', left: '92%', top: '56%', size: 50, tone: 'peach', time: 10, wait: -5, tilt: 10 },
  { kind: 'mito', left: '2%', top: '62%', size: 78, tone: 'pink', time: 12, wait: -2, tilt: -14 },
  { kind: 'x²', left: '70%', top: '86%', size: 44, tone: 'sky', time: 8, wait: -4 },
  { kind: 'dna', left: '14%', top: '86%', size: 42, tone: 'lime', time: 13, wait: -6, tilt: 12 },
  { kind: '√', left: '46%', top: '4%', size: 46, tone: 'pink', time: 9, wait: -1 },
  { kind: 'atom', left: '60%', top: '16%', size: 56, tone: 'sky', time: 14, wait: -7 },
  { kind: '∫', left: '30%', top: '70%', size: 56, tone: '', time: 10, wait: -3, tilt: 8 },
  { kind: 'flask', left: '78%', top: '36%', size: 44, tone: 'lime', time: 12, wait: -5, tilt: -8 },
  { kind: 'hex', left: '24%', top: '24%', size: 44, tone: 'peach', time: 11, wait: -8 },
  { kind: '÷', left: '52%', top: '90%', size: 44, tone: 'mint', time: 9, wait: -2 },
  { kind: 'graph', left: '40%', top: '44%', size: 62, tone: 'sky', time: 13, wait: -4, tilt: -4 },
];

/**
 * Maths symbols, cells, mitochondria, molecules: the stuff of a learner's
 * notes, drifting slowly behind the screen. Purely decoration, hidden from
 * screen readers, and still for anyone who asks for less motion.
 */
export function Doodles({ count = 13, only, fixed = false }: { count?: number; only?: string[]; fixed?: boolean }) {
  const spots = (only ? scatter.filter((spot) => only.includes(spot.kind)) : scatter).slice(0, count);
  return (
    <div className={`doodles ${fixed ? 'doodles-fixed' : ''}`} aria-hidden="true">
      {spots.map((spot, i) => (
        <span key={i} className={`doodle ${spot.tone ? `doodle-${spot.tone}` : ''}`}
          style={{
            left: spot.left, top: spot.top, width: spot.size, height: shapes[spot.kind] ? undefined : spot.size, fontSize: spot.size,
            '--time': `${spot.time ?? 10}s`, '--wait': `${spot.wait ?? 0}s`, '--tilt': `${spot.tilt ?? 0}deg`,
            '--dx': `${i % 2 ? -10 : 10}px`, '--dy': `${-12 - (i % 3) * 6}px`,
          } as CSSProperties}>
          {shapes[spot.kind] ?? spot.kind}
        </span>
      ))}
    </div>
  );
}

/**
 * The picture at the top of the landing page: a living cell with a pulsing
 * nucleus and drifting mitochondria, ringed by orbiting maths symbols.
 */
export function CellScene({ children }: { children?: ReactNode }) {
  const outer = ['π', '∑', '√x', 'x²', '∫', 'Δ'];
  const inner = ['H₂O', 'ATP', 'F=ma', 'sin θ'];
  const place = (index: number, total: number, radius: number): CSSProperties => {
    const angle = (index / total) * Math.PI * 2;
    return { left: `${50 + Math.cos(angle) * radius}%`, top: `${50 + Math.sin(angle) * radius}%` };
  };
  return (
    <div className="scene">
      <div className="orbit slow" aria-hidden="true">
        {inner.map((text, i) => <span key={text} style={{ ...place(i, inner.length, 52), fontSize: '0.8rem' }}>{text}</span>)}
      </div>
      <div className="cell" aria-hidden="true" />
      <div className="cell-membrane" aria-hidden="true" style={{ borderRadius: '50%' }} />
      <div className="nucleus" aria-hidden="true" />
      <div className="organelle" aria-hidden="true" style={{ left: '20%', top: '27%', width: '21%', color: '#ffd9c7', rotate: '-24deg', '--time': '7s' } as CSSProperties}>{shapes.mito}</div>
      <div className="organelle" aria-hidden="true" style={{ left: '58%', top: '66%', width: '19%', color: '#ffc2e3', rotate: '18deg', '--time': '9s', '--wait': '-3s' } as CSSProperties}>{shapes.mito}</div>
      <div className="organelle" aria-hidden="true" style={{ left: '24%', top: '64%', width: '15%', color: '#bfe8ff', rotate: '40deg', '--time': '8s', '--wait': '-5s' } as CSSProperties}>{shapes.mito}</div>
      <div className="organelle" aria-hidden="true" style={{ left: '66%', top: '26%', width: '9%', color: '#eaffb0', '--time': '6s', '--wait': '-2s' } as CSSProperties}>{shapes.dna}</div>
      <div className="orbit" aria-hidden="true">
        {outer.map((text, i) => <span key={text} style={place(i, outer.length, 47)}>{text}</span>)}
      </div>
      {children}
    </div>
  );
}

/**
 * The pulse line: the share of marks earned on each of the last fourteen days,
 * drawn as heartbeats. Days with no study stay flat, so a gap looks like a gap.
 */
export function PulseLine({ days }: { days: Day[] }) {
  const width = 600;
  const height = 92;
  const floor = height - 10;
  const step = width / Math.max(1, days.length - 1);
  let line = `M0,${floor} `;
  days.forEach((day, index) => {
    const x = index * step;
    if (day.outOf > 0) {
      const top = floor - 14 - (day.marks / day.outOf) * (height - 34);
      const half = step * 0.3;
      line += `L${(x - half).toFixed(1)},${floor} L${(x - half * 0.4).toFixed(1)},${(floor + 7).toFixed(1)} L${x.toFixed(1)},${top.toFixed(1)} L${(x + half * 0.4).toFixed(1)},${(floor + 5).toFixed(1)} L${(x + half).toFixed(1)},${floor} `;
    }
  });
  line += `L${width},${floor}`;
  const studiedDays = days.filter((day) => day.outOf > 0).length;
  const first = days[0]?.date;
  return (
    <div>
      <svg className="pulse-line" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img"
        aria-label={`You studied on ${studiedDays} of the last ${days.length} days.`}>
        <path className="rest" d={`M0,${floor} L${width},${floor}`} />
        <path className="beat" d={line} />
      </svg>
      <div className="pulse-days">
        <span>{first ? shortDate(first) : ''}</span>
        <span>{days.length ? 'Today' : ''}</span>
      </div>
    </div>
  );
}

/**
 * Shows plain-text maths the way it is written by hand: x^2 becomes x², a^(m+n)
 * gets a raised (m+n), sqrt(x) becomes √(x). Anything else is left exactly as it was.
 */
export function Maths({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const pattern = /\^\(([^()]{1,24})\)|\^(-?[A-Za-z0-9.]{1,6})|sqrt\(/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[0] === 'sqrt(') parts.push('√(');
    else parts.push(<sup key={match.index}>{match[1] ?? match[2]}</sup>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

export function shortDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** "tomorrow", "in 3 days", "on 14 Dec": when something is due, in plain words. */
export function whenDue(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const due = new Date(year, month - 1, day).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.round((due - today) / 86400000);
  if (days <= 0) return 'later today';
  if (days === 1) return 'tomorrow';
  if (days < 14) return `in ${days} days`;
  return `on ${shortDate(iso)}`;
}

export function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    load()
      .then((value) => live && (setData(value), setError('')))
      .catch((failed: Error) => live && setError(failed.message));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, reload: () => setTick((value) => value + 1), setData };
}

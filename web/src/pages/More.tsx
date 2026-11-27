import { LogOut } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Measured } from '../api';
import { useAccount } from '../App';
import { Notice, PasswordChecks, PasswordField, passwordIsStrong, useLoad } from '../ui';

export function More() {
  const { me, about, signOut, setMe } = useAccount();
  const navigate = useNavigate();
  const measured = useLoad(() => api.get<Measured>('/api/measured'));

  const leave = async () => {
    await signOut();
    navigate('/');
  };

  const purposes: Record<string, string> = {
    'read-document': 'Reading a photo or scan',
    'make-questions': 'Writing questions',
    'confirm-maths': 'Double-checking a maths answer',
    'learn-style': 'Learning an exam style',
    'mark-answer': 'Marking a typed answer',
    'mark-photo': 'Marking a photo of working',
    'review-answer': 'Reviewing a challenged mark',
    'review-photo': 'Reviewing a challenge with a photo',
  };

  return (
    <div className="stack">
      <h1>More</h1>

      <div className="card stack rise">
        <div className="between">
          <div>
            <h2>{me?.name}</h2>
            <p className="muted">{me?.isDemo ? 'Demo account, kept for one day' : me?.email}</p>
          </div>
          <button className="button button-quiet button-small" onClick={leave}><LogOut aria-hidden />Sign out</button>
        </div>
        {me?.isDemo && (
          <Notice tone="info">
            Like it? <Link to="/sign-up" onClick={async (event) => { event.preventDefault(); await signOut(); navigate('/sign-up'); }}>Create a real account</Link> to keep your own notes and history.
          </Notice>
        )}
      </div>

      {!me?.isDemo && <ChangePassword />}

      <div className="card stack">
        <h2>What this server can do</h2>
        <div className="row">
          <span className={`chip ${about?.ai ? 'chip-good' : 'chip-part'}`}>{about?.ai ? 'AI questions and marking: on' : 'AI: off, working by rules'}</span>
          <span className={`chip ${about?.photos ? 'chip-good' : 'chip-part'}`}>{about?.photos ? `Photo marking: on, ${about.photosPerDay} a day` : 'Photo marking: off'}</span>
        </div>
        {measured.data && (
          <>
            <p className="muted small">
              Measured on this server: {measured.data.questions.kept} questions kept, and {measured.data.questions.refusedNotOnPage} refused
              because the sentence they claimed to rest on was not on the learner's page.
            </p>
            {measured.data.calls.length > 0 && (
              <div className="stack-small">
                <span className="label">How fast the AI answered, last 30 days</span>
                {measured.data.calls.map((call) => (
                  <div className="between small" key={call.purpose}>
                    <span>{purposes[call.purpose] ?? call.purpose}</span>
                    <span className="mono muted">{(call.medianMs / 1000).toFixed(1)} s typical, {call.answered} of {call.calls} answered</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {about && (
        <div className="card stack">
          <h2>Coming soon</h2>
          {about.comingSoon.map((item) => (
            <div className="stack-small" key={item.name} style={{ gap: 2 }}>
              <div className="row"><b>{item.name}</b><span className="chip chip-soon">Coming soon</span></div>
              <p className="muted small">{item.detail}</p>
            </div>
          ))}
        </div>
      )}

      <DeleteAccount demo={Boolean(me?.isDemo)} onGone={() => { setMe(null); navigate('/'); }} />
    </div>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [tried, setTried] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const weak = !passwordIsStrong(next);
  const mismatch = repeat !== next;
  const same = next.length > 0 && next === current;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    setError('');
    setDone(false);
    if (weak || mismatch || same) return;
    setBusy(true);
    try {
      await api.post('/api/me/password', { current, next });
      setCurrent('');
      setNext('');
      setRepeat('');
      setTried(false);
      setDone(true);
    } catch (failed) {
      setError((failed as Error).message);
    }
    setBusy(false);
  };

  return (
    <form className="card stack" onSubmit={submit} noValidate>
      <h2>Change password</h2>
      {error && <Notice>{error}</Notice>}
      {done && <Notice tone="info">Password changed. Your other devices have been signed out.</Notice>}
      <PasswordField id="current" label="Current password" value={current} onChange={setCurrent} autoComplete="current-password"
        error={tried && current.length === 0 ? 'Type your current password.' : undefined} />
      <PasswordField id="next" label="New password" value={next} onChange={setNext} autoComplete="new-password"
        error={tried && weak ? 'This password does not meet the rules yet.' : same ? 'Choose a password different from your current one.' : undefined}
        hint={<PasswordChecks password={next} />} />
      <PasswordField id="next-repeat" label="Repeat new password" value={repeat} onChange={setRepeat} autoComplete="new-password"
        error={(tried || repeat.length >= next.length) && repeat.length > 0 && mismatch ? 'The two passwords are not the same.'
          : tried && repeat.length === 0 ? 'Type the new password again.' : undefined} />
      <button className="button button-quiet" style={{ justifySelf: 'start' }} disabled={busy}>{busy ? 'Changing...' : 'Change password'}</button>
    </form>
  );
}

function DeleteAccount({ demo, onGone }: { demo: boolean; onGone: () => void }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await api.del('/api/me', { password });
      onGone();
    } catch (failed) {
      setError((failed as Error).message);
    }
  };

  if (!open) {
    return <button className="button button-danger" style={{ justifySelf: 'start' }} onClick={() => setOpen(true)}>Delete my account</button>;
  }
  return (
    <form className="card stack" onSubmit={submit}>
      <h2>Delete your account</h2>
      <p className="muted">This removes your courses, notes, questions and history for good.</p>
      {error && <Notice>{error}</Notice>}
      {!demo && (
        <PasswordField id="confirm-password" label="Your password" value={password} onChange={setPassword} autoComplete="current-password" />
      )}
      <div className="row">
        <button className="button button-danger">Delete everything</button>
        <button type="button" className="button button-quiet" onClick={() => setOpen(false)}>Keep my account</button>
      </div>
    </form>
  );
}

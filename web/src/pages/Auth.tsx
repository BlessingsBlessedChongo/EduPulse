import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, type Me } from '../api';
import { useAccount } from '../App';
import { Brand, Doodles, Notice, PasswordChecks, PasswordField, passwordIsStrong } from '../ui';

export function Auth({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const { setMe } = useAccount();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const signingUp = mode === 'sign-up';

  // Problems are shown beside the box they belong to, once the learner has tried to send the form.
  const weak = signingUp && !passwordIsStrong(password);
  const mismatch = signingUp && repeat !== password;
  const passwordError = tried && weak ? 'This password does not meet the two rules below yet.' : undefined;
  const repeatError = (tried || repeat.length >= password.length) && repeat.length > 0 && mismatch
    ? 'The two passwords are not the same.'
    : tried && signingUp && repeat.length === 0 ? 'Type your password again.' : undefined;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    setError('');
    if (weak || mismatch) return;
    setBusy(true);
    try {
      const me = signingUp
        ? await api.post<Me>('/api/auth/register', { name, email, password })
        : await api.post<Me>('/api/auth/login', { email, password });
      setMe(me);
      navigate((location.state as { from?: string } | null)?.from || '/today', { replace: true });
    } catch (failed) {
      setError((failed as Error).message);
      setBusy(false);
    }
  };

  const tryDemo = async () => {
    setBusy(true);
    try {
      setMe(await api.post<Me>('/api/auth/demo'));
      navigate('/today', { replace: true });
    } catch (failed) {
      setError((failed as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="auth">
      <div className="glow" aria-hidden="true" />
      <Doodles />
      <div className="auth-box rise">
        <Link className="brand" to="/" style={{ marginBottom: 24, fontSize: '1.6rem' }}><Brand /></Link>
        <form className="card stack" onSubmit={submit} noValidate={signingUp}>
          <div className="stack-small">
            <h1 style={{ fontSize: '1.7rem' }}>{signingUp ? "Let's get you set up" : 'Welcome back'}</h1>
            <p className="muted">{signingUp ? 'Free. Your notes and results stay private to you.' : 'Sign in to see what is due today.'}</p>
          </div>
          {error && <Notice>{error}</Notice>}
          {signingUp && (
            <div className="field">
              <label htmlFor="name">Your name</label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required autoFocus />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" className="input" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} required autoFocus={!signingUp} />
          </div>
          <PasswordField id="password" label="Password" value={password} onChange={setPassword}
            autoComplete={signingUp ? 'new-password' : 'current-password'} error={passwordError}
            hint={signingUp ? <PasswordChecks password={password} /> : undefined} />
          {signingUp && passwordError && <PasswordChecks password={password} />}
          {signingUp && (
            <PasswordField id="repeat" label="Repeat password" value={repeat} onChange={setRepeat} autoComplete="new-password" error={repeatError}
              hint={repeat.length > 0 && !mismatch ? <ul className="checks"><li className="met">The passwords match</li></ul> : undefined} />
          )}
          <button className="button button-block" disabled={busy}>{busy ? 'One moment...' : signingUp ? 'Create account' : 'Sign in'}</button>
          <p className="muted small center">
            {signingUp ? <>Already have an account? <Link to="/sign-in">Sign in</Link></> : <>New here? <Link to="/sign-up">Create an account</Link></>}
          </p>
          {!signingUp && <p className="muted small center">Forgot your password? Reset by email is coming soon.</p>}
        </form>
        <p className="center muted small" style={{ marginTop: 18 }}>
          Just looking? <button className="button button-plain button-small" onClick={tryDemo} disabled={busy}>Try the demo</button>
        </p>
      </div>
    </main>
  );
}

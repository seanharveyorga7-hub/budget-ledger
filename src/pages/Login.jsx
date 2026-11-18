import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Button, Spinner } from '../components/ui';
import { PasswordField, TextField } from '../components/FormControls';
import { friendlyError } from '../utils/errors';
import LoginHero from '../components/auth/LoginHero';

export default function Login() {
  const { user, profile, isInactive, loading, error: authError, signIn, register, resetPassword, logOut } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState('signin'); // signin | register | reset
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  if (user && isInactive) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1 className="auth-title">Account inactive</h1>
          <Alert>Contact a System Admin to restore your access.</Alert>
          <Button variant="ghost" onClick={logOut}>Sign out</Button>
        </div>
      </div>
    );
  }

  if (user && profile) return <Navigate to={location.state?.from?.pathname || '/'} replace />;

  // Signed in to Firebase Auth, but the Firestore profile step is still running or failed.
  if (user && (loading || authError || !profile)) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          {loading ? (
            <Spinner label="Signing you in…" />
          ) : (
            <>
              <h1 className="auth-title">Couldn't load your account</h1>
              <Alert>
                {authError ? friendlyError(authError) : 'Your user profile was not found.'}
                {authError?.code && <div className="small">Error code: {authError.code}</div>}
              </Alert>
              <p className="muted small">
                Signed in as {user.email}. A <code>permission-denied</code> code usually means the Firestore security rules are
                not published, or the published version is different from <code>firestore.rules</code>.
              </p>
              <Button variant="ghost" onClick={logOut}>
                Sign out and try again
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setInfo('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else if (mode === 'register') {
        if (!name.trim()) throw new Error('Please enter your full name.');
        await register(email, password, name.trim());
      } else {
        await resetPassword(email);
        setInfo('If an account exists for that email, a reset link has been sent.');
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const titles = { signin: 'Sign in', register: 'Create an account', reset: 'Reset password' };

  return (
    <div className="auth-screen auth-split">
      <LoginHero />
      <div className="auth-card">
        <div className="brand brand-lg">
          <div className="brand-mark">B</div>
          <div>
            <div className="brand-name">Budget Indicator &amp; Obligation Ledger</div>
            <div className="brand-sub">Information System</div>
          </div>
        </div>

        <h1 className="auth-title">{titles[mode]}</h1>
        <form className="stack" onSubmit={handleSubmit}>
          <Alert>{error}</Alert>
          <Alert tone="success">{info}</Alert>
          {mode === 'register' && (
            <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} required />
          )}
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          {mode !== 'reset' && (
            <PasswordField
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
          )}
          <Button type="submit" loading={busy} className="btn-block">
            {mode === 'signin' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}
          </Button>
        </form>

        <div className="auth-links">
          {mode === 'signin' ? (
            <>
              <button type="button" className="link" onClick={() => switchMode('register')}>
                Create an account
              </button>
              <button type="button" className="link" onClick={() => switchMode('reset')}>
                Forgot password?
              </button>
            </>
          ) : (
            <button type="button" className="link" onClick={() => switchMode('signin')}>
              ← Back to sign in
            </button>
          )}
        </div>
        {mode === 'register' && <p className="muted small">New accounts start as Normal Users. A System Admin can grant admin access.</p>}
      </div>
    </div>
  );
}

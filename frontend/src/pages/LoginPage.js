import { useRef as useDemoLoginRef, useState as useDemoLoginState } from 'react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, setToken, setStoredUser } from '../services/api';

export default function LoginPage() {
  const demoLoginLock = useDemoLoginRef(false);
  const [demoLoginBusy, setDemoLoginBusy] = useDemoLoginState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const submit = async (e, demoLoginCredentials) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const { token, user } = await login((demoLoginCredentials?.email ?? email), (demoLoginCredentials?.password ?? password));
      setToken(token); setStoredUser(user);
      navigate('/');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <h2 className="login-brand">LOCAL-FIRST AGENT CONSOLE</h2>
        <p className="login-sub">Private on-device AI — files, mail, messages without exfiltration.</p>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="ai-error">{error}</div>}
        <button
          type="button"
          onClick={async (event) => {
 if (demoLoginLock.current) return;
 demoLoginLock.current = true; setDemoLoginBusy(true);
 const values = {};
 const captureDemoValue = (key, value) => { values[key] = value; return value; };
 try {
  await (async () => { setEmail(captureDemoValue("email", process.env.REACT_APP_DEMO_EMAIL || '')); setPassword(captureDemoValue("password", process.env.REACT_APP_DEMO_PASSWORD || '')); })(event);
  if (values.error || typeof values.email !== 'string' || !values.email || typeof values.password !== 'string' || !values.password) { setError(typeof values.error === 'string' ? values.error : 'Demo credentials are unavailable.'); return; }
  await submit(event, { email: values.email, password: values.password });
 } finally { demoLoginLock.current = false; setDemoLoginBusy(false); }
}}
          disabled={demoLoginBusy || (!process.env.REACT_APP_DEMO_EMAIL || !process.env.REACT_APP_DEMO_PASSWORD)}
          aria-label="Log In as Demo"
          style={{ width: '100%', marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', border: '1px solid currentColor', background: 'transparent', cursor: 'pointer' }}
        >
          Log In as Demo
        </button>
        <button className="btn" type="submit" disabled={busy} style={{ width: '100%', marginTop: 10 }}>
          {busy ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

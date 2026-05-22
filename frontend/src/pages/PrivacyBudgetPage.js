import React, { useEffect, useState } from 'react';
import { privacyBudgetApi } from '../services/api';

export default function PrivacyBudgetPage() {
  const [budgets, setBudgets] = useState([]);
  const [err, setErr] = useState(null);
  const [draft, setDraft] = useState({ user_email: '', epsilon_total: 10, cloud_tokens_total: 1000000, reset_period: 'monthly' });
  const [spend, setSpend] = useState({ user_email: '', epsilon: 0.5, tokens: 1000, reason: 'cloud-call', feature: '' });
  const [ledger, setLedger] = useState(null);

  const load = async () => {
    setErr(null);
    try { setBudgets(await privacyBudgetApi.list()); } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => { try { await privacyBudgetApi.create(draft); load(); } catch (e) { alert(e.message); } };
  const doSpend = async () => {
    try { await privacyBudgetApi.spend(spend.user_email, spend); load(); }
    catch (e) { alert(e.message); }
  };
  const reset = async (email) => {
    try { await privacyBudgetApi.reset(email); load(); } catch (e) { alert(e.message); }
  };
  const showLedger = async (email) => {
    try { setLedger({ email, rows: await privacyBudgetApi.ledger(email) }); } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Privacy Budget Tracker</h2>
          <p>Per-user epsilon + cloud-token ledger. Block cloud calls when exceeded.</p>
        </div>
      </div>

      {err && <div className="ai-error">{err}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Budgets</h3>
        {budgets.length === 0 ? <div className="empty-state">No budgets yet.</div> : (
          <table>
            <thead><tr><th>User</th><th>ε spent / total</th><th>Tokens spent / total</th><th>Period</th><th>Last reset</th><th></th></tr></thead>
            <tbody>
              {budgets.map((b) => (
                <tr key={b.id}>
                  <td>{b.user_email}</td>
                  <td>{Number(b.epsilon_spent).toFixed(2)} / {Number(b.epsilon_total).toFixed(2)}</td>
                  <td>{Number(b.cloud_tokens_spent).toLocaleString()} / {Number(b.cloud_tokens_total).toLocaleString()}</td>
                  <td>{b.reset_period}</td>
                  <td>{new Date(b.last_reset_at).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn secondary" onClick={() => showLedger(b.user_email)} style={{ marginRight: 6 }}>Ledger</button>
                    <button className="btn secondary" onClick={() => reset(b.user_email)}>Reset</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Create Budget</h3>
        <div className="form-grid">
          <div className="form-group"><label>user_email</label><input value={draft.user_email} onChange={(e) => setDraft({ ...draft, user_email: e.target.value })} /></div>
          <div className="form-group"><label>epsilon_total</label><input type="number" step="0.1" value={draft.epsilon_total} onChange={(e) => setDraft({ ...draft, epsilon_total: Number(e.target.value) })} /></div>
          <div className="form-group"><label>cloud_tokens_total</label><input type="number" value={draft.cloud_tokens_total} onChange={(e) => setDraft({ ...draft, cloud_tokens_total: Number(e.target.value) })} /></div>
          <div className="form-group">
            <label>reset_period</label>
            <select value={draft.reset_period} onChange={(e) => setDraft({ ...draft, reset_period: e.target.value })}>
              {['daily', 'weekly', 'monthly', 'never'].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <button className="btn" onClick={create}>Create</button>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Spend</h3>
        <div className="form-grid">
          <div className="form-group"><label>user_email</label><input value={spend.user_email} onChange={(e) => setSpend({ ...spend, user_email: e.target.value })} /></div>
          <div className="form-group"><label>epsilon</label><input type="number" step="0.01" value={spend.epsilon} onChange={(e) => setSpend({ ...spend, epsilon: Number(e.target.value) })} /></div>
          <div className="form-group"><label>tokens</label><input type="number" value={spend.tokens} onChange={(e) => setSpend({ ...spend, tokens: Number(e.target.value) })} /></div>
          <div className="form-group"><label>reason</label><input value={spend.reason} onChange={(e) => setSpend({ ...spend, reason: e.target.value })} /></div>
          <div className="form-group"><label>feature</label><input value={spend.feature} onChange={(e) => setSpend({ ...spend, feature: e.target.value })} /></div>
        </div>
        <button className="btn" onClick={doSpend} disabled={!spend.user_email}>Spend</button>
      </div>

      {ledger && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Ledger · {ledger.email}</h3>
          {ledger.rows.length === 0 ? <div className="empty-state">No entries.</div> : (
            <table>
              <thead><tr><th>When</th><th>Δε</th><th>Δtokens</th><th>Reason</th><th>Feature</th></tr></thead>
              <tbody>
                {ledger.rows.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.recorded_at).toLocaleString()}</td>
                    <td>{Number(r.delta_epsilon).toFixed(3)}</td>
                    <td>{Number(r.delta_tokens).toLocaleString()}</td>
                    <td>{r.reason}</td>
                    <td>{r.feature || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

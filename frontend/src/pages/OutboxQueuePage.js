import React, { useEffect, useState } from 'react';
import { outboxApi } from '../services/api';

export default function OutboxQueuePage() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ pending: 0, replayed: 0, failed: 0 });
  const [err, setErr] = useState(null);
  const [draft, setDraft] = useState({ client_op_id: '', device_id: 'workstation-1', endpoint: '/api/agent-runs', method: 'POST', payload: '{}' });

  const load = async () => {
    setErr(null);
    try {
      setRows(await outboxApi.list());
      setStats(await outboxApi.stats());
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const enqueue = async () => {
    try {
      let payload = {}; try { payload = JSON.parse(draft.payload || '{}'); } catch (_) {}
      await outboxApi.enqueue({ ...draft, payload });
      load();
    } catch (e) { alert(e.message); }
  };
  const replay = async () => { try { await outboxApi.replay(50); load(); } catch (e) { alert(e.message); } };
  const remove = async (id) => { try { await outboxApi.remove(id); load(); } catch (e) { alert(e.message); } };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Offline Outbox Queue</h2>
          <p>Enqueue ops while offline, replay when connectivity returns.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn" onClick={replay}>Replay Pending</button>
        </div>
      </div>

      {err && <div className="ai-error">{err}</div>}

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 24 }}>
          <div><strong>Pending:</strong> {stats.pending || 0}</div>
          <div><strong>Replayed:</strong> {stats.replayed || 0}</div>
          <div><strong>Failed:</strong> {stats.failed || 0}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Enqueue Op</h3>
        <div className="form-grid">
          {['client_op_id', 'device_id', 'endpoint'].map((k) => (
            <div key={k} className="form-group">
              <label>{k}</label>
              <input value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
            </div>
          ))}
          <div className="form-group">
            <label>method</label>
            <select value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value })}>
              {['POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group full-width">
            <label>payload (JSON)</label>
            <textarea value={draft.payload} onChange={(e) => setDraft({ ...draft, payload: e.target.value })} />
          </div>
        </div>
        <button className="btn" onClick={enqueue}>Enqueue</button>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Queue</h3>
        {rows.length === 0 ? <div className="empty-state">Outbox is empty.</div> : (
          <table>
            <thead><tr><th>#</th><th>Status</th><th>Method</th><th>Endpoint</th><th>Device</th><th>Attempts</th><th>Enqueued</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                  <td>{r.method}</td><td><code>{r.endpoint}</code></td>
                  <td>{r.device_id}</td><td>{r.attempt_count}</td>
                  <td>{new Date(r.enqueued_at).toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn danger" onClick={() => remove(r.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

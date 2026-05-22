import React, { useEffect, useState } from 'react';
import { syncOplogApi } from '../services/api';

export default function SyncOplogPage() {
  const [rows, setRows] = useState([]);
  const [clock, setClock] = useState({ vector_clock: {}, per_device: [] });
  const [err, setErr] = useState(null);
  const [draft, setDraft] = useState({ device_id: 'workstation-1', entity: 'mail', op_type: 'update', payload: '{}' });
  const [hb, setHb] = useState({ a: '', b: '', result: null });

  const load = async () => {
    setErr(null);
    try {
      setRows(await syncOplogApi.list({ limit: 100 }));
      setClock(await syncOplogApi.vectorClock());
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const recordOp = async () => {
    try {
      let payload = {}; try { payload = JSON.parse(draft.payload || '{}'); } catch (_) {}
      await syncOplogApi.create({ ...draft, payload });
      load();
    } catch (e) { alert(e.message); }
  };
  const checkHb = async () => {
    try { setHb({ ...hb, result: await syncOplogApi.happensBefore(Number(hb.a), Number(hb.b)) }); }
    catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Sync Vector-Clock / Op Log</h2>
          <p>Per-device Lamport + vector clocks, happens-before queries.</p>
        </div>
      </div>

      {err && <div className="ai-error">{err}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Current Vector Clock</h3>
        <pre style={{ background: '#0b1424', padding: 12, borderRadius: 8 }}>
          {JSON.stringify(clock.vector_clock, null, 2)}
        </pre>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Record Op</h3>
        <div className="form-grid">
          {['device_id', 'entity', 'op_type'].map((k) => (
            <div key={k} className="form-group">
              <label>{k}</label>
              <input value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
            </div>
          ))}
          <div className="form-group full-width">
            <label>payload (JSON)</label>
            <textarea value={draft.payload} onChange={(e) => setDraft({ ...draft, payload: e.target.value })} />
          </div>
        </div>
        <button className="btn" onClick={recordOp}>Record</button>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Happens-Before Query</h3>
        <div className="form-grid">
          <div className="form-group"><label>op id A</label><input value={hb.a} onChange={(e) => setHb({ ...hb, a: e.target.value })} /></div>
          <div className="form-group"><label>op id B</label><input value={hb.b} onChange={(e) => setHb({ ...hb, b: e.target.value })} /></div>
        </div>
        <button className="btn" onClick={checkHb} disabled={!hb.a || !hb.b}>Compare</button>
        {hb.result && <pre style={{ background: '#0b1424', padding: 12, borderRadius: 8, marginTop: 8 }}>{JSON.stringify(hb.result, null, 2)}</pre>}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Op Log</h3>
        {rows.length === 0 ? <div className="empty-state">No ops recorded yet.</div> : (
          <table>
            <thead><tr><th>#</th><th>Device</th><th>Entity</th><th>Op</th><th>Lamport</th><th>VC</th><th>Recorded</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td><td>{r.device_id}</td><td>{r.entity}</td>
                  <td><span className="badge">{r.op_type}</span></td>
                  <td>{r.lamport}</td>
                  <td><code style={{ fontSize: 11 }}>{JSON.stringify(r.vector_clock)}</code></td>
                  <td>{new Date(r.recorded_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

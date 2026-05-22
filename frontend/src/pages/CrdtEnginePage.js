import React, { useEffect, useState } from 'react';
import { crdtApi } from '../services/api';

export default function CrdtEnginePage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [selected, setSelected] = useState(null);
  const [ops, setOps] = useState([]);
  const [newKey, setNewKey] = useState('');
  const [newType, setNewType] = useState('lww-map');
  const [opDraft, setOpDraft] = useState({ op_type: 'set', path: 'name', value: 'Alice', actor: 'device-A' });
  const [resolved, setResolved] = useState(null);

  const loadDocs = async () => {
    setLoading(true); setErr(null);
    try { setDocs(await crdtApi.listDocs()); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadDocs(); }, []);

  const openDoc = async (k) => {
    setSelected(k); setResolved(null);
    try {
      const doc = await crdtApi.getDoc(k);
      setResolved(doc);
      setOps(await crdtApi.listOps(k));
    } catch (e) { setErr(e.message); }
  };

  const createDoc = async () => {
    if (!newKey) return;
    try {
      await crdtApi.createDoc({ doc_key: newKey, doc_type: newType });
      setNewKey('');
      await loadDocs();
    } catch (e) { alert(e.message); }
  };

  const submitOp = async () => {
    if (!selected) return;
    try {
      let value = opDraft.value;
      try { value = JSON.parse(value); } catch (_) { /* keep raw string */ }
      const r = await crdtApi.submitOps(selected, { ops: [{ ...opDraft, value }] });
      setResolved(r.resolved);
      setOps(await crdtApi.listOps(selected));
      loadDocs();
    } catch (e) { alert(e.message); }
  };

  const deleteDoc = async (k) => {
    if (!window.confirm(`Delete document ${k}?`)) return;
    try { await crdtApi.deleteDoc(k); if (selected === k) { setSelected(null); setResolved(null); setOps([]); } loadDocs(); }
    catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>CRDT Sync Engine</h2>
          <p>Submit ops, view replayed resolved state. Supports lww-map and or-set.</p>
        </div>
      </div>

      {err && <div className="ai-error">{err}</div>}

      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>New Document</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Doc Key</label>
            <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="e.g. contact:jane-doe" />
          </div>
          <div className="form-group">
            <label>Doc Type</label>
            <select value={newType} onChange={(e) => setNewType(e.target.value)}>
              <option value="lww-map">lww-map</option>
              <option value="or-set">or-set</option>
            </select>
          </div>
        </div>
        <button className="btn" onClick={createDoc}>Create</button>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Documents</h3>
        {loading ? <div className="empty-state">Loading...</div> : docs.length === 0 ? (
          <div className="empty-state">No CRDT documents yet.</div>
        ) : (
          <table>
            <thead><tr><th>Key</th><th>Type</th><th>Last Op #</th><th>Updated</th><th></th></tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.doc_key}>
                  <td>{d.doc_key}</td>
                  <td><span className="badge">{d.doc_type}</span></td>
                  <td>{d.last_op_id}</td>
                  <td>{new Date(d.updated_at).toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn secondary" onClick={() => openDoc(d.doc_key)} style={{ marginRight: 6 }}>Open</button>
                    <button className="btn danger" onClick={() => deleteDoc(d.doc_key)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Document · {selected}</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Op Type</label>
              <select value={opDraft.op_type} onChange={(e) => setOpDraft({ ...opDraft, op_type: e.target.value })}>
                <option value="set">set</option>
                <option value="delete">delete</option>
                <option value="add">add</option>
                <option value="remove">remove</option>
              </select>
            </div>
            <div className="form-group">
              <label>Path</label>
              <input value={opDraft.path} onChange={(e) => setOpDraft({ ...opDraft, path: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Actor</label>
              <input value={opDraft.actor} onChange={(e) => setOpDraft({ ...opDraft, actor: e.target.value })} />
            </div>
            <div className="form-group full-width">
              <label>Value (JSON or string)</label>
              <textarea value={opDraft.value} onChange={(e) => setOpDraft({ ...opDraft, value: e.target.value })} />
            </div>
          </div>
          <button className="btn" onClick={submitOp}>Submit Op</button>

          <h4>Resolved State</h4>
          <pre style={{ background: '#0b1424', padding: 12, borderRadius: 8 }}>
            {JSON.stringify(resolved, null, 2)}
          </pre>

          <h4>Op Log</h4>
          {ops.length === 0 ? <div className="empty-state">No ops yet.</div> : (
            <table>
              <thead><tr><th>#</th><th>Lamport</th><th>Op</th><th>Path</th><th>Value</th><th>Actor</th></tr></thead>
              <tbody>
                {ops.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id}</td><td>{o.lamport}</td><td><span className="badge">{o.op_type}</span></td>
                    <td>{o.path}</td><td><code>{JSON.stringify(o.value)}</code></td><td>{o.actor}</td>
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

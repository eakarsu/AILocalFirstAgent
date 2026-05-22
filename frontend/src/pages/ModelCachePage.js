import React, { useEffect, useState } from 'react';
import { modelCacheApi } from '../services/api';

export default function ModelCachePage() {
  const [rows, setRows] = useState([]);
  const [quota, setQuota] = useState(null);
  const [err, setErr] = useState(null);
  const [draft, setDraft] = useState({ model_name: '', size_gb: 4, quantization: 'Q4_K_M', pinned: false });

  const load = async () => {
    setErr(null);
    try { setRows(await modelCacheApi.list()); setQuota(await modelCacheApi.quota()); }
    catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    try { await modelCacheApi.create(draft); setDraft({ model_name: '', size_gb: 4, quantization: 'Q4_K_M', pinned: false }); load(); }
    catch (e) { alert(e.message); }
  };
  const pin = async (n) => { try { await modelCacheApi.pin(n); load(); } catch (e) { alert(e.message); } };
  const unpin = async (n) => { try { await modelCacheApi.unpin(n); load(); } catch (e) { alert(e.message); } };
  const evict = async (n) => { try { await modelCacheApi.evict(n); load(); } catch (e) { alert(e.message); } };
  const verify = async (n) => {
    try { const r = await modelCacheApi.verify(n); alert(`Verify ${n}: ${r.ok ? 'OK' : 'FAIL'}\nchecksum=${r.checksum}`); load(); }
    catch (e) { alert(e.message); }
  };
  const remove = async (n) => {
    if (!window.confirm(`Delete cache entry ${n}?`)) return;
    try { await modelCacheApi.remove(n); load(); } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Model Cache Manager</h2>
          <p>Pin / evict / quota / checksum-verify for on-device models.</p>
        </div>
      </div>

      {err && <div className="ai-error">{err}</div>}

      {quota && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 24 }}>
            <div><strong>Models:</strong> {quota.models}</div>
            <div><strong>Used:</strong> {Number(quota.used_gb).toFixed(2)} GB</div>
            <div><strong>Pinned:</strong> {Number(quota.pinned_gb).toFixed(2)} GB</div>
            <div><strong>Free:</strong> {Number(quota.free_gb).toFixed(2)} GB / {quota.quota_gb} GB</div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Cached Models</h3>
        {rows.length === 0 ? <div className="empty-state">No models cached.</div> : (
          <table>
            <thead><tr><th>Name</th><th>Size</th><th>Quant</th><th>Status</th><th>Pinned</th><th>Checksum</th><th>Verified</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><code>{r.model_name}</code></td>
                  <td>{Number(r.size_gb).toFixed(2)} GB</td>
                  <td>{r.quantization || '-'}</td>
                  <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                  <td>{r.pinned ? 'yes' : 'no'}</td>
                  <td style={{ fontSize: 11 }}><code>{(r.checksum || '').slice(0, 16)}…</code></td>
                  <td>{r.last_verified_at ? new Date(r.last_verified_at).toLocaleDateString() : '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {r.pinned
                      ? <button className="btn secondary" onClick={() => unpin(r.model_name)} style={{ marginRight: 4 }}>Unpin</button>
                      : <button className="btn secondary" onClick={() => pin(r.model_name)} style={{ marginRight: 4 }}>Pin</button>}
                    <button className="btn secondary" onClick={() => verify(r.model_name)} style={{ marginRight: 4 }}>Verify</button>
                    <button className="btn secondary" onClick={() => evict(r.model_name)} style={{ marginRight: 4 }}>Evict</button>
                    <button className="btn danger" onClick={() => remove(r.model_name)}>Del</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Add Model</h3>
        <div className="form-grid">
          <div className="form-group"><label>model_name</label><input value={draft.model_name} onChange={(e) => setDraft({ ...draft, model_name: e.target.value })} /></div>
          <div className="form-group"><label>size_gb</label><input type="number" step="0.1" value={draft.size_gb} onChange={(e) => setDraft({ ...draft, size_gb: Number(e.target.value) })} /></div>
          <div className="form-group"><label>quantization</label><input value={draft.quantization} onChange={(e) => setDraft({ ...draft, quantization: e.target.value })} /></div>
          <div className="form-group">
            <label>pinned</label>
            <select value={draft.pinned ? 'yes' : 'no'} onChange={(e) => setDraft({ ...draft, pinned: e.target.value === 'yes' })}>
              <option value="no">no</option><option value="yes">yes</option>
            </select>
          </div>
        </div>
        <button className="btn" onClick={add} disabled={!draft.model_name}>Add</button>
      </div>
    </div>
  );
}

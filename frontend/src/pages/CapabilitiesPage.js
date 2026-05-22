import React, { useEffect, useState } from 'react';
import { capabilitiesApi } from '../services/api';

const BLANK = {
  device_id: 'workstation-1', device_tier: 'workstation', network_class: 'wifi',
  ram_gb: 32, has_gpu: true, available_models: ['llama-3-8b-q4', 'phi-3-mini'],
  client_version: '1.0.0',
};

export default function CapabilitiesPage() {
  const [history, setHistory] = useState([]);
  const [draft, setDraft] = useState(BLANK);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  const load = async () => {
    setErr(null);
    try { setHistory(await capabilitiesApi.list()); } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const negotiate = async () => {
    try {
      const r = await capabilitiesApi.handshake({
        ...draft,
        available_models: Array.isArray(draft.available_models)
          ? draft.available_models
          : String(draft.available_models).split(',').map((s) => s.trim()).filter(Boolean),
      });
      setResult(r);
      load();
    } catch (e) { setErr(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Capability Negotiation</h2>
          <p>Handshake: device tier, network, available models → granted capabilities + recommended route.</p>
        </div>
      </div>

      {err && <div className="ai-error">{err}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Negotiate Handshake</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>device_id</label>
            <input value={draft.device_id} onChange={(e) => setDraft({ ...draft, device_id: e.target.value })} />
          </div>
          <div className="form-group">
            <label>device_tier</label>
            <select value={draft.device_tier} onChange={(e) => setDraft({ ...draft, device_tier: e.target.value })}>
              {['phone', 'tablet', 'laptop', 'workstation', 'server', 'unknown'].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>network_class</label>
            <select value={draft.network_class} onChange={(e) => setDraft({ ...draft, network_class: e.target.value })}>
              {['offline', 'cellular', 'wifi', 'ethernet'].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>ram_gb</label>
            <input type="number" value={draft.ram_gb} onChange={(e) => setDraft({ ...draft, ram_gb: Number(e.target.value) })} />
          </div>
          <div className="form-group">
            <label>has_gpu</label>
            <select value={draft.has_gpu ? 'yes' : 'no'} onChange={(e) => setDraft({ ...draft, has_gpu: e.target.value === 'yes' })}>
              <option value="yes">yes</option><option value="no">no</option>
            </select>
          </div>
          <div className="form-group full-width">
            <label>available_models (comma-separated)</label>
            <input value={Array.isArray(draft.available_models) ? draft.available_models.join(',') : draft.available_models}
              onChange={(e) => setDraft({ ...draft, available_models: e.target.value })} />
          </div>
        </div>
        <button className="btn" onClick={negotiate}>Negotiate</button>

        {result && (
          <pre style={{ background: '#0b1424', padding: 12, borderRadius: 8, marginTop: 8 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Recent Handshakes</h3>
        {history.length === 0 ? <div className="empty-state">No handshakes yet.</div> : (
          <table>
            <thead><tr><th>Device</th><th>Tier</th><th>Net</th><th>RAM</th><th>GPU</th><th>Caps</th><th>At</th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{h.device_id}</td><td>{h.device_tier}</td><td>{h.network_class}</td>
                  <td>{h.ram_gb}</td><td>{h.has_gpu ? 'yes' : 'no'}</td>
                  <td>{(h.granted_capabilities || []).slice(0, 4).join(', ')}{(h.granted_capabilities || []).length > 4 ? '…' : ''}</td>
                  <td>{new Date(h.negotiated_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

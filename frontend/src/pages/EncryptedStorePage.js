import React, { useEffect, useState } from 'react';
import { encryptedStoreApi } from '../services/api';

export default function EncryptedStorePage() {
  const [keys, setKeys] = useState([]);
  const [entries, setEntries] = useState([]);
  const [err, setErr] = useState(null);
  const [seal, setSeal] = useState({ plaintext: '', result: null });
  const [draft, setDraft] = useState({ namespace: 'mail', store_key: 'inbox/2026-05', ciphertext: '', iv: '', key_id: '', algo: 'aes-256-gcm' });

  const reload = async () => {
    setErr(null);
    try {
      setKeys(await encryptedStoreApi.listKeys());
      setEntries(await encryptedStoreApi.listEntries());
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { reload(); }, []);

  const createKey = async () => {
    try { await encryptedStoreApi.createKey({}); reload(); } catch (e) { alert(e.message); }
  };
  const rotateKey = async (key_id) => {
    try { await encryptedStoreApi.rotateKey(key_id); reload(); } catch (e) { alert(e.message); }
  };
  const doSeal = async () => {
    try {
      const r = await encryptedStoreApi.sealDemo({ plaintext: seal.plaintext });
      setSeal({ ...seal, result: r });
      setDraft({ ...draft, ciphertext: r.ciphertext, iv: r.iv, key_id: r.key_id, algo: r.algo });
    } catch (e) { alert(e.message); }
  };
  const putEntry = async () => {
    try { await encryptedStoreApi.putEntry(draft); reload(); } catch (e) { alert(e.message); }
  };
  const removeEntry = async (ns, key) => {
    if (!window.confirm(`Delete ${ns}/${key}?`)) return;
    try { await encryptedStoreApi.deleteEntry(ns, key); reload(); } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Encrypted Local Store</h2>
          <p>Backend facade: server stores opaque ciphertext + IV + key_id only. Plaintext never crosses the wire.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn" onClick={createKey}>+ New Key</button>
        </div>
      </div>

      {err && <div className="ai-error">{err}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Keys</h3>
        {keys.length === 0 ? <div className="empty-state">No keys yet.</div> : (
          <table>
            <thead><tr><th>Key ID</th><th>Algo</th><th>Active</th><th>Rotated From</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td><code>{k.key_id}</code></td>
                  <td>{k.algo}</td>
                  <td>{k.active ? 'yes' : 'no'}</td>
                  <td>{k.rotated_from || '-'}</td>
                  <td>{new Date(k.created_at).toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn secondary" onClick={() => rotateKey(k.key_id)}>Rotate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Seal Demo (server-side AES-256-GCM)</h3>
        <div className="form-grid">
          <div className="form-group full-width">
            <label>Plaintext</label>
            <textarea value={seal.plaintext} onChange={(e) => setSeal({ ...seal, plaintext: e.target.value })} />
          </div>
        </div>
        <button className="btn" onClick={doSeal}>Seal</button>
        {seal.result && (
          <pre style={{ background: '#0b1424', padding: 12, borderRadius: 8, marginTop: 8 }}>
            {JSON.stringify(seal.result, null, 2)}
          </pre>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Put Entry</h3>
        <div className="form-grid">
          {['namespace', 'store_key', 'key_id', 'algo'].map((k) => (
            <div key={k} className="form-group">
              <label>{k}</label>
              <input value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
            </div>
          ))}
          <div className="form-group full-width">
            <label>iv (base64)</label>
            <input value={draft.iv} onChange={(e) => setDraft({ ...draft, iv: e.target.value })} />
          </div>
          <div className="form-group full-width">
            <label>ciphertext (base64)</label>
            <textarea value={draft.ciphertext} onChange={(e) => setDraft({ ...draft, ciphertext: e.target.value })} />
          </div>
        </div>
        <button className="btn" onClick={putEntry}>Save</button>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Entries</h3>
        {entries.length === 0 ? <div className="empty-state">No entries.</div> : (
          <table>
            <thead><tr><th>Namespace</th><th>Key</th><th>KeyId</th><th>Algo</th><th>Size</th><th>Updated</th><th></th></tr></thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{e.namespace}</td><td>{e.store_key}</td><td><code>{e.key_id}</code></td>
                  <td>{e.algo}</td><td>{e.size_bytes} B</td>
                  <td>{new Date(e.updated_at).toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn danger" onClick={() => removeEntry(e.namespace, e.store_key)}>Delete</button>
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

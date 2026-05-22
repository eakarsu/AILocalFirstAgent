import React, { useEffect, useState } from 'react';
import { pluginsApi } from '../services/api';

const BLANK = {
  slug: '', name: '', version: '0.1.0', publisher: '', description: '',
  capabilities: [], permissions: [], entry_point: '', enabled: true,
};

export default function PluginsPage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(BLANK);

  const load = async () => {
    setErr(null);
    try { setRows(await pluginsApi.list()); } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setDraft(BLANK); };
  const openEdit = (r) => {
    setEditing(r.slug);
    setDraft({
      slug: r.slug, name: r.name, version: r.version, publisher: r.publisher || '',
      description: r.description || '', entry_point: r.entry_point || '',
      capabilities: Array.isArray(r.capabilities) ? r.capabilities : [],
      permissions: Array.isArray(r.permissions) ? r.permissions : [],
      enabled: !!r.enabled,
    });
  };
  const save = async () => {
    try {
      if (editing) await pluginsApi.update(editing, draft);
      else await pluginsApi.create(draft);
      setEditing(null); setDraft(BLANK); load();
    } catch (e) { alert(e.message); }
  };
  const remove = async (slug) => {
    if (!window.confirm(`Delete plugin ${slug}?`)) return;
    try { await pluginsApi.remove(slug); load(); } catch (e) { alert(e.message); }
  };
  const toggle = async (r) => {
    try { await pluginsApi.update(r.slug, { enabled: !r.enabled }); load(); } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Plugin Manifests</h2>
          <p>Extension registry. Each plugin declares capabilities + permissions.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn" onClick={openNew}>+ New Plugin</button>
        </div>
      </div>

      {err && <div className="ai-error">{err}</div>}

      <div className="card">
        {rows.length === 0 ? <div className="empty-state">No plugins yet.</div> : (
          <table>
            <thead><tr><th>Slug</th><th>Name</th><th>Version</th><th>Capabilities</th><th>Enabled</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.slug}>
                  <td><code>{r.slug}</code></td>
                  <td>{r.name}</td>
                  <td>{r.version}</td>
                  <td>{(r.capabilities || []).map((c) => <span key={c} className="badge" style={{ marginRight: 4 }}>{c}</span>)}</td>
                  <td>
                    <button className="btn secondary" onClick={() => toggle(r)}>
                      {r.enabled ? 'enabled' : 'disabled'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn secondary" onClick={() => openEdit(r)} style={{ marginRight: 6 }}>Edit</button>
                    <button className="btn danger" onClick={() => remove(r.slug)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>{editing ? `Edit ${editing}` : 'New Plugin'}</h3>
        <div className="form-grid">
          {['slug', 'name', 'version', 'publisher', 'entry_point'].map((k) => (
            <div key={k} className="form-group">
              <label>{k}</label>
              <input value={draft[k]} disabled={editing && k === 'slug'} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
            </div>
          ))}
          <div className="form-group full-width">
            <label>description</label>
            <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label>capabilities (comma-separated)</label>
            <input value={(draft.capabilities || []).join(',')} onChange={(e) => setDraft({ ...draft, capabilities: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
          </div>
          <div className="form-group">
            <label>permissions (comma-separated)</label>
            <input value={(draft.permissions || []).join(',')} onChange={(e) => setDraft({ ...draft, permissions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
          </div>
        </div>
        <button className="btn" onClick={save}>{editing ? 'Save Changes' : 'Create'}</button>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { syncRulesApi } from '../services/api';

const ENTITIES = ['mail', 'files', 'messages', 'calendar', 'contacts'];
const CONFLICT_TYPES = ['update-update', 'delete-update', 'duplicate-id', 'schema-drift', 'timestamp-skew'];
const STRATEGIES = ['last-write-wins', 'three-way-merge', 'prefer-local', 'prefer-remote', 'manual-merge', 'reject'];

const EMPTY = { name: '', entity: 'mail', conflict_type: 'update-update', strategy: 'last-write-wins', priority: 100, active: true, notes: '' };

// NON-VIZ: CRUD editor for sync/conflict resolution rules
export default function SyncRulesEditor() {
  const [rules, setRules] = useState([]);
  const [editing, setEditing] = useState(null); // id being edited
  const [draft, setDraft] = useState(EMPTY);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setBusy(true); setErr(null);
    syncRulesApi.list().then(setRules).catch((e) => setErr(e.message)).finally(() => setBusy(false));
  };
  useEffect(() => { load(); }, []);

  const startEdit = (r) => { setEditing(r.id); setDraft({ ...EMPTY, ...r, notes: r.notes || '' }); };
  const startNew = () => { setEditing('new'); setDraft(EMPTY); };
  const cancel = () => { setEditing(null); setDraft(EMPTY); };

  const save = async () => {
    setErr(null);
    if (!draft.name?.trim()) return setErr('Name is required');
    try {
      if (editing === 'new') await syncRulesApi.create(draft);
      else await syncRulesApi.update(editing, draft);
      cancel(); load();
    } catch (e) { setErr(e.message); }
  };

  const remove = async (id) => {
    setErr(null);
    if (!window.confirm('Delete this rule?')) return;
    try { await syncRulesApi.remove(id); load(); }
    catch (e) { setErr(e.message); }
  };

  return (
    <div className="card" data-testid="sync-rules-editor">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>Sync / Conflict Resolution Rules</h3>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 12 }}>
            Define strategies for each (entity, conflict_type). Lower priority runs first.
          </p>
        </div>
        {!editing && <button className="btn" onClick={startNew}>+ New rule</button>}
      </div>
      {err && <div className="ai-error">{err}</div>}

      {editing && (
        <div style={{ background: '#0b1424', border: '1px solid #1e293b', borderRadius: 6, padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <Field label="Name"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="Entity">
              <select value={draft.entity} onChange={(e) => setDraft({ ...draft, entity: e.target.value })}>
                {ENTITIES.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Conflict type">
              <select value={draft.conflict_type} onChange={(e) => setDraft({ ...draft, conflict_type: e.target.value })}>
                {CONFLICT_TYPES.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Strategy">
              <select value={draft.strategy} onChange={(e) => setDraft({ ...draft, strategy: e.target.value })}>
                {STRATEGIES.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Priority"><input type="number" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: parseInt(e.target.value, 10) || 100 })} /></Field>
            <Field label="Active">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e2e8f0', paddingTop: 6 }}>
                <input type="checkbox" checked={!!draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> enabled
              </label>
            </Field>
          </div>
          <div style={{ marginTop: 8 }}>
            <Field label="Notes"><textarea rows={2} value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn" onClick={save}>Save</button>
            <button className="btn secondary" onClick={cancel}>Cancel</button>
          </div>
        </div>
      )}

      {busy && !rules.length && <div style={{ color: '#94a3b8' }}>Loading...</div>}
      <div style={{ border: '1px solid #1e293b', borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#0b1424' }}>
            <tr style={{ color: '#94a3b8', textAlign: 'left' }}>
              <th style={{ padding: 8 }}>Prio</th><th>Name</th><th>Entity</th><th>Conflict</th><th>Strategy</th><th>Active</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 12, color: '#64748b', textAlign: 'center' }}>No rules yet — add one to get started.</td></tr>
            )}
            {rules.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #1e293b' }}>
                <td style={{ padding: 8, color: '#94a3b8', fontFamily: 'Menlo,monospace' }}>{r.priority}</td>
                <td style={{ color: '#e2e8f0', fontWeight: 600 }}>{r.name}</td>
                <td>{r.entity}</td>
                <td><code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4 }}>{r.conflict_type}</code></td>
                <td><code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4 }}>{r.strategy}</code></td>
                <td>{r.active ? <span style={{ color: '#22c55e' }}>yes</span> : <span style={{ color: '#64748b' }}>no</span>}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn secondary" style={{ padding: '2px 8px', fontSize: 11, marginRight: 4 }} onClick={() => startEdit(r)}>Edit</button>
                  <button className="btn secondary" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => remove(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
      {label}
      <div style={{ marginTop: 4 }}>
        {React.cloneElement(children, {
          style: { width: '100%', background: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0', borderRadius: 4, padding: '6px 8px', fontSize: 13, ...(children.props.style || {}) },
        })}
      </div>
    </label>
  );
}

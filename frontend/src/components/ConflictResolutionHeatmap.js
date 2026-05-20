import React, { useEffect, useMemo, useState } from 'react';
import { getConflictHeatmap } from '../services/api';

// VIZ: Conflict resolution heatmap — entity (rows) x conflict_type (cols)
export default function ConflictResolutionHeatmap() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    getConflictHeatmap().then(setData).catch((e) => setErr(e.message));
  }, []);

  const max = useMemo(() => {
    if (!data || !data.matrix) return 1;
    return Math.max(1, ...data.matrix.flat());
  }, [data]);

  const total = useMemo(() => data && data.cells ? data.cells.reduce((s, c) => s + (c.total || 0), 0) : 0, [data]);
  const resolved = useMemo(() => data && data.cells ? data.cells.reduce((s, c) => s + (c.resolved || 0), 0) : 0, [data]);

  return (
    <div className="card" data-testid="conflict-heatmap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>Conflict Resolution Heatmap</h3>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 12 }}>
            Conflicts grouped by entity and type. Darker = more conflicts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
          <span style={{ color: '#94a3b8' }}>Total: <b style={{ color: '#e2e8f0' }}>{total}</b></span>
          <span style={{ color: '#94a3b8' }}>Resolved: <b style={{ color: '#22c55e' }}>{resolved}</b></span>
        </div>
      </div>
      {err && <div className="ai-error">{err}</div>}
      {!data && !err && <div style={{ color: '#94a3b8' }}>Loading...</div>}
      {data && (
        <div style={{ overflow: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: 8, color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'left' }}>Entity</th>
                {data.conflict_types.map((t) => (
                  <th key={t} style={{ padding: 8, color: '#94a3b8', fontSize: 11, textAlign: 'center' }}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.entities.map((e, ei) => (
                <tr key={e}>
                  <td style={{ padding: 8, fontWeight: 600, color: '#e2e8f0' }}>{e}</td>
                  {data.conflict_types.map((t, ti) => {
                    const v = data.matrix[ei][ti] || 0;
                    const intensity = v / max;
                    const bg = `rgba(56, 189, 248, ${0.08 + intensity * 0.7})`;
                    const cell = data.cells.find((c) => c.entity === e && c.conflict_type === t);
                    const title = cell
                      ? `${e} / ${t}\ntotal=${cell.total} resolved=${cell.resolved} auto=${cell.auto_resolved}`
                      : `${e} / ${t}\nno conflicts`;
                    return (
                      <td key={t} title={title}
                        style={{ padding: 0, border: '1px solid #0b1424' }}>
                        <div style={{
                          background: v ? bg : '#0b1424',
                          color: intensity > 0.4 ? '#0b1424' : '#e2e8f0',
                          fontWeight: 600,
                          textAlign: 'center',
                          padding: '18px 10px',
                          minWidth: 60,
                        }}>{v}</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10, fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>fewer</span>
            <div style={{ flex: 1, height: 8, background: 'linear-gradient(to right, rgba(56,189,248,0.08), rgba(56,189,248,0.78))', borderRadius: 4 }} />
            <span>more</span>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { getSyncTimeline } from '../services/api';

// VIZ: Sync activity timeline — stacked hourly buckets by status
export default function SyncActivityTimeline() {
  const [hours, setHours] = useState(48);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = (h) => {
    setBusy(true); setErr(null);
    getSyncTimeline(h).then(setData).catch((e) => setErr(e.message)).finally(() => setBusy(false));
  };
  useEffect(() => { load(hours); /* eslint-disable-next-line */ }, [hours]);

  const chart = useMemo(() => {
    if (!data || !data.buckets) return null;
    const byBucket = new Map();
    for (const b of data.buckets) {
      const k = b.bucket;
      if (!byBucket.has(k)) byBucket.set(k, { ts: k, success: 0, conflict: 0, failed: 0, items: 0 });
      const row = byBucket.get(k);
      if (b.status === 'success') row.success += b.events;
      else if (b.status === 'conflict') row.conflict += b.events;
      else if (b.status === 'failed') row.failed += b.events;
      row.items += b.items;
    }
    return [...byBucket.values()].sort((a, b) => new Date(a.ts) - new Date(b.ts));
  }, [data]);

  const max = useMemo(() => chart ? Math.max(1, ...chart.map((r) => r.success + r.conflict + r.failed)) : 1, [chart]);

  return (
    <div className="card" data-testid="sync-timeline">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>Sync Activity Timeline</h3>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 12 }}>
            Hourly stacked events by status across devices. Window: {hours}h.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[12, 24, 48, 72, 168].map((h) => (
            <button key={h} className={`btn ${h === hours ? '' : 'secondary'}`} style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setHours(h)}>{h}h</button>
          ))}
        </div>
      </div>
      {err && <div className="ai-error">{err}</div>}
      {busy && !chart && <div style={{ color: '#94a3b8' }}>Loading...</div>}
      {data && (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
            <Stat label="Events" value={data.summary?.total_events ?? 0} color="#38bdf8" />
            <Stat label="Items" value={data.summary?.total_items ?? 0} color="#22d3ee" />
            <Stat label="Avg latency" value={`${data.summary?.avg_latency_ms ?? 0}ms`} color="#a78bfa" />
            <Stat label="Conflicts" value={data.summary?.conflicts ?? 0} color="#facc15" />
            <Stat label="Failures" value={data.summary?.failures ?? 0} color="#f87171" />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 180, padding: '0 4px', background: '#0b1424', border: '1px solid #1e293b', borderRadius: 8 }}>
            {chart && chart.length === 0 && <div style={{ color: '#64748b', margin: 'auto' }}>No events in window</div>}
            {chart && chart.map((row) => {
              const total = row.success + row.conflict + row.failed;
              const h = (total / max) * 160;
              return (
                <div key={row.ts} title={`${new Date(row.ts).toLocaleString()}\nok=${row.success} conflict=${row.conflict} failed=${row.failed}`}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column-reverse', height: h, minHeight: 2 }}>
                  <div style={{ background: '#22c55e', height: total ? `${(row.success / total) * 100}%` : 0 }} />
                  <div style={{ background: '#facc15', height: total ? `${(row.conflict / total) * 100}%` : 0 }} />
                  <div style={{ background: '#ef4444', height: total ? `${(row.failed / total) * 100}%` : 0 }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#22c55e', marginRight: 4 }} />success</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#facc15', marginRight: 4 }} />conflict</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#ef4444', marginRight: 4 }} />failed</span>
          </div>
          {data.latest && data.latest.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Recent events</div>
              <div style={{ maxHeight: 160, overflow: 'auto', border: '1px solid #1e293b', borderRadius: 6 }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: '#94a3b8', textAlign: 'left' }}>
                      <th style={{ padding: 6 }}>Time</th><th>Entity</th><th>Action</th><th>Device</th><th>Status</th><th>Items</th><th>Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.latest.map((r) => (
                      <tr key={r.id} style={{ borderTop: '1px solid #1e293b' }}>
                        <td style={{ padding: 6, color: '#cbd5e1' }}>{new Date(r.occurred_at).toLocaleTimeString()}</td>
                        <td style={{ color: '#e2e8f0' }}>{r.entity}</td>
                        <td>{r.action}</td>
                        <td>{r.device}</td>
                        <td><StatusPill s={r.status} /></td>
                        <td>{r.item_count}</td>
                        <td>{r.latency_ms}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ background: '#0b1424', border: '1px solid #1e293b', borderRadius: 6, padding: '8px 12px', minWidth: 100 }}>
      <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 20, color, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
function StatusPill({ s }) {
  const map = { success: '#22c55e', conflict: '#facc15', failed: '#ef4444' };
  return <span style={{ background: map[s] || '#475569', color: '#0b1424', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{s}</span>;
}

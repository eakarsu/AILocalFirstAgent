import React, { useState } from 'react';
import { downloadSyncLogPdf } from '../services/api';

// NON-VIZ: trigger a server-rendered PDF export of the sync log
export default function SyncLogPdfExporter() {
  const [limit, setLimit] = useState(100);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);

  const onExport = async () => {
    setBusy(true); setErr(null); setOk(null);
    try {
      await downloadSyncLogPdf(limit);
      setOk(`Downloaded ${limit} rows as PDF.`);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="card" data-testid="sync-log-pdf">
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Sync Log PDF Export</h3>
        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 12 }}>
          Render the most recent sync events as a printable PDF (server-generated).
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, color: '#94a3b8' }}>Rows
          <select value={limit} onChange={(e) => setLimit(parseInt(e.target.value, 10))}
            style={{ marginLeft: 8, background: '#0b1424', color: '#e2e8f0', border: '1px solid #1e293b', borderRadius: 4, padding: '4px 8px' }}>
            {[25, 50, 100, 200, 500].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button className="btn" onClick={onExport} disabled={busy}>
          {busy ? 'Generating PDF...' : 'Download sync-log.pdf'}
        </button>
        {ok && <span style={{ color: '#22c55e', fontSize: 12 }}>{ok}</span>}
        {err && <span className="ai-error" style={{ padding: '4px 8px' }}>{err}</span>}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: '#64748b' }}>
        Output is a multi-column table (time, status, entity, action, device, items, latency).
      </div>
    </div>
  );
}

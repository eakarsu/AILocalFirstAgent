import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats } from '../services/api';

const FEATURES = [
  { path: '/indexed-sources', title: 'Indexed Sources', icon: 'I', color: '#3b82f6', desc: 'Manage indexed sources.' },
  { path: '/scheduled-macros', title: 'Scheduled Macros', icon: 'M', color: '#3b82f6', desc: 'Manage scheduled macros.' },
  { path: '/agent-runs', title: 'Agent Runs', icon: 'R', color: '#3b82f6', desc: 'Manage agent runs.' },
  { path: '/on-device-models', title: 'On-Device Models', icon: 'O', color: '#3b82f6', desc: 'Manage on-device models.' },
  { path: '/privacy-audit-log', title: 'Privacy Audit', icon: 'P', color: '#3b82f6', desc: 'Manage privacy audit.' },
  { path: '/file-index-entries', title: 'File Index', icon: 'F', color: '#3b82f6', desc: 'Manage file index.' },
  { path: '/ai/local-task-plan', title: 'AI · Plan Local Task', icon: '*', color: '#8b5cf6', desc: 'Plan Local Task' },
  { path: '/ai/file-semantic-search', title: 'AI · Semantic File Search', icon: '*', color: '#8b5cf6', desc: 'Semantic File Search' },
  { path: '/ai/scheduled-macro', title: 'AI · Define Scheduled Macro', icon: '*', color: '#8b5cf6', desc: 'Define Scheduled Macro' },
  { path: '/ai/draft-reply', title: 'AI · Draft Email Reply', icon: '*', color: '#8b5cf6', desc: 'Draft Email Reply' },
  { path: '/ai/weekly-summary', title: 'AI · Weekly Summary', icon: '*', color: '#8b5cf6', desc: 'Weekly Summary' },
  { path: '/ai/privacy-classifier', title: 'AI · Privacy Classifier', icon: '*', color: '#8b5cf6', desc: 'Privacy Classifier' },
  { path: '/ai/model-router-select', title: 'AI · Model Router', icon: '*', color: '#8b5cf6', desc: 'Model Router' },
  { path: '/ai/conflict-finder', title: 'AI · Conflict Finder', icon: '*', color: '#8b5cf6', desc: 'Conflict Finder' },
  { path: '/ai/daily-digest', title: 'AI · Daily Digest', icon: '*', color: '#8b5cf6', desc: 'Daily Digest' }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { getDashboardStats().then(setStats).catch((e) => setErr(e.message)); }, []);

  return (
    <div>
      <div className="dashboard-header">
        <h2>Local-First Agent Console</h2>
        <p>Private on-device AI — files, mail, messages without exfiltration.</p>
      </div>
      {err && <div className="ai-error">Stats unavailable: {err}</div>}
      {stats && (
        <div className="stats-grid">
          <div className="stat"><div className="stat-label">Indexed Sources</div><div className="stat-value">{stats.indexed_sources?.total ?? '—'}</div></div>
          <div className="stat"><div className="stat-label">Scheduled Macros</div><div className="stat-value">{stats.scheduled_macros?.total ?? '—'}</div></div>
          <div className="stat"><div className="stat-label">Agent Runs</div><div className="stat-value">{stats.agent_runs?.total ?? '—'}</div></div>
          <div className="stat"><div className="stat-label">On-Device Models</div><div className="stat-value">{stats.on_device_models?.total ?? '—'}</div></div>
          <div className="stat"><div className="stat-label">Privacy Audit</div><div className="stat-value">{stats.privacy_audit_log?.total ?? '—'}</div></div>
          <div className="stat"><div className="stat-label">File Index</div><div className="stat-value">{stats.file_index_entries?.total ?? '—'}</div></div>
        </div>
      )}
      <h3 style={{ color: '#cbd5e1', margin: '8px 0 14px', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 }}>Capabilities</h3>
      <div className="feature-grid">
        {FEATURES.map((f) => (
          <div key={f.path} className="feature-card" style={{ ['--card-color']: f.color }} onClick={() => navigate(f.path)}>
            <div className="feature-card-icon" style={{ background: f.color + '22', color: f.color }}>{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

import React from 'react';
import { NavLink } from 'react-router-dom';
import { logout, getStoredUser } from '../services/api';

const CRUD_LINKS = [
  { to: '/indexed-sources', label: 'Indexed Sources' },
  { to: '/scheduled-macros', label: 'Scheduled Macros' },
  { to: '/agent-runs', label: 'Agent Runs' },
  { to: '/on-device-models', label: 'On-Device Models' },
  { to: '/privacy-audit-log', label: 'Privacy Audit' },
  { to: '/file-index-entries', label: 'File Index' },
];

const AI_LINKS = [
  { to: '/ai/local-task-plan', label: 'AI · Plan Local Task' },
  { to: '/ai/file-semantic-search', label: 'AI · Semantic File Search' },
  { to: '/ai/scheduled-macro', label: 'AI · Define Scheduled Macro' },
  { to: '/ai/draft-reply', label: 'AI · Draft Email Reply' },
  { to: '/ai/weekly-summary', label: 'AI · Weekly Summary' },
  { to: '/ai/privacy-classifier', label: 'AI · Privacy Classifier' },
  { to: '/ai/model-router-select', label: 'AI · Model Router' },
  { to: '/ai/conflict-finder', label: 'AI · Conflict Finder' },
  { to: '/ai/daily-digest', label: 'AI · Daily Digest' },
  // Apply pass 7
  { to: '/ai/local-fallback-orchestrator', label: 'AI · Local Fallback Orchestrator' },
  { to: '/ai/conflict-auto-resolver', label: 'AI · Conflict Auto-Resolver' },
  { to: '/ai/rag-rerank-planner', label: 'AI · RAG Re-Rank Planner' },
  { to: '/ai/prompt-redaction-rewriter', label: 'AI · Prompt Redaction Rewriter' },
];

const CUSTOM_LINKS = [
  { to: '/wb/macro-scheduler', label: 'Macro Scheduler' },
  { to: '/custom-views', label: 'Sync Views' },
];

// Apply pass 7: local-first infrastructure
const INFRA_LINKS = [
  { to: '/crdt', label: 'CRDT Engine' },
  { to: '/encrypted-store', label: 'Encrypted Store' },
  { to: '/plugins', label: 'Plugin Manifests' },
  { to: '/capabilities', label: 'Capability Handshake' },
  { to: '/outbox', label: 'Offline Outbox' },
  { to: '/sync-oplog', label: 'Sync Op Log' },
  { to: '/privacy-budget', label: 'Privacy Budget' },
  { to: '/model-cache', label: 'Model Cache' },
];

export default function Sidebar() {
  const user = getStoredUser();
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <h1>LOCAL-FIRST AGENT CONSOLE</h1>
        <p>Private on-device AI — files, mail, messages without exfiltration.</p>
      </div>
      <NavLink to="/" end>Dashboard</NavLink>
      <div className="sidebar-group-label">Data</div>
      {CRUD_LINKS.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}
      <div className="sidebar-group-label">AI Features</div>
      {AI_LINKS.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}
      {CUSTOM_LINKS.length > 0 && <div className="sidebar-group-label">Workbenches</div>}
      {CUSTOM_LINKS.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}
      <div className="sidebar-group-label">Local-First Infra</div>
      {INFRA_LINKS.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}
      <div className="sidebar-user">
        {user && (
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name || user.email}</div>
            <div className="sidebar-user-role">{user.role || 'user'}</div>
          </div>
        )}
        <button className="btn secondary sidebar-logout" onClick={logout}>Sign Out</button>
      </div>
    </nav>
  );
}

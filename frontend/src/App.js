import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import IndexedSourcesPage from './pages/IndexedSourcesPage';
import ScheduledMacrosPage from './pages/ScheduledMacrosPage';
import AgentRunsPage from './pages/AgentRunsPage';
import OnDeviceModelsPage from './pages/OnDeviceModelsPage';
import PrivacyAuditLogPage from './pages/PrivacyAuditLogPage';
import FileIndexEntriesPage from './pages/FileIndexEntriesPage';
import AILocalTaskPlanPage from './pages/AILocalTaskPlanPage';
import AIFileSemanticSearchPage from './pages/AIFileSemanticSearchPage';
import AIScheduledMacroPage from './pages/AIScheduledMacroPage';
import AIDraftReplyPage from './pages/AIDraftReplyPage';
import AIWeeklySummaryPage from './pages/AIWeeklySummaryPage';
import AIPrivacyClassifierPage from './pages/AIPrivacyClassifierPage';
import AIModelRouterSelectPage from './pages/AIModelRouterSelectPage';
import AIConflictFinderPage from './pages/AIConflictFinderPage';
import AIDailyDigestPage from './pages/AIDailyDigestPage';
import MacroSchedulerWorkbench from './pages/MacroSchedulerWorkbench';
import CustomViewsPage from './pages/CustomViewsPage';
import { getToken } from './services/api';
import './App.css';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

// Apply pass 7: full backlog implementation
import AILocalFallbackOrchestratorPage from './pages/AILocalFallbackOrchestratorPage';
import AIConflictAutoResolverPage from './pages/AIConflictAutoResolverPage';
import AIRagRerankPlannerPage from './pages/AIRagRerankPlannerPage';
import AIPromptRedactionRewriterPage from './pages/AIPromptRedactionRewriterPage';
import CrdtEnginePage from './pages/CrdtEnginePage';
import EncryptedStorePage from './pages/EncryptedStorePage';
import PluginsPage from './pages/PluginsPage';
import CapabilitiesPage from './pages/CapabilitiesPage';
import OutboxQueuePage from './pages/OutboxQueuePage';
import SyncOplogPage from './pages/SyncOplogPage';
import PrivacyBudgetPage from './pages/PrivacyBudgetPage';
import ModelCachePage from './pages/ModelCachePage';
import ConflictProvenanceTimelinePage from './pages/ConflictProvenanceTimelinePage';

function RequireAuth({ children }) {
  const location = useLocation();
  if (!getToken()) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function Shell() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main" style={{ padding: 0 }}>
        <Topbar />
        <div style={{ padding: '24px 32px' }}>
          <Routes>
        <Route path="/insights/timeline" element={<TimelineView />} />
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

            <Route path="/" element={<Dashboard />} />
            <Route path="/indexed-sources" element={<IndexedSourcesPage />} />
            <Route path="/scheduled-macros" element={<ScheduledMacrosPage />} />
            <Route path="/agent-runs" element={<AgentRunsPage />} />
            <Route path="/on-device-models" element={<OnDeviceModelsPage />} />
            <Route path="/privacy-audit-log" element={<PrivacyAuditLogPage />} />
            <Route path="/file-index-entries" element={<FileIndexEntriesPage />} />
            <Route path="/ai/local-task-plan" element={<AILocalTaskPlanPage />} />
            <Route path="/ai/file-semantic-search" element={<AIFileSemanticSearchPage />} />
            <Route path="/ai/scheduled-macro" element={<AIScheduledMacroPage />} />
            <Route path="/ai/draft-reply" element={<AIDraftReplyPage />} />
            <Route path="/ai/weekly-summary" element={<AIWeeklySummaryPage />} />
            <Route path="/ai/privacy-classifier" element={<AIPrivacyClassifierPage />} />
            <Route path="/ai/model-router-select" element={<AIModelRouterSelectPage />} />
            <Route path="/ai/conflict-finder" element={<AIConflictFinderPage />} />
            <Route path="/ai/daily-digest" element={<AIDailyDigestPage />} />
            <Route path="/wb/macro-scheduler" element={<MacroSchedulerWorkbench />} />
            <Route path="/custom-views" element={<CustomViewsPage />} />
            {/* Apply pass 7 routes */}
            <Route path="/ai/local-fallback-orchestrator" element={<AILocalFallbackOrchestratorPage />} />
            <Route path="/ai/conflict-auto-resolver" element={<AIConflictAutoResolverPage />} />
            <Route path="/ai/rag-rerank-planner" element={<AIRagRerankPlannerPage />} />
            <Route path="/ai/prompt-redaction-rewriter" element={<AIPromptRedactionRewriterPage />} />
            <Route path="/crdt" element={<CrdtEnginePage />} />
            <Route path="/encrypted-store" element={<EncryptedStorePage />} />
            <Route path="/plugins" element={<PluginsPage />} />
            <Route path="/capabilities" element={<CapabilitiesPage />} />
            <Route path="/outbox" element={<OutboxQueuePage />} />
            <Route path="/sync-oplog" element={<SyncOplogPage />} />
            <Route path="/privacy-budget" element={<PrivacyBudgetPage />} />
            <Route path="/model-cache" element={<ModelCachePage />} />
            <Route path="/conflict-provenance-timeline" element={<ConflictProvenanceTimelinePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<RequireAuth><Shell /></RequireAuth>} />
      </Routes>
    </Router>
  );
}

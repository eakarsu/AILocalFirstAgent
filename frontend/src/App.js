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

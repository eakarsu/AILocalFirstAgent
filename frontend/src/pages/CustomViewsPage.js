import React from 'react';
import SyncActivityTimeline from '../components/SyncActivityTimeline';
import ConflictResolutionHeatmap from '../components/ConflictResolutionHeatmap';
import SyncLogPdfExporter from '../components/SyncLogPdfExporter';
import SyncRulesEditor from '../components/SyncRulesEditor';

export default function CustomViewsPage() {
  return (
    <div data-testid="custom-views-page">
      <div className="page-header">
        <div>
          <h2>Sync Views</h2>
          <p>Custom views over local-first sync: activity, conflicts, exports, and resolution rules.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        <SyncActivityTimeline />
        <ConflictResolutionHeatmap />
        <SyncLogPdfExporter />
        <SyncRulesEditor />
      </div>
    </div>
  );
}

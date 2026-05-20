import React from 'react';
import AIPage from '../components/AIPage';
import { aiWeeklySummary } from '../services/api';

export default function AIWeeklySummaryPage() {
  return (
    <AIPage
      title="AI · Weekly Summary"
      feature="weekly-summary"
      subtitle="Weekly Summary"
      inputs={[
        { key: 'focus_area', label: 'Focus Area', type: 'text', placeholder: 'e.g. work email, projects, calendar' },
        { key: 'time_range', label: 'Time Range', type: 'text', placeholder: 'last 7 days' }
      ]}
      run={(v) => aiWeeklySummary(v)}
    />
  );
}

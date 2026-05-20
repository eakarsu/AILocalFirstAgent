import React from 'react';
import AIPage from '../components/AIPage';
import { aiLocalTaskPlan } from '../services/api';

export default function AILocalTaskPlanPage() {
  return (
    <AIPage
      title="AI · Plan Local Task"
      feature="local-task-plan"
      subtitle="Plan Local Task"
      inputs={[
        { key: 'goal', label: 'Goal', type: 'textarea', placeholder: '' },
        { key: 'data_sources', label: 'Sources', type: 'text', placeholder: 'mail, files, calendar' }
      ]}
      run={(v) => aiLocalTaskPlan(v)}
    />
  );
}

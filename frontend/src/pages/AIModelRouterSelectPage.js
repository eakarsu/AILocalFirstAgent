import React from 'react';
import AIPage from '../components/AIPage';
import { aiModelRouterSelect } from '../services/api';

export default function AIModelRouterSelectPage() {
  return (
    <AIPage
      title="AI · Model Router"
      feature="model-router-select"
      subtitle="Model Router"
      inputs={[
        { key: 'task_description', label: 'Task Description', type: 'textarea', placeholder: '' },
        { key: 'sensitivity', label: 'Sensitivity', type: 'select', placeholder: '', options: ["public","personal","sensitive","medical","financial"] },
        { key: 'latency_target_ms', label: 'Latency Target (ms)', type: 'number', placeholder: '' }
      ]}
      run={(v) => aiModelRouterSelect(v)}
    />
  );
}

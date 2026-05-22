import React from 'react';
import AIPage from '../components/AIPage';
import { aiLocalFallbackOrchestrator } from '../services/api';

export default function AILocalFallbackOrchestratorPage() {
  return (
    <AIPage
      title="AI · Local Fallback Orchestrator"
      feature="local-fallback-orchestrator"
      subtitle="Plan cloud→on-device retries when the primary provider fails; produce a degradation report."
      inputs={[
        { key: 'primary_provider', label: 'Primary Provider', type: 'text', placeholder: 'openrouter:anthropic/claude-sonnet' },
        { key: 'failure_class', label: 'Failure Class', type: 'select', options: ['timeout', 'rate-limited', 'network-offline', '5xx', 'parse-error'] },
        { key: 'sensitivity', label: 'Sensitivity', type: 'select', options: ['public', 'personal', 'sensitive', 'medical', 'financial'] },
        { key: 'task_description', label: 'Task Description', type: 'textarea', placeholder: '' },
      ]}
      run={(v) => aiLocalFallbackOrchestrator(v)}
    />
  );
}

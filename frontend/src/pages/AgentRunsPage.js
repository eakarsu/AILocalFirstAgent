import React from 'react';
import CrudPage from '../components/CrudPage';
import { agent_runsApi } from '../services/api';

const FIELDS = [
  { key: 'macro_name', label: 'Macro', type: 'text' },
  { key: 'started_at', label: 'Started', type: 'datetime-local' },
  { key: 'duration_ms', label: 'Duration (ms)', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ["success","failed","running"] },
  { key: 'output_summary', label: 'Output', type: 'textarea' }
];

export default function AgentRunsPage() {
  return (
    <CrudPage
      title="Agent Runs"
      subtitle="Manage agent runs records"
      api={agent_runsApi}
      fields={FIELDS}
      statusKey="status"
    />
  );
}

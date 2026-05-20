import React from 'react';
import CrudPage from '../components/CrudPage';
import { scheduled_macrosApi } from '../services/api';

const FIELDS = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'trigger_cron', label: 'Cron', type: 'text' },
  { key: 'action_summary', label: 'Action Summary', type: 'textarea' },
  { key: 'status', label: 'Status', type: 'select', options: ["active","paused","draft"] },
  { key: 'last_run', label: 'Last Run', type: 'datetime-local' },
  { key: 'notes', label: 'Notes', type: 'textarea' }
];

export default function ScheduledMacrosPage() {
  return (
    <CrudPage
      title="Scheduled Macros"
      subtitle="Manage scheduled macros records"
      api={scheduled_macrosApi}
      fields={FIELDS}
      statusKey="status"
    />
  );
}

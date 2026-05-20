import React from 'react';
import CrudPage from '../components/CrudPage';
import { indexed_sourcesApi } from '../services/api';

const FIELDS = [
  { key: 'source_type', label: 'Type', type: 'select', options: ["mail","files","messages","calendar","browser","custom"] },
  { key: 'path', label: 'Path / Endpoint', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ["active","paused","error"] },
  { key: 'last_indexed', label: 'Last Indexed', type: 'datetime-local' },
  { key: 'item_count', label: 'Items', type: 'number' },
  { key: 'notes', label: 'Notes', type: 'textarea' }
];

export default function IndexedSourcesPage() {
  return (
    <CrudPage
      title="Indexed Sources"
      subtitle="Manage indexed sources records"
      api={indexed_sourcesApi}
      fields={FIELDS}
      statusKey="status"
    />
  );
}

import React from 'react';
import CrudPage from '../components/CrudPage';
import { file_index_entriesApi } from '../services/api';

const FIELDS = [
  { key: 'path', label: 'Path', type: 'text' },
  { key: 'mimetype', label: 'MIME Type', type: 'text' },
  { key: 'size_bytes', label: 'Size (bytes)', type: 'number' },
  { key: 'embedded', label: 'Embedded', type: 'select', options: ["yes","no","partial"] },
  { key: 'last_modified', label: 'Last Modified', type: 'datetime-local' }
];

export default function FileIndexEntriesPage() {
  return (
    <CrudPage
      title="File Index"
      subtitle="Manage file index records"
      api={file_index_entriesApi}
      fields={FIELDS}
      statusKey="status"
    />
  );
}

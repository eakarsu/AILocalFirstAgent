import React from 'react';
import CrudPage from '../components/CrudPage';
import { privacy_audit_logApi } from '../services/api';

const FIELDS = [
  { key: 'action', label: 'Action', type: 'text' },
  { key: 'data_class', label: 'Data Class', type: 'select', options: ["public","personal","sensitive","medical","financial"] },
  { key: 'app_name', label: 'App', type: 'text' },
  { key: 'allowed', label: 'Allowed', type: 'select', options: ["yes","no"] },
  { key: 'notes', label: 'Notes', type: 'textarea' }
];

export default function PrivacyAuditLogPage() {
  return (
    <CrudPage
      title="Privacy Audit"
      subtitle="Manage privacy audit records"
      api={privacy_audit_logApi}
      fields={FIELDS}
      statusKey="status"
    />
  );
}

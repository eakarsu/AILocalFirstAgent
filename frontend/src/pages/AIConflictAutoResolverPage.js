import React from 'react';
import AIPage from '../components/AIPage';
import { aiConflictAutoResolver } from '../services/api';

export default function AIConflictAutoResolverPage() {
  return (
    <AIPage
      title="AI · Conflict Auto-Resolver"
      feature="conflict-auto-resolver"
      subtitle="Generate a CRDT-aware merge proposal between two divergent values."
      inputs={[
        { key: 'entity', label: 'Entity', type: 'select', options: ['mail', 'files', 'messages', 'calendar', 'contacts', 'notes'] },
        { key: 'subject', label: 'Subject', type: 'text' },
        { key: 'a_value', label: 'Value A', type: 'textarea' },
        { key: 'b_value', label: 'Value B', type: 'textarea' },
        { key: 'a_timestamp', label: 'A Timestamp', type: 'text', placeholder: 'ISO datetime' },
        { key: 'b_timestamp', label: 'B Timestamp', type: 'text', placeholder: 'ISO datetime' },
      ]}
      run={(v) => aiConflictAutoResolver(v)}
    />
  );
}

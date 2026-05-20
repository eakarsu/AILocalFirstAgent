import React from 'react';
import AIPage from '../components/AIPage';
import { aiConflictFinder } from '../services/api';

export default function AIConflictFinderPage() {
  return (
    <AIPage
      title="AI · Conflict Finder"
      feature="conflict-finder"
      subtitle="Conflict Finder"
      inputs={[
        { key: 'data_streams', label: 'Streams', type: 'text', placeholder: 'mail, calendar, slack' },
        { key: 'subject', label: 'Subject', type: 'textarea', placeholder: '' }
      ]}
      run={(v) => aiConflictFinder(v)}
    />
  );
}

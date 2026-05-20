import React from 'react';
import AIPage from '../components/AIPage';
import { aiScheduledMacro } from '../services/api';

export default function AIScheduledMacroPage() {
  return (
    <AIPage
      title="AI · Define Scheduled Macro"
      feature="scheduled-macro"
      subtitle="Define Scheduled Macro"
      inputs={[
        { key: 'description', label: 'Description', type: 'textarea', placeholder: '' },
        { key: 'frequency', label: 'Frequency', type: 'select', placeholder: '', options: ["hourly","daily","weekly","custom"] }
      ]}
      run={(v) => aiScheduledMacro(v)}
    />
  );
}

import React from 'react';
import AIPage from '../components/AIPage';
import { aiDraftReply } from '../services/api';

export default function AIDraftReplyPage() {
  return (
    <AIPage
      title="AI · Draft Email Reply"
      feature="draft-reply"
      subtitle="Draft Email Reply"
      inputs={[
        { key: 'incoming_email', label: 'Incoming Email', type: 'textarea', placeholder: '' },
        { key: 'tone', label: 'Tone', type: 'select', placeholder: '', options: ["professional","friendly","curt","warm","formal"] },
        { key: 'context_hint', label: 'Context Hint', type: 'text', placeholder: '' }
      ]}
      run={(v) => aiDraftReply(v)}
    />
  );
}

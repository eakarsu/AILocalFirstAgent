import React from 'react';
import AIPage from '../components/AIPage';
import { aiPromptRedactionRewriter } from '../services/api';

export default function AIPromptRedactionRewriterPage() {
  return (
    <AIPage
      title="AI · Prompt Redaction Rewriter"
      feature="prompt-redaction-rewriter"
      subtitle="Pair with the privacy classifier: rewrite a prompt so it's safe to send to the cloud."
      inputs={[
        { key: 'prompt', label: 'Prompt to Send', type: 'textarea' },
        { key: 'target', label: 'Send Target', type: 'text', placeholder: 'cloud LLM | partner API | log sink' },
      ]}
      run={(v) => aiPromptRedactionRewriter(v)}
    />
  );
}

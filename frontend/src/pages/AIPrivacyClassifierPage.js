import React from 'react';
import AIPage from '../components/AIPage';
import { aiPrivacyClassifier } from '../services/api';

export default function AIPrivacyClassifierPage() {
  return (
    <AIPage
      title="AI · Privacy Classifier"
      feature="privacy-classifier"
      subtitle="Privacy Classifier"
      inputs={[
        { key: 'snippet', label: 'Snippet to Classify', type: 'textarea', placeholder: '' },
        { key: 'intended_use', label: 'Intended Use', type: 'text', placeholder: 'cloud LLM, on-device only, redact' }
      ]}
      run={(v) => aiPrivacyClassifier(v)}
    />
  );
}

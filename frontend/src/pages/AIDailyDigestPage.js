import React from 'react';
import AIPage from '../components/AIPage';
import { aiDailyDigest } from '../services/api';

export default function AIDailyDigestPage() {
  return (
    <AIPage
      title="AI · Daily Digest"
      feature="daily-digest"
      subtitle="Daily Digest"
      inputs={[
        { key: 'date', label: 'Date', type: 'text', placeholder: '' },
        { key: 'focus', label: 'Focus', type: 'text', placeholder: '' }
      ]}
      run={(v) => aiDailyDigest(v)}
    />
  );
}

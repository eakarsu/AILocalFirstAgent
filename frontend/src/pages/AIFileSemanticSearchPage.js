import React from 'react';
import AIPage from '../components/AIPage';
import { aiFileSemanticSearch } from '../services/api';

export default function AIFileSemanticSearchPage() {
  return (
    <AIPage
      title="AI · Semantic File Search"
      feature="file-semantic-search"
      subtitle="Semantic File Search"
      inputs={[
        { key: 'query', label: 'Search Query', type: 'textarea', placeholder: '' },
        { key: 'context_hint', label: 'Folder/Date Hint', type: 'text', placeholder: '' }
      ]}
      run={(v) => aiFileSemanticSearch(v)}
    />
  );
}

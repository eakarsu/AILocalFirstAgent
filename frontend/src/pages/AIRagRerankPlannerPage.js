import React from 'react';
import AIPage from '../components/AIPage';
import { aiRagRerankPlanner } from '../services/api';

export default function AIRagRerankPlannerPage() {
  return (
    <AIPage
      title="AI · RAG Re-Ranker / Refresh Planner"
      feature="rag-rerank-planner"
      subtitle="Re-rank current retrieval hits and plan which embeddings to refresh."
      inputs={[
        { key: 'query', label: 'Query', type: 'text' },
        { key: 'top_k', label: 'Top K', type: 'number' },
        { key: 'current_results', label: 'Current Hits (comma-separated paths)', type: 'textarea' },
      ]}
      run={(v) => aiRagRerankPlanner(v)}
    />
  );
}

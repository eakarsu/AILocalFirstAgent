import React, { useEffect, useState } from 'react';
export default function ConflictProvenanceTimelinePage() {
  const [data, setData] = useState(null);
  const token = localStorage.getItem('local_first_token') || localStorage.getItem('token');
  useEffect(() => { fetch('/api/conflict-provenance-timeline', { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.json()).then(setData).catch(() => {}); }, [token]);
  return <div><h1>Conflict Provenance Timeline</h1><p>Explains sync conflicts by actor, edit chain, and semantic divergence.</p>{data?.conflicts?.map(c => <section className="card" key={c.key}><h3>{c.key}</h3><p>{c.action} - risk {c.risk}</p></section>)}</div>;
}

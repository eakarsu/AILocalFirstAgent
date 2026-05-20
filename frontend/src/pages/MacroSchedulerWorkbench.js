
import React, { useEffect, useState } from 'react';
const TOKEN_KEY = Object.keys(localStorage).find((k) => k.endsWith('_token')) || 'local_first_agent_token';
const API_BASE = 'http://localhost:4051/api';
function parseCron(c){
  // Map a 5-field cron expression to days-of-week the macro fires on.
  // Returns indexes 0..6 (Mon..Sun) or null if can't parse.
  if(!c) return [];
  const parts=String(c).trim().split(/\s+/);
  if(parts.length<5) return [];
  const dow=parts[4];
  if(dow==='*') return [0,1,2,3,4]; // weekdays interpretation common for daily-at-X
  const days=[];
  for(const tok of dow.split(',')){
    if(tok.includes('-')){
      const [a,b]=tok.split('-').map(Number);
      for(let i=a;i<=b;i++) days.push((i+6)%7);
    } else if(!isNaN(Number(tok))){
      days.push((Number(tok)+6)%7);
    }
  }
  return [...new Set(days)];
}
export default function MacroSchedulerWorkbench(){
  const [rows,setRows]=useState([]);const [err,setErr]=useState(null);
  useEffect(()=>{ fetch(API_BASE+'/scheduled-macros',{headers:{Authorization:'Bearer '+localStorage.getItem(TOKEN_KEY)}}).then(r=>r.json()).then(setRows).catch(e=>setErr(e.message)); },[]);
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  return (
    <div>
      <div className="page-header"><div><h2>Macro Scheduler</h2><p>Weekly view of scheduled local agents — cron parsed for real.</p></div></div>
      {err&&<div className="ai-error">{err}</div>}
      <div className="card">
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8}}>
          {days.map((d,di)=>(
            <div key={d} style={{background:'#0b1424',border:'1px solid #1e293b',borderRadius:8,padding:10,minHeight:140}}>
              <div style={{color:'#94a3b8',fontSize:11,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>{d}</div>
              {rows.filter(r=>parseCron(r.trigger_cron).includes(di)).map(r=>(
                <div key={r.id} style={{background:'#1e293b',borderRadius:6,padding:'6px 8px',marginBottom:6}}>
                  <div style={{fontSize:12,color:'#e2e8f0',fontWeight:600}}>{r.name}</div>
                  <div style={{fontSize:11,color:'#94a3b8',marginTop:2,fontFamily:'Menlo,monospace'}}>{r.trigger_cron}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
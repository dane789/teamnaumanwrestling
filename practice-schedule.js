(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateOK=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
const timeOK=v=>/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
function parse(text,schema,dated=false){
 const rows=root.TNWCCampFeed.csv(text),headers=dated?schema.changeHeaders:schema.weeklyHeaders;
 if(!headers.every((h,i)=>rows[0]?.[i]===h))throw Error('Practice headings changed');
 if(rows.slice(schema.maxRows+1).some(r=>r.some(Boolean)))throw Error('Practice table needs more prepared rows');
 const result=[],keys=new Set();
 for(const r of rows.slice(1)){
  if(!r.some(Boolean))continue;const a=Object.fromEntries(headers.map((h,i)=>[h,(r[i]||'').trim()]));
  if(a.Status==='Hidden')continue;
  if(!schema.programs.includes(a.Program)||!(dated?dateOK(a.Date):schema.days.includes(a.Day)))throw Error('Check practice day/date and program');
  if(!['Active',...(dated?['Cancelled']:[])].includes(a.Status))throw Error('Check practice status');
  if(a.Status==='Active'&&(!timeOK(a.Start)||!timeOK(a.End)||a.Start>=a.End||!a.Location||a.Location.length>250))throw Error('Check practice times and location');
  if(a.Details.length>1000)throw Error('Practice details are too long');
  if(!dated&&((a.Starts&&!dateOK(a.Starts))||(a.Ends&&!dateOK(a.Ends))||(a.Starts&&a.Ends&&a.Starts>a.Ends)))throw Error('Check practice seasonal dates');
  const key=(dated?a.Date:a.Day)+'|'+a.Program;if(keys.has(key))throw Error('Duplicate practice day/date and program');keys.add(key);
  if(a['Ready check']!=='Ready')throw Error('Practice row needs attention');
  result.push({day:dated?new Date(a.Date+'T12:00:00Z').getUTCDay():schema.days.indexOf(a.Day),date:a.Date||'',program:a.Program,start:a.Start,end:a.End,location:a.Location,note:a.Details,status:a.Status,from:a.Starts||'',through:a.Ends||''});
 }
 return result;
}
function sessions(data,from,count=7){
 const out=[];for(let i=0;i<count;i++){
  const d=new Date(from+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);const date=d.toISOString().slice(0,10),map=new Map();
  data.weekly.filter(p=>p.day===d.getUTCDay()&&(!p.from||date>=p.from)&&(!p.through||date<=p.through)).forEach(p=>map.set(p.program,{...p,date}));
  data.changes.filter(p=>p.date===date).forEach(p=>map.set(p.program,{...map.get(p.program),...p,date,start:p.start||map.get(p.program)?.start||'',end:p.end||map.get(p.program)?.end||'',location:p.location||map.get(p.program)?.location||''}));
  out.push(...[...map.values()].sort((a,b)=>a.start.localeCompare(b.start)));
 }return out;
}
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function monday(offset=0){const d=new Date(today()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7)+offset*7);return d.toISOString().slice(0,10);}
const label=d=>new Intl.DateTimeFormat('en-US',{weekday:'long',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
const time=t=>{if(!timeOK(t))return '';const[h,m]=t.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;};
function formUrl(p,embedded=false){const u=new URL('https://docs.google.com/forms/d/e/1FAIpQLSdv_djPSn7Ge5Lx0Ve0ldavoU7sUlr5Y03Np3Jywh9hjbxvlg/viewform');u.searchParams.set('usp','pp_url');u.searchParams.set('entry.1143925408',p.date);u.searchParams.set('entry.1033390858',p.program);u.searchParams.set('entry.1952182941',`${time(p.start)} to ${time(p.end)} ET | ${p.location}`);if(embedded)u.searchParams.set('embedded','true');return u.href;}
function pageUrl(p){const u=new URL('./practice.html',root.location?.href||'https://dane789.github.io/teamnaumanwrestling/');u.searchParams.set('date',p.date);u.searchParams.set('program',p.program);u.hash='attendance-form';return u.href;}
let promise;
function load(force=false){if(promise&&!force)return promise;const base=root.TNWC.practiceBoardFeed;const read=async(gid)=>{const u=new URL(base);u.searchParams.set('gid',gid);u.searchParams.set('single','true');u.searchParams.set('_refresh',Date.now());const r=await fetch(u,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Practice feed unavailable');return r.text();};promise=Promise.all([fetch('./practice-schedule.schema.json').then(r=>{if(!r.ok)throw Error('Schedule schema unavailable');return r.json();}),read('903101001'),read('903101002')]).then(([schema,w,c])=>({weekly:parse(w,schema),changes:parse(c,schema,true)}));return promise;}
const api={parse,sessions,today,monday,label,time,formUrl,pageUrl,load,escape:esc};if(typeof module==='object'&&module.exports)module.exports=api;else root.TNWCPracticeSchedule=api;
})(typeof window==='undefined'?{}:window);

(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateOK=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
const urlOK=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
function parse(text,kind,schema,today){
 const rows=root.TNWCCampFeed.csv(text),headers=schema.tabs[kind].headers;
 if(!headers.every((h,i)=>rows[0]?.[i]===h))throw Error('Website content headings changed');
 if(rows.slice(schema.maxRows+1).some(r=>r.some(Boolean)))throw Error('More prepared rows are needed');
 const out=[],keys=new Set();
 for(const row of rows.slice(1)){
  if(!row.some(Boolean))continue;
  const a=Object.fromEntries(headers.map((h,i)=>[h,(row[i]||'').trim()]));
  if(kind==='programs'?a.Enrollment==='Hidden':a.Status!=='Published')continue;
  if(a['Ready check']!=='Ready')throw Error('A published row needs attention');
  if(kind==='prices'){
   if(!['Individual','Family','Youth','Team credits','Small group'].includes(a.Category)||!a.Plan||!/^\d+$/.test(a.Wrestlers)||!/^\d+(\.\d{1,2})?$/.test(a.Amount)||!/^\d+$/.test(a.Months)||a.Details.length>500)throw Error('Check published prices');
   if((a.Starts&&!dateOK(a.Starts))||(a.Ends&&!dateOK(a.Ends))||(a.Starts&&a.Ends&&a.Starts>a.Ends))throw Error('Check price dates');
   if((a.Starts&&today<a.Starts)||(a.Ends&&today>a.Ends))continue;
   const key=[a.Category,a.Plan,a.Wrestlers].join('|');if(keys.has(key))throw Error('Overlapping duplicate price plans');keys.add(key);
   out.push({...a,amount:Number(a.Amount),months:Number(a.Months),wrestlers:Number(a.Wrestlers)});
  }else if(kind==='programs'){
   if(!['Roots','Saplings'].includes(a.Program)||!a.Ages||a.Ages.length>80||!/^\d+$/.test(a.Capacity)||Number(a.Capacity)<1||!a['Session details']||!['Open','Ask about availability','Full','Closed'].includes(a.Enrollment)||(a['Registration link']&&!urlOK(a['Registration link']))||[a['Session details'],a.Coaches,a.Details].some(v=>v.length>500))throw Error('Check program details');
   if(keys.has(a.Program))throw Error('Duplicate program');keys.add(a.Program);out.push(a);
  }else{
   if(!a.Title||a.Title.length>80||!a.Message||a.Message.length>500||!dateOK(a.Expires)||(a.Starts&&!dateOK(a.Starts))||(a.Starts&&a.Starts>a.Expires))throw Error('Check announcement dates');
   if((!a.Starts||today>=a.Starts)&&today<=a.Expires)out.push(a);
  }
 }return out;
}
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:Number.isInteger(n)?0:2}).format(n);
function value(p,prices){const monthly=prices.find(x=>x.Category==='Individual'&&x.wrestlers===1&&x.months===1);if(p.months<=1||!monthly)return esc(p.Details);const saving=monthly.amount*p.months-p.amount;return `About ${money(Math.round(p.amount/p.months))}/month${saving>0?' · save '+money(saving)+' versus '+p.months+' monthly payments':''}`;}
function renderPrices(prices){
 const box=document.getElementById('live-prices');
 const individual=prices.filter(p=>p.Category==='Individual'),family=prices.filter(p=>p.Category==='Family'),youth=prices.filter(p=>p.Category==='Youth');
 const table=(caption,head,rows)=>`<table><caption>${caption}</caption><thead><tr>${head.map(h=>'<th scope="col">'+h+'</th>').join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
 box.innerHTML=`<div class="fees-grid"><div><h3>Individual training</h3>${table('Choose your training plan',['Plan','Fee','Value'],individual.map(p=>`<tr><th scope="row">${esc(p.Plan)}</th><td>${money(p.amount)}${p.months>1?' total':''}</td><td>${value(p,prices)}</td></tr>`))}<p>Monthly equivalents help you compare plans; they are not installment offers. Longer plans are paid in full.</p></div><div><h3>Train together. Save together.</h3>${table('Wrestlers from the same family',['Plan','Wrestlers','Total'],family.map(p=>`<tr><th scope="row">${esc(p.Plan)}</th><td>${p.wrestlers}</td><td>${money(p.amount)}</td></tr>`))}<p>Family rates cover wrestlers from the same family. Ask the club about other combinations.</p></div></div><details class="event-archive"><summary>Youth program fees</summary>${youth.map(p=>`<p><strong>${esc(p.Plan)}: ${money(p.amount)}</strong><br>${esc(p.Details)}</p>`).join('')||'<p>Ask the club for current youth fees.</p>'}</details><details class="event-archive"><summary>Team credits and small-group training</summary>${prices.filter(p=>['Team credits','Small group'].includes(p.Category)).map(p=>`<p><strong>${esc(p.Category)} · ${esc(p.Plan)}: ${money(p.amount)}</strong><br>${esc(p.Details)}</p>`).join('')}<p>Team plans are paid in full together. Use the team QR code to sign in. Friday Night Lives, camps and guest clinicians are excluded.</p></details><details class="event-archive"><summary>What your plan covers and payment dates</summary><p>Monthly and longer plans cover Team Nauman practices. Youth programs and event fees are separate. Confirm included sessions and your start and expiry dates with the club. Payment is due by the fifth of the month.</p></details>`;
 if(!individual.length&&!family.length)box.insertAdjacentHTML('afterbegin','<p>No training plans are currently listed. Ask the club for current prices.</p>');
}
function renderPrograms(programs){
 for(const name of ['Roots','Saplings']){
  const card=document.querySelector('[data-live-program="'+name+'"]'),a=programs.find(p=>p.Program===name);card.hidden=!a;if(!a)continue;
  card.querySelector('.badge').textContent='AGES '+a.Ages;
  card.querySelector('[data-program-info]').textContent=`Ages ${a.Ages} · Up to ${a.Capacity} wrestlers · ${a['Session details']}`;
  card.querySelector('[data-program-coaches]').textContent=a.Coaches;
  const target=card.querySelector('[data-program-enrollment]'),link=a['Registration link'];
  target.innerHTML=`<p>${esc(a.Details)}</p><p><strong>${esc(a.Enrollment)}</strong></p>${link&&!['Full','Closed'].includes(a.Enrollment)?'<a class="text-link" href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">'+esc(name)+' registration form ↗</a>':'<p>Contact the club about the next opening.</p>'}`;
 }document.getElementById('program-content-status').textContent='';
}
function renderAnnouncements(items){const box=document.getElementById('announcements');box.hidden=!items.length;box.innerHTML=items.map(a=>'<p><strong>'+esc(a.Title)+'</strong> '+esc(a.Message)+'</p>').join('');}
if(typeof module==='object'&&module.exports){module.exports={parse,dateOK,value};return;}
async function refresh(){
 const schema=await fetch('./club-content.schema.json').then(r=>{if(!r.ok)throw Error();return r.json();});
 await Promise.allSettled(Object.entries(schema.tabs).map(async([kind,tab])=>{
  try{const u=new URL(root.TNWC.practiceBoardFeed);u.searchParams.set('gid',tab.gid);u.searchParams.set('single','true');u.searchParams.set('_refresh',Date.now());const r=await fetch(u,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error();const items=parse(await r.text(),kind,schema,root.TNWCPracticeSchedule.today());if(kind==='prices')renderPrices(items);else if(kind==='programs')renderPrograms(items);else renderAnnouncements(items);}
  catch{if(kind==='prices')document.getElementById('live-prices').innerHTML='<p>Current prices are temporarily unavailable. Please ask the club before paying.</p>';else if(kind==='programs'){document.querySelectorAll('[data-live-program]').forEach(c=>{c.querySelector('[data-program-info]').textContent='Ask the club for current ages, session details and availability.';c.querySelector('[data-program-coaches]').textContent='';c.querySelector('[data-program-enrollment]').innerHTML='<p>Enrollment details are temporarily unavailable. Contact the club before registering.</p>';c.querySelector('.badge').textContent='YOUTH PROGRAM';});document.getElementById('program-content-status').textContent='Current program details could not be loaded.';}else renderAnnouncements([]);}
 }));
}
refresh().catch(()=>{document.getElementById('live-prices').textContent='Ask the club for current prices.';document.getElementById('program-content-status').textContent='Ask the club for current enrollment details.';});setInterval(()=>refresh().catch(()=>{}),60000);
})(typeof window==='undefined'?{}:window);

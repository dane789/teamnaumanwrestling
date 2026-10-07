(() => {
 'use strict';
 const c=window.TNWC,esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
 const eventId=new URLSearchParams(location.search).get('event')||'test-team-duals';
 const endpoint=c.teamBuilderServiceUrl||'',grid=document.getElementById('team-board'),message=document.getElementById('team-status'),dialog=document.getElementById('team-request-dialog');
 let current=null,busy=false;
 function render(board){
  current=board;document.getElementById('team-title').textContent=board.event.title;
  document.getElementById('team-details').textContent=[board.event.date,board.event.endDate!==board.event.date?board.event.endDate:'',board.event.location].filter(Boolean).join(' · ');
  document.getElementById('team-test-note').hidden=!board.event.testOnly;
  document.getElementById('team-service-note').hidden=!!endpoint;
  const groups=[...new Set(board.spots.map(s=>s.division))];
  grid.innerHTML=groups.map(division=>`<section class="team-division"><h2>${esc(division)}</h2><p>${esc([...new Set(board.spots.filter(s=>s.division===division).map(s=>[s.eligibility,s.allowance].filter(Boolean).join(' · ')))].filter(Boolean).join(' / '))}</p><div class="weight-grid">${board.spots.filter(s=>s.division===division).map(s=>{const type=s.status==='Open'?'Claim':'Backup',filled=s.status==='Filled',enabled=!filled&&board.accepting&&!!endpoint;return `<button class="weight-card ${s.status==='Open'?'spot-open':filled?'spot-filled':'spot-spoken'}" data-spot="${esc(s.id)}" data-type="${type}" ${enabled?'':'disabled'} aria-label="${esc(s.weight)} pounds, ${esc(s.status)}${filled?', no requests':type==='Claim'?', claim it':', backups welcome'}"><strong>${esc(s.weight)}</strong><span>${esc(s.status)}</span>${filled?'':`<small>${type==='Claim'?'Claim it':'Backups welcome'}</small>`}</button>`;}).join('')}</div></section>`).join('')||'<p>No weight-class openings are published yet. Contact the club for team information.</p>';
  message.textContent=endpoint?(board.accepting?'Choose an Open spot to claim it, or a Spoken for spot to request a backup place.':'Requests for this tournament are closed.'):'Preview of the team board. Claims will open after the test service is authorized and connected.';
 }
 async function load(){if(busy)return;busy=true;try{
  let board;
  if(endpoint){const u=new URL(endpoint);u.searchParams.set('mode','board');u.searchParams.set('event',eventId);u.searchParams.set('_refresh',Date.now());const response=await fetch(u,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error();board=await response.json();}
  else {
   const u=new URL(c.teamSpotsFeed);u.searchParams.set('_refresh',Date.now());const r=await fetch(u,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error();const csv=window.TNWCCampFeed.csv(await r.text()),head=csv.shift();const required=['Spot ID','Event ID','Division','Weight class','Status','Published'];if(required.some(h=>!head.includes(h)))throw Error();
   const spots=csv.map(row=>Object.fromEntries(head.map((h,i)=>[h,row[i]||'']))).filter(s=>s['Event ID']===eventId&&s.Published==='TRUE').map(s=>({id:s['Spot ID'],division:s.Division,weight:s['Weight class'],status:s.Status,allowance:s.Allowance,eligibility:s.Eligibility,order:Number(s['Display order'])||999})).filter(s=>['Open','Spoken for','Filled'].includes(s.status)).sort((a,b)=>a.order-b.order);
   if(new Set(spots.map(s=>s.id)).size!==spots.length)throw Error();
   let event;if(eventId==='test-team-duals')event={title:'TNWC Test Duals',date:'October 31, 2026',endDate:'October 31, 2026',location:'Test event only. No real tournament registration.',testOnly:true};
   else {const [feed,schema]=await Promise.all([fetch(c.travelEventFeed),fetch('./mini-camps.schema.json')]);if(!feed.ok||!schema.ok)throw Error();const e=window.TNWCCampFeed.read(await feed.text(),await schema.json(),'Tournament',true).events.find(e=>e.id===eventId);if(!e||e.cancelled)throw Error();event={title:e.title,date:e.start.slice(0,10),endDate:e.end.slice(0,10),location:e.location,testOnly:e.testOnly};}
   board={ok:true,event,spots,accepting:false};
  }
  if(!board.ok)throw Error(board.message||'Team board unavailable');render(board);
 }catch(err){current=null;grid.innerHTML='';message.textContent='The team board is temporarily unavailable. Refresh or contact the club before requesting a place.';}finally{busy=false;}}
 grid.addEventListener('click',e=>{const button=e.target.closest('[data-spot]');if(!button||button.disabled||!current||!endpoint)return;const spot=current.spots.find(s=>s.id===button.dataset.spot);if(!spot)return;document.getElementById('team-request-title').textContent=button.dataset.type==='Claim'?'Claim a team spot':'Request a backup place';const frame=document.createElement('iframe'),u=new URL(endpoint);u.searchParams.set('event',eventId);u.searchParams.set('spot',spot.id);u.searchParams.set('type',button.dataset.type);frame.src=u.href;frame.title='Team Nauman private team request';frame.referrerPolicy='strict-origin-when-cross-origin';document.getElementById('team-request-body').replaceChildren(frame);dialog.showModal();});
 document.getElementById('team-request-close').addEventListener('click',()=>dialog.close());
 document.getElementById('team-refresh').addEventListener('click',load);
 window.addEventListener('message',e=>{const frame=document.querySelector('#team-request-body iframe');if(!frame||e.data?.type!=='tnwc-team-request-saved'||e.data.eventId!==eventId)return;let origin;try{origin=new URL(e.origin);}catch{return;}if(origin.protocol!=='https:'||!(origin.hostname==='script.google.com'||origin.hostname.endsWith('.googleusercontent.com')))return;load();});
 document.querySelector('.menu-toggle').addEventListener('click',e=>{const open=e.currentTarget.getAttribute('aria-expanded')!=='true';e.currentTarget.setAttribute('aria-expanded',String(open));document.getElementById('navigation').classList.toggle('open',open);});
 load();setInterval(()=>{if(!document.hidden&&!dialog.open)load();},30000);
})();

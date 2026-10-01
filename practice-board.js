(() => {
'use strict';
const cfg=window.TNWC,S=window.TNWCPracticeSchedule,board=document.getElementById('partner-board'),esc=S.escape;
let week=0,totals=[],groups=[],data=null,ready=false,selected=null;
function records(text,headers){const rows=window.TNWCCampFeed.csv(text);if(!headers.every((h,i)=>rows[0]?.[i]===h))throw Error('Summary headings changed');return rows.slice(1).filter(r=>r[0]).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])));}
function upcoming(p){return p.status!=='Cancelled'&&Date.parse(window.TNWCCampFeed.eastern(p.date,p.start,cfg.timezone))>Date.now();}
function choose(p){
 if(!upcoming(p))return;
 selected=p;const section=document.getElementById('attendance-form');section.hidden=false;
 document.getElementById('selected-practice').innerHTML=`<h3>${esc(S.label(p.date))} · ${esc(p.program)}</h3><p>${S.time(p.start)} to ${S.time(p.end)} ET<br>${esc(p.location)}</p>${p.note?'<p>'+esc(p.note)+'</p>':''}`;
 document.getElementById('selected-form-link').href=S.formUrl(p);document.getElementById('selected-form').src=S.formUrl(p,true);
 section.scrollIntoView({behavior:'smooth',block:'start'});
}
function render(){
 const sessions=S.sessions(data,S.monday(week));
 board.innerHTML=sessions.length?sessions.map(p=>{
 const rows=totals.filter(r=>r.Date===p.date&&r.Program===p.program),come=Number(rows.find(r=>r.Attendance==='Coming')?.Count||0),maybe=Number(rows.find(r=>r.Attendance==='Maybe')?.Count||0),visible=groups.filter(r=>r.Date===p.date&&r.Program===p.program&&Number(r.Count)>=3);
 return `<article class="practice-session"><p class="eyebrow">${esc(S.label(p.date))}</p><h3>${esc(p.program)}</h3><p>${S.time(p.start)}${p.end?' to '+S.time(p.end)+' ET':''}</p><p class="practice-venue">${esc(p.location)}</p>${p.note?'<p class="muted">'+esc(p.note)+'</p>':''}${p.status==='Cancelled'?'<p><strong>Cancelled</strong> · Attendance closed</p>':`<p class="attendance-count"><strong>${come}</strong> planning to come <span>· ${maybe} maybe</span></p>${visible.length?visible.map(g=>`<div class="partner-group"><strong>${Number(g.Count)} wrestlers</strong><span>Ages ${esc(g['Age band'])} · ${esc(g['Weight band'])} lb</span><span>${esc(g.Skill)}</span></div>`).join(''):'<p class="muted">No group details to show yet. Smaller groups stay private.</p>'}${upcoming(p)?`<button class="text-link" data-session-date="${esc(p.date)}" data-session-program="${esc(p.program)}">Mark your plans →</button>`:'<p class="muted">This practice has already started.</p>'}`}</article>`;
 }).join(''):'<p>No practices listed for this week.</p>';
 document.getElementById('week-label').textContent='Week of '+S.label(S.monday(week));
 board.querySelectorAll('[data-session-date]').forEach(b=>b.addEventListener('click',()=>choose(sessions.find(p=>p.date===b.dataset.sessionDate&&p.program===b.dataset.sessionProgram))));
 if(selected){const current=S.sessions(data,S.monday(),14).find(p=>p.date===selected.date&&p.program===selected.program);if(!current||!upcoming(current)||current.start!==selected.start||current.end!==selected.end||current.location!==selected.location){document.getElementById('attendance-form').hidden=true;selected=null;document.getElementById('board-status').textContent='Your selected practice has changed. Choose a current session before submitting.';}}
}
document.querySelectorAll('[data-week]').forEach(b=>b.addEventListener('click',()=>{week=Number(b.dataset.week);document.querySelectorAll('[data-week]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));if(ready)render();}));
async function refresh(force=false){
 try{
 const read=async(gid,h)=>{const u=new URL(cfg.practiceBoardFeed);u.searchParams.set('gid',gid);u.searchParams.set('single','true');u.searchParams.set('_refresh',Date.now());const r=await fetch(u,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Feed unavailable');return records(await r.text(),h);};
 [data,totals,groups]=await Promise.all([S.load(force),read('408375415',['Date','Program','Attendance','Count']),read('1322956425',['Date','Program','Age band','Weight band','Skill','Count'])]);ready=true;render();document.getElementById('board-status').textContent='Plans can change. Counts may take a few minutes to refresh.';
 if(!force){const query=new URLSearchParams(location.search);const requested=S.sessions(data,S.monday(),14).find(p=>p.date===query.get('date')&&p.program===query.get('program'));if(requested){week=requested.date>=S.monday(1)?1:0;document.querySelectorAll('[data-week]').forEach(x=>x.setAttribute('aria-pressed',String(Number(x.dataset.week)===week)));render();choose(requested);}}
 }catch(e){ready=false;board.innerHTML='<p>The practice schedule or partner board is temporarily unavailable. This does not mean nobody is coming. Check with the club before visiting.</p>';document.getElementById('board-status').textContent='Check with the club if you need a confirmed partner.';document.getElementById('attendance-form').hidden=true;selected=null;}
}
refresh();setInterval(()=>refresh(true),60000);
})();

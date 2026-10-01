(() => {
'use strict';
const cfg=window.TNWC,S=window.TNWCPracticeSchedule,board=document.getElementById('partner-board'),esc=S.escape;
let week=0,totals=[],groups=[],data=null,ready=false,selected=null,countsReady=false,groupsReady=false;
function records(text,headers){const rows=window.TNWCCampFeed.csv(text);if(!headers.every((h,i)=>rows[0]?.[i]===h))throw Error('Summary headings changed: '+JSON.stringify(rows[0]));return rows.slice(1).filter(r=>r[0]).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])));}
function upcoming(p){return p.status!=='Cancelled'&&Date.parse(window.TNWCCampFeed.eastern(p.date,p.start,cfg.timezone))>Date.now();}
function partnerDetails(p){
 if(!countsReady)return '<h3>Who’s planning to come?</h3><p class="muted">Attendance counts are temporarily unavailable. You can still mark your plans.</p>';
 const rows=totals.filter(r=>r.Date===p.date&&r.Program===p.program),come=Number(rows.find(r=>r.Attendance==='Coming')?.Count||0),maybe=Number(rows.find(r=>r.Attendance==='Maybe')?.Count||0),visible=groups.filter(r=>r.Date===p.date&&r.Program===p.program&&Number(r.Count)>=3);
 return `<h3>Who’s planning to come?</h3><p class="attendance-count"><strong>${come}</strong> coming <span>· ${maybe} maybe</span></p>${!groupsReady?'<p class="muted">Partner details are temporarily unavailable.</p>':visible.length?visible.map(g=>`<div class="partner-group"><strong>${Number(g.Count)} wrestlers</strong><span>Ages ${esc(g['Age band'])} · ${esc(g['Weight band'])} lb</span><span>${esc(g.Skill)}</span></div>`).join(''):'<p class="muted">No group details yet. Groups smaller than three stay private.</p>'}`;
}
function choose(p,scroll=true){
 if(!upcoming(p))return;
 selected=p;if(window.matchMedia('(max-width:800px)').matches)document.getElementById('session-picker').open=false;const section=document.getElementById('attendance-form');section.hidden=false;
 document.getElementById('selected-practice').innerHTML=`<p class="eyebrow">${esc(S.label(p.date))}</p><h2>${esc(p.program)}</h2><p><strong>${S.time(p.start)} to ${S.time(p.end)} ET</strong><br>${esc(p.location)}</p><a class="text-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.location)}" target="_blank" rel="noopener">Directions ↗</a>${p.note?'<p>'+esc(p.note)+'</p>':''}`;
 document.getElementById('selected-partners').innerHTML=partnerDetails(p);
 board.querySelectorAll('[data-session-date]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sessionDate===p.date&&b.dataset.sessionProgram===p.program)));
 if(scroll){section.scrollIntoView({behavior:'smooth',block:'start'});section.focus({preventScroll:true});}
}
function render(){
 const sessions=S.sessions(data,S.monday(week)).filter(p=>document.getElementById('planner-program').value==='all'||p.program===document.getElementById('planner-program').value);
 board.innerHTML=sessions.filter(p=>p.date>=S.today()).length?sessions.filter(p=>p.date>=S.today()).map(p=>{
 const coming=Number(totals.find(r=>r.Date===p.date&&r.Program===p.program&&r.Attendance==='Coming')?.Count||0);
 return `<article class="practice-session"><div><p class="eyebrow">${esc(S.label(p.date))}</p><h3>${esc(p.program)}</h3><p>${S.time(p.start)}${p.end?' to '+S.time(p.end)+' ET':''}</p><p class="practice-venue">${esc(p.location)}</p></div>${p.status==='Cancelled'?'<p class="muted">Cancelled</p>':upcoming(p)?`<button class="text-link" data-session-date="${esc(p.date)}" data-session-program="${esc(p.program)}" aria-pressed="false">${countsReady?coming+' coming · ':''}Mark your plans →</button>`:'<p class="muted">Already started</p>'}</article>`;
 }).join(''):'<p>No upcoming practices listed this week. Try next week.</p>';
 document.getElementById('week-label').textContent='Week of '+S.label(S.monday(week));
 board.querySelectorAll('[data-session-date]').forEach(b=>b.addEventListener('click',()=>choose(sessions.find(p=>p.date===b.dataset.sessionDate&&p.program===b.dataset.sessionProgram))));
 if(selected){const current=S.sessions(data,S.monday(),14).find(p=>p.date===selected.date&&p.program===selected.program);if(!current||!upcoming(current)||current.start!==selected.start||current.end!==selected.end||current.location!==selected.location){document.getElementById('attendance-form').hidden=true;selected=null;document.getElementById('board-status').textContent='Your selected practice has changed. Choose a current session before submitting.';}else choose(current,false);}
}
document.querySelectorAll('[data-week]').forEach(b=>b.addEventListener('click',()=>{week=Number(b.dataset.week);document.getElementById('session-picker').open=true;document.querySelectorAll('[data-week]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));selected=null;document.getElementById('attendance-form').hidden=true;if(ready)render();}));
document.getElementById('planner-program').addEventListener('change',()=>{if(ready)render();});
async function refresh(force=false){
 try{
 const read=async(gid,h)=>{const u=new URL(cfg.practiceBoardFeed);u.searchParams.set('gid',gid);u.searchParams.set('single','true');u.searchParams.set('_refresh',Date.now());const r=await fetch(u,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Feed unavailable');return records(await r.text(),h);};
 const results=await Promise.allSettled([S.load(force),read('408375415',['Date','Program','Attendance','Count']),read('1322956425',['Date','Program','Age band','Weight band','Skill','Count'])]);
 if(results[0].status!=='fulfilled')throw results[0].reason;
 data=results[0].value;countsReady=results[1].status==='fulfilled';groupsReady=results[2].status==='fulfilled';totals=countsReady?results[1].value:[];groups=groupsReady?results[2].value:[];ready=true;render();document.getElementById('board-status').textContent=countsReady?'Plans can change. Counts may take a few minutes to refresh.':'Attendance counts are temporarily unavailable. Practice signup is still available.';
 if(!force){const query=new URLSearchParams(location.search);const requested=S.sessions(data,S.monday(),14).find(p=>p.date===query.get('date')&&p.program===query.get('program'));if(requested){week=requested.date>=S.monday(1)?1:0;document.querySelectorAll('[data-week]').forEach(x=>x.setAttribute('aria-pressed',String(Number(x.dataset.week)===week)));render();choose(requested,false);}}
 }catch(e){console.warn('Practice planner unavailable:',e.message);ready=false;board.innerHTML='<p>The practice schedule or partner board is temporarily unavailable. This does not mean nobody is coming. Check with the club before visiting.</p>';document.getElementById('board-status').textContent='Check with the club if you need a confirmed partner.';document.getElementById('attendance-form').hidden=true;selected=null;}
}
let pending=null;
window.addEventListener('message',e=>{
 if(!pending || !/^https:\/\/[^/]+\.googleusercontent\.com$/.test(e.origin) || e.data?.type!=='tnwc-attendance' || e.data.nonce!==pending.nonce)return;
 clearTimeout(pending.timer); const done=pending;pending=null;done.form.remove();done.frame.remove();done.button.disabled=false;
 document.getElementById('rsvp-status').textContent=e.data.ok?'Your plan is saved. Thanks for helping the coaches plan practice. Counts may take a few minutes to update.':e.data.message||'Your plan could not be saved. Please try again.';
 if(e.data.ok)refresh(true);
});
document.getElementById('practice-rsvp').addEventListener('submit',e=>{
 e.preventDefault();const status=document.getElementById('rsvp-status');
 if(pending)return;
 if(!selected||!upcoming(selected)){status.textContent='Choose an upcoming practice first.';return;}
 if(!cfg.attendanceSubmitUrl){status.textContent='Website saving is awaiting account authorization. No plan has been saved.';return;}
 const f=new FormData(e.currentTarget),nonce=crypto.randomUUID(),frame=document.createElement('iframe'),form=document.createElement('form'),input=document.createElement('input'),button=e.currentTarget.querySelector('[type=submit]');
 frame.name='tnwc-'+nonce;frame.hidden=true;frame.title='Save practice plan';document.body.append(frame);
 form.method='POST';form.action=cfg.attendanceSubmitUrl;form.target=frame.name;form.hidden=true;input.name='payload';input.value=JSON.stringify({nonce,plan:{email:String(f.get('email')).trim(),wrestler:String(f.get('wrestler')).trim(),age:Number(f.get('age')),weight:Number(f.get('weight')),skill:f.get('skill'),attendance:f.get('attendance'),fictional:f.get('fictional')==='on',date:selected.date,program:selected.program,details:S.time(selected.start)+' to '+S.time(selected.end)+' ET | '+selected.location}});form.append(input);document.body.append(form);
 button.disabled=true;status.textContent='Saving your plan...';
 pending={nonce,frame,form,button,timer:setTimeout(()=>{pending=null;button.disabled=false;form.remove();frame.remove();status.textContent='We could not confirm that your plan was saved. Wait a moment before trying again; submitting the same details updates your existing plan.';},45000)};
 form.submit();
});
refresh();setInterval(()=>refresh(true),60000);
})();


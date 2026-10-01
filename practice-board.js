(() => {
  'use strict';
  const cfg=window.TNWC, board=document.getElementById('partner-board');
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let week=0, totals=[],groups=[],ready=false;
  const dateKey=d=>new Intl.DateTimeFormat('en-CA',{timeZone:cfg.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  const dateLabel=d=>new Intl.DateTimeFormat('en-US',{weekday:'long',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
  function records(text,headers){
    const rows=window.TNWCCampFeed.csv(text);
    if(!headers.every((h,i)=>rows[0]?.[i]===h))throw Error('Summary headings changed');
    return rows.slice(1).filter(r=>r[0]).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
  }
  function render(){
    const today=dateKey(new Date()), anchor=new Date(today+'T12:00:00Z');
    anchor.setUTCDate(anchor.getUTCDate()-((anchor.getUTCDay()+6)%7)+week*7);
    const cards=[];
    for(let n=0;n<7;n++){
      const d=new Date(anchor);d.setUTCDate(d.getUTCDate()+n);const key=d.toISOString().slice(0,10);
      for(const p of cfg.practices.filter(p=>p.day===d.getUTCDay())){
        const rows=totals.filter(r=>r.Date===key&&r.Program===p.program), come=Number(rows.find(r=>r.Attendance==='Coming')?.Count||0),maybe=Number(rows.find(r=>r.Attendance==='Maybe')?.Count||0);
        const visible=groups.filter(r=>r.Date===key&&r.Program===p.program&&Number(r.Count)>=3);
        const time=s=>{const [h,m]=s.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;};
        cards.push(`<article class="practice-session"><p class="eyebrow">${escape(dateLabel(key))}</p><h3>${escape(p.program)}</h3><p>${time(p.start)} to ${time(p.end)} ET</p><p class="attendance-count"><strong>${come}</strong> planning to come <span>· ${maybe} maybe</span></p>${visible.length?visible.map(g=>`<div class="partner-group"><strong>${Number(g.Count)} wrestlers</strong><span>Ages ${escape(g['Age band'])} · ${escape(g['Weight band'])} lb</span><span>${escape(g.Skill)}</span></div>`).join(''):'<p class="muted">No group details to show yet. Smaller groups stay private.</p>'}<a class="text-link" href="#attendance-form">Mark your plans →</a></article>`);
      }
    }
    document.getElementById('week-label').textContent=`Week of ${dateLabel(anchor.toISOString().slice(0,10))}`;
    board.innerHTML=cards.join('');
  }
  document.querySelectorAll('[data-week]').forEach(b=>b.addEventListener('click',()=>{week=Number(b.dataset.week);document.querySelectorAll('[data-week]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));if(ready)render();}));
  async function refresh(){
    try{
      const base=cfg.practiceBoardFeed;
      const read=async(gid,h)=>{const url=new URL(base);url.searchParams.set('gid',gid);url.searchParams.set('single','true');url.searchParams.set('_refresh',Date.now());const r=await fetch(url,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Feed unavailable');return records(await r.text(),h);};
      [totals,groups]=await Promise.all([read('408375415',['Date','Program','Attendance','Count']),read('1322956425',['Date','Program','Age band','Weight band','Skill','Count'])]);
      ready=true;render();document.getElementById('board-status').textContent='Plans can change. Counts may take a few minutes to refresh.';
    }catch(e){ready=false;board.innerHTML='<p>The practice board is temporarily unavailable. This does not mean nobody is coming. You can still submit your plans below.</p>';document.getElementById('board-status').textContent='Check with the club if you need a confirmed partner.';}
  }
  refresh();setInterval(refresh,60000);
})();

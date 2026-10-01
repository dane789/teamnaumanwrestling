(() => {
  'use strict';
  const c = window.TNWC;
  let travelState = window.TNWC.travelEventFeed ? 'loading' : 'ready';
  const hostedFeedStates = new Map((c.hostedEventFeeds || (c.miniCampFeedUrl ? [{kind:'Camp'}] : [])).map(f=>[f.kind,'loading']));
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safeUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } };
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const time = value => { const [h,m] = value.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`; };
  const dialog = $('service-dialog');
  function pending(title, description) {
    $('dialog-title').textContent = title;
    $('dialog-description').textContent = description;
    dialog.showModal();
  }
  function contact() {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.contactEmail)) {
      location.href = `mailto:${encodeURIComponent(c.contactEmail)}?subject=${encodeURIComponent('Team Nauman club inquiry')}`;
    } else pending('Let’s connect with the club.', 'The club’s current contact details are being confirmed. Email the club for help.');
  }
  const services = {
    registrationUrl: ['Registration is being prepared.', 'Choose the Roots / Saplings form in Programs, or an event-specific form in Events. General club enrollment still needs a confirmed form. The website itself does not collect registration or payment.'],
    tournamentInterestUrl: ['Tournament requests are not open yet.', 'The private team request form will open when the club confirms its events and roster process. No tournament place has been reserved.'],
    publicResourcesUrl: ['Family resources are coming.', 'Only documents approved for public sharing will appear here. Private rosters and family contact information stay with the coaches.'],
    privateTrainingUrl: ['Arrange a session with a coach.', 'Private and small-group sessions need a coach’s confirmation. Contact the club to discuss times and availability.']
  };
  document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.service;
    const url = safeUrl(c[key]);
    if (url && c.launchReady) window.open(url, '_blank', 'noopener,noreferrer');
    else if (key === 'privateTrainingUrl' && c.contactEmail) contact();
    else pending(...services[key]);
  }));
  $('contact-button').addEventListener('click', contact);
  $('dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
  const menu = document.querySelector('.menu-toggle');
  menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); $('navigation').classList.toggle('open', open); });
  $('navigation').querySelectorAll('a').forEach(link => link.addEventListener('click', () => { menu.setAttribute('aria-expanded','false'); $('navigation').classList.remove('open'); }));
  $('year').textContent = new Intl.DateTimeFormat('en-US',{year:'numeric',timeZone:c.timezone}).format(new Date());
  $('address').textContent = c.address;
  $('directions').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`;
  if(c.scheduleApprovedOn) $('schedule-verification').textContent = `Club-confirmed plan · updated ${c.scheduleApprovedOn}`;
  function featuredEvent() {
  const nextHosted = c.events.filter(e=>(!hostedFeedStates.has(e.kind)||hostedFeedStates.get(e.kind)==='ready') && !e.travel && !e.cancelled && !e.testOnly && Date.parse(e.end)>Date.now()).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start))[0];
  const feature = document.querySelector('.practice-feature');
  if(nextHosted) {
    feature.innerHTML = `<span class="section-number">NEXT AT NAUMAN / 01</span><h2 id="practice-feature-title">YOUR NEXT<br>MAT DAY.</h2><p>${escape(nextHosted.title)}</p><div class="feature-row"><strong>${escape(new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeZone:c.timezone}).format(new Date(nextHosted.start)))}</strong><span>${nextHosted.allDay ? 'See division schedule' : escape(new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:c.timezone}).format(new Date(nextHosted.start)))+'–'+escape(new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:c.timezone}).format(new Date(nextHosted.end)))+' ET'}</span></div><p class="feature-note">${nextHosted.timeUnconfirmed ? 'Confirm the finish time with the club.' : 'Read the event details and confirm availability.'}</p><a class="text-link" href="?eventType=${encodeURIComponent(nextHosted.kind)}#event-list" data-event-kind="${escape(nextHosted.kind)}">Explore the event →</a>`;
  } else feature.innerHTML = '<span class="section-number">AT TEAM NAUMAN / 01</span><h2 id="practice-feature-title">MORE MAT<br>TIME.</h2><p>New camps and duals will appear when announced.</p><a class="text-link" href="#schedule">Find your weekly practice →</a>';
  }
  featuredEvent();
  let practiceWeek=0,practiceData=null;
  function practices(){
    if(!practiceData)return;const S=window.TNWCPracticeSchedule,program=$('program-filter').value;
    const list=S.sessions(practiceData,S.monday(practiceWeek)).filter(p=>p.date>=S.today()&&(p.status==='Cancelled'||Date.parse(window.TNWCCampFeed.eastern(p.date,p.start,c.timezone))>Date.now())&&(program==='all'||p.program===program));
    $('schedule-week-label').textContent='Week of '+S.label(S.monday(practiceWeek));
    $('practice-list').innerHTML=list.length?list.map(p=>`<article class="practice-row ${p.status==='Cancelled'?'practice-cancelled':''}"><span class="day">${escape(S.label(p.date))}</span><div><h3>${escape(p.program)}${p.status==='Cancelled'?' <small>Cancelled</small>':''}</h3><p>${escape(p.location)}${p.note?'<br>'+escape(p.note):''}</p></div><div class="practice-row-actions"><span class="time">${S.time(p.start)}${p.end?' to '+S.time(p.end)+' ET':''}</span>${p.status==='Cancelled'?'<span>Attendance closed</span>':`<a class="text-link" href="${escape(S.pageUrl(p))}">Mark your plans →</a>`}</div></article>`).join(''):'<p>No upcoming practices listed for this selection. Try next week or another program.</p>';
  }
  document.querySelectorAll('[data-practice-week]').forEach(button=>button.addEventListener('click',()=>{practiceWeek=Number(button.dataset.practiceWeek);document.querySelectorAll('[data-practice-week]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));practices();}));
  $('program-filter').addEventListener('change',practices);
  async function refreshPractices(force=false){try{practiceData=await window.TNWCPracticeSchedule.load(force);practices();$('schedule-verification').textContent='';}catch(e){practiceData=null;$('practice-list').innerHTML='<p>The practice schedule is temporarily unavailable. Check with the club before visiting.</p>';}}
  refreshPractices();setInterval(()=>refreshPractices(true),60000);
  function calendarUrl() { return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(c.calendarId)}&ctz=${encodeURIComponent(c.timezone)}&mode=AGENDA&showTitle=0`; }
  if(!c.calendarId) { $('calendar-toggle').hidden=true; $('calendar-subscribe').hidden=true; $('calendar-toggle').parentElement.insertAdjacentHTML('beforeend','<p>Practice changes appear above. Check with the club if you need confirmation before visiting.</p>'); }
  $('calendar-toggle').addEventListener('click', () => {
    if(!c.calendarId) return pending('The live calendar is not connected yet.', 'The published practice plan is shown above. The club needs to connect its public Google Calendar for live changes and cancellations.');
    const show = $('calendar-panel').hidden;
    if(show && !$('calendar-panel').children.length) { const frame = document.createElement('iframe'); frame.src = calendarUrl(); frame.title = 'Team Nauman public schedule'; frame.loading = 'lazy'; frame.referrerPolicy = 'strict-origin-when-cross-origin'; $('calendar-panel').append(frame); }
    $('calendar-panel').hidden = !show; $('calendar-toggle').setAttribute('aria-expanded',String(show));
  });
  $('calendar-subscribe').addEventListener('click', () => c.calendarId ? window.open(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(c.calendarId)}`, '_blank','noopener,noreferrer') : pending('Calendar subscriptions are coming.', 'The club’s public Google Calendar must be connected before you can subscribe. No reminder subscription has been created.'));
  $('coach-list').innerHTML = c.coaches.map(coach => `<article class="coach-card">${coach.photo ? `<img class="coach-photo" src="${escape(coach.photo)}" alt="${escape(coach.photoAlt || coach.name)}" loading="lazy" width="240" height="240">` : `<div class="coach-initials" aria-hidden="true">${escape(coach.name.split(' ').map(part=>part[0]).join(''))}</div>`}<h3>${escape(coach.name)}</h3><p class="coach-role">${escape(coach.role)}</p>${coach.bio ? `<p class="coach-bio">${escape(coach.bio)}</p>` : ''}</article>`).join('');
  function eventLink(e) {
    const compact = date => new Date(date).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    const dates = e.allDay ? `${e.start.slice(0,10).replace(/-/g,'')}/${e.end.slice(0,10).replace(/-/g,'')}` : `${compact(e.start)}/${compact(e.end)}`;
    const params = new URLSearchParams({action:'TEMPLATE',text:e.title,dates,location:e.location || '',details:e.description || '',ctz:c.timezone});
    return `https://calendar.google.com/calendar/render?${params}`;
  }
  function events() {
    const now = Date.now(); const kind = $('event-filter').value;
    const list = c.events.filter(e => Number.isFinite(Date.parse(e.start)) && Date.parse(e.end) >= now ).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));
    const relevantStates=[...hostedFeedStates].filter(([type])=>kind==='all'||type===kind).map(([,state])=>state);
    const emptyHeading=relevantStates.includes('loading')?'Loading the latest events…':relevantStates.includes('unavailable')?'Event schedule temporarily unavailable.':'No upcoming dates in this category.';
    const emptyDetail=relevantStates.includes('loading')?'Checking the club’s current schedule.':relevantStates.includes('unavailable')?'Please refresh or contact the club before visiting.':'Try another event filter. Past events appear in the history section below.';
    const render = entries => entries.length ? entries.map(e => {
      const dateFormat = new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:c.timezone});
      const lastDay = new Date(Date.parse(e.end)-(e.allDay ? 1 : 0));
      const date = e.allDay && dateFormat.format(new Date(e.start))!==dateFormat.format(lastDay) ? dateFormat.formatRange(new Date(e.start),lastDay) : dateFormat.format(new Date(e.start));
      const clock = new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:c.timezone});
      const timing = new Intl.DateTimeFormat('en-US',{weekday:'long',month:'short',day:'numeric',year:'numeric',timeZone:c.timezone}).format(new Date(e.start)) + (e.allDay ? ' · Times vary. See event details.' : ` · ${clock.format(new Date(e.start))}–${clock.format(new Date(e.end))} ET${e.timeUnconfirmed ? ' (finish to be confirmed)' : ''}`);
      const open = !e.cancelled && (c.launchReady || e.registrationVerified) && safeUrl(e.registrationUrl) && (!e.deadline || Date.parse(e.deadline) >= now);
      return `<article class="event-card ${e.travel ? 'travel-card' : ''} ${e.cancelled ? 'event-cancelled' : ''}"><div class="event-date">${e.cancelled ? '<small>Original date</small>' : ''}${escape(date)}</div><div><span class="badge">${escape(e.kind)}${e.rosterStatus ? " · "+escape(e.rosterStatus) : ""}${e.testOnly ? " · TEST ONLY" : ""}${e.cancelled ? " · Cancelled" : ""}</span>${e.organizer ? `<p class="tournament-brand ${escape(e.brand)}">${escape(e.organizer)}</p>` : ''}<h3>${escape(e.title)}</h3>${e.cancelled ? `<details class="cancelled-original"><summary>Originally scheduled event details</summary><p>${escape(timing)} · ${escape(e.location)}</p><p>${escape(e.description)}</p></details>` : `<p>${escape(timing)} · ${escape(e.location)}</p><p>${escape(e.description)}</p>`}${!e.cancelled && e.travelDetails ? `<details class="travel-details"><summary>Plan your tournament weekend</summary><ul>${e.travelDetails.map(detail=>`<li>${escape(detail)}</li>`).join('')}</ul><p>Check the organizer’s current schedule and rules. Coaches confirm roster openings privately.</p></details>` : ''}${!e.cancelled && e.deadline ? `<p>Registration deadline: ${escape(new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:c.timezone}).format(new Date(e.deadline)))} ET</p>` : ''}</div><div class="event-actions">${open ? `<a class="button dark" href="${escape(safeUrl(e.registrationUrl))}" target="_blank" rel="noopener noreferrer">View club signup form ↗</a>` : e.cancelled ? `<strong>Registration closed</strong><a class="text-link" href="mailto:${escape(c.contactEmail)}?subject=${encodeURIComponent('Cancelled event: '+e.title)}&amp;body=${encodeURIComponent('Hello Team Nauman,\n\nI have a question about the cancelled '+e.title+' event.\n\nParent / wrestler name:\nAlready registered or paid (yes / no):\nQuestion:\n\nPlease let us know the next steps. Thank you.')}">Contact the club →</a>` : e.testOnly ? '<span>Website test: no signup</span>' : e.travel && e.rosterStatus!=='Recruiting' ? '<span>Roster '+escape(e.rosterStatus.toLowerCase())+'</span>' : '<span>Signup link to be confirmed</span>'}${e.cancelled || e.testOnly ? '' : e.dateUnconfirmed || e.timeUnconfirmed ? '<span>Confirm timing before adding to your calendar</span>' : `<a class="text-link" href="${escape(eventLink(e))}" target="_blank" rel="noopener noreferrer">Add to my calendar</a>`}${!e.cancelled && e.location && !/\b(TBD|to be confirmed|pending)\b/i.test(e.location) ? `<a class="text-link" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(e.location)}" target="_blank" rel="noopener noreferrer">Get event directions ↗</a>` : ''}${!e.cancelled && safeUrl(e.organizerUrl) ? `<a class="text-link" href="${escape(safeUrl(e.organizerUrl))}" target="_blank" rel="noopener noreferrer">Official tournament details ↗</a>` : ''}${!e.cancelled && safeUrl(e.teamRegistrationUrl) ? `<a class="text-link" href="${escape(safeUrl(e.teamRegistrationUrl))}" target="_blank" rel="noopener noreferrer">Team registration form ↗</a>` : ''}</div></article>`;
    }).join('') : `<div class="empty-state"><span class="empty-mark" aria-hidden="true">/</span><div><h3>${escape(emptyHeading)}</h3><p>${escape(emptyDetail)}</p></div></div>`;
    $('event-list').innerHTML = render(list.filter(e=>!e.travel && (kind==='test' ? e.testOnly : !e.testOnly && (kind==='all'||e.kind===kind))));
    $('travel-event-list').innerHTML = travelState==='ready' ? render(list.filter(e=>e.travel)) : '<p>'+(travelState==='loading'?'Loading travel tournaments...':'The travel tournament schedule is temporarily unavailable. Check with the club before registering or booking travel.')+'</p>';
    const superSixCancelled = c.events.some(e=>!e.travel && e.cancelled && /super six/i.test(e.title));
    document.querySelectorAll('.event-ticker-group a').forEach(link=>{
      if(/SUPER SIX/.test(link.textContent))link.textContent=superSixCancelled?'SUPER SIX · Cancelled':'SUPER SIX DUALS';
    });
    const past=c.events.filter(e=>Date.parse(e.end)<now).sort((a,b)=>Date.parse(b.start)-Date.parse(a.start));
    $('recent-event-history').hidden=!past.length;
    $('recent-event-history').innerHTML=past.map(e=>`<p><strong>${escape(e.title)}</strong><br>${escape(new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeZone:c.timezone}).format(new Date(e.start)))} · ${escape(e.location)} · Past event</p>`).join('');
  }
  function selectedEventKind() {
    const requested=new URLSearchParams(location.search).get('eventType') || 'all';
    return ['all','Camp','Clinic','Tournament'].includes(requested) ? requested : 'all';
  }
  $('event-filter').value=selectedEventKind();
  $('event-filter').addEventListener('change',()=>{
    const url=new URL(location.href); url.searchParams.set('eventType',$('event-filter').value);
    history.replaceState(null,'',url); events();
  });
  document.addEventListener('click',e=>{
    const link=e.target.closest('a[data-event-kind]');
    if(!link || e.button!==0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)return;
    e.preventDefault(); $('event-filter').value=link.dataset.eventKind; events();
    const url=new URL(link.href); history.pushState(null,'',url);
    document.querySelector(url.hash)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });
  window.addEventListener('popstate',()=>{ $('event-filter').value=selectedEventKind(); events(); });
  events();
  // Public event details only; each worksheet is refreshed independently.
  const feeds = c.hostedEventFeeds || (c.miniCampFeedUrl ? [{kind:'Camp',label:'Mini Camps',url:c.miniCampFeedUrl}] : []);
  let feedBusy = false;
  const feedNote = document.createElement('p');
  feedNote.setAttribute('role','status'); feedNote.className='event-feed-note'; feedNote.hidden = !feeds.length;
  $('event-filter').parentElement.insertAdjacentElement('afterend',feedNote);
  if(feeds.length) { c.events=c.events.filter(e=>e.travel || !feeds.some(f=>f.kind===e.kind)); events(); feedNote.textContent='Loading the latest hosted event schedule…'; }
  async function refreshHostedEvents() {
    if(!feeds.length || feedBusy) return;
    feedBusy = true;
    const controller = new AbortController(), timeout = setTimeout(()=>controller.abort(),20000);
    try {
      const response=await fetch('./mini-camps.schema.json',{signal:controller.signal});
      if(!response.ok)throw Error('Event schema unavailable');
      const schema=await response.json();
      const results=await Promise.allSettled(feeds.map(async feed=>{
        const endpoint=new URL(feed.url);
        if(endpoint.protocol!=='https:' || endpoint.hostname!=='docs.google.com' || !endpoint.pathname.endsWith('/pub') || endpoint.searchParams.get('output')!=='csv')throw Error('Invalid event feed');
        endpoint.searchParams.set('_refresh',Date.now());
        const response=await fetch(endpoint.href,{cache:'no-store',credentials:'omit',signal:controller.signal});
        if(!response.ok)throw Error('Event feed unavailable');
        return window.TNWCCampFeed.read(await response.text(),schema,feed.kind);
      }));
      const unavailable=[],warnings=[];
      results.forEach((result,index)=>{
        const feed=feeds[index];
        c.events=c.events.filter(e=>e.travel || e.kind!==feed.kind);
        if(result.status==='fulfilled') { hostedFeedStates.set(feed.kind,'ready'); c.events.push(...result.value.events); if(result.value.errors.length)warnings.push(feed.label); }
        else { hostedFeedStates.set(feed.kind,'unavailable'); unavailable.push(feed.label); }
      });
      feedNote.classList.toggle('needs-attention',Boolean(unavailable.length||warnings.length));
      feedNote.textContent=unavailable.length ? unavailable.join(', ')+' schedule temporarily unavailable. Check with the club before visiting.' : warnings.length ? 'Some '+warnings.join(', ')+' details await confirmation. Contact the club if your event is missing.' : 'Updated '+new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:c.timezone}).format(new Date())+' ET.';
    } catch(error) {
      feeds.forEach(f=>hostedFeedStates.set(f.kind,'unavailable'));
      c.events=c.events.filter(e=>e.travel || !feeds.some(f=>f.kind===e.kind));
      feedNote.classList.add('needs-attention');
      feedNote.textContent='The hosted event schedule is temporarily unavailable. Please check with the club before visiting.';
    } finally { clearTimeout(timeout); feedBusy=false; events(); featuredEvent(); }
  }
  refreshHostedEvents(); setInterval(refreshHostedEvents,60000);
  async function refreshTravel(){
    if(!c.travelEventFeed)return;
    try{
      const url=new URL(c.travelEventFeed);url.searchParams.set('_refresh',Date.now());
      const [feed,s]=await Promise.all([fetch(url,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(20000)}),fetch('./mini-camps.schema.json')]);
      if(!feed.ok||!s.ok)throw Error('Travel feed unavailable');
      const parsed=window.TNWCCampFeed.read(await feed.text(),await s.json(),'Tournament',true);
      if(parsed.errors.length)throw Error('Travel details need correction');
      c.events=c.events.filter(e=>!e.travel);c.events.push(...parsed.events);travelState='ready';events();
    }catch(e){console.warn('Travel schedule:',e.message);travelState='unavailable';$('travel-event-list').innerHTML='<p>The travel tournament schedule is temporarily unavailable. Check with the club before registering or booking travel.</p>';}
  }
  refreshTravel();setInterval(refreshTravel,60000);
  // Refresh expiring notices and deadlines while a visitor leaves the page open.
  setInterval(() => { events(); featuredEvent(); },60000);
  if(c.testimonials.length) $('testimonial-list').innerHTML = `<div class="testimonial-grid">${c.testimonials.map(t=>`<blockquote><p>“${escape(t.quote)}”</p><footer>${escape(t.attribution)}</footer></blockquote>`).join('')}</div>`;
  else $('stories').hidden = true;
})();

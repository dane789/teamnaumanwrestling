(() => {
  'use strict';
  const c = window.TNWC;
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
  const nextHosted = c.events.filter(e=>!e.travel && Date.parse(e.end)>Date.now()).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start))[0];
  const feature = document.querySelector('.practice-feature');
  if(nextHosted) {
    feature.innerHTML = `<span class="section-number">NEXT AT NAUMAN / 01</span><h2 id="practice-feature-title">YOUR NEXT<br>MAT DAY.</h2><p>${escape(nextHosted.title)}</p><div class="feature-row"><strong>${escape(new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeZone:c.timezone}).format(new Date(nextHosted.start)))}</strong><span>${nextHosted.allDay ? 'See division schedule' : escape(new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:c.timezone}).format(new Date(nextHosted.start)))+'–'+escape(new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:c.timezone}).format(new Date(nextHosted.end)))+' ET'}</span></div><p class="feature-note">${nextHosted.timeUnconfirmed ? 'Confirm the finish time with the club.' : 'Read the event details and confirm availability.'}</p><a class="text-link" href="?eventType=${encodeURIComponent(nextHosted.kind)}#event-list" data-event-kind="${escape(nextHosted.kind)}">Explore the event →</a>`;
  } else feature.innerHTML = '<span class="section-number">AT TEAM NAUMAN / 01</span><h2 id="practice-feature-title">MORE MAT<br>TIME.</h2><p>New camps and duals will appear when announced.</p><a class="text-link" href="#schedule">Find your weekly practice →</a>';
  }
  featuredEvent();
  let day = 'all';
  function practices() {
    const program = $('program-filter').value;
    const list = c.practices.filter(p => (day === 'all' || p.day === Number(day)) && (program === 'all' || p.program === program)).sort((a,b) => ((a.day + 6) % 7) - ((b.day + 6) % 7) || a.start.localeCompare(b.start));
    $('practice-list').innerHTML = list.length ? list.map(p => `<article class="practice-row"><span class="day">${days[p.day]}</span><div><h3>${escape(p.program)}</h3><p>500 Penn Street · Middletown, PA 17057${p.note ? '<br>'+escape(p.note) : ''}</p></div><span class="time">${time(p.start)} – ${time(p.end)}</span></article>`).join('') : '<div class="empty-state"><p>No sessions match these filters. Choose another day or program.</p></div>';
  }
  document.querySelectorAll('[data-day]').forEach(button => button.addEventListener('click', () => { day = button.dataset.day; document.querySelectorAll('[data-day]').forEach(b => b.setAttribute('aria-pressed',String(b === button))); practices(); }));
  $('program-filter').addEventListener('change',practices); practices();
  function calendarUrl() { return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(c.calendarId)}&ctz=${encodeURIComponent(c.timezone)}&mode=AGENDA&showTitle=0`; }
  if(!c.calendarId) { $('calendar-toggle').hidden=true; $('calendar-subscribe').hidden=true; $('calendar-toggle').parentElement.insertAdjacentHTML('beforeend','<p>For schedule changes and cancellations, check the club newsletter or email the club before visiting.</p>'); }
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
    const render = entries => entries.length ? entries.map(e => {
      const dateFormat = new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:c.timezone});
      const lastDay = new Date(Date.parse(e.end)-(e.allDay ? 1 : 0));
      const date = e.allDay && dateFormat.format(new Date(e.start))!==dateFormat.format(lastDay) ? dateFormat.formatRange(new Date(e.start),lastDay) : dateFormat.format(new Date(e.start));
      const clock = new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:c.timezone});
      const timing = new Intl.DateTimeFormat('en-US',{weekday:'long',year:'numeric',timeZone:c.timezone}).format(new Date(e.start)) + (e.allDay ? ' · See division schedule' : ` · ${clock.format(new Date(e.start))}–${clock.format(new Date(e.end))}${e.timeUnconfirmed ? ' (finish to be confirmed)' : ''}`);
      const open = (c.launchReady || e.registrationVerified) && safeUrl(e.registrationUrl) && (!e.deadline || Date.parse(e.deadline) >= now);
      return `<article class="event-card ${e.travel ? 'travel-card' : ''}"><div class="event-date">${escape(date)}</div><div><span class="badge">${escape(e.kind)}</span>${e.organizer ? `<p class="tournament-brand ${escape(e.brand)}">${escape(e.organizer)}</p>` : ''}<h3>${escape(e.title)}</h3><p>${escape(timing)} ET · ${escape(e.location)}</p><p>${escape(e.description)}</p>${e.travelDetails ? `<details class="travel-details"><summary>Plan your tournament weekend</summary><ul>${e.travelDetails.map(detail=>`<li>${escape(detail)}</li>`).join('')}</ul><p>Organizer details checked September 30, 2026. Club roster openings are confirmed privately by coaches.</p></details>` : ''}${e.deadline ? `<p>Registration deadline: ${escape(new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:c.timezone}).format(new Date(e.deadline)))} ET</p>` : ''}</div><div class="event-actions">${open ? `<a class="button dark" href="${escape(safeUrl(e.registrationUrl))}" target="_blank" rel="noopener noreferrer">View club signup form ↗</a>` : '<span>Form access not verified</span>'}${e.dateUnconfirmed || e.timeUnconfirmed ? '<span>Confirm timing before adding to your calendar</span>' : `<a class="text-link" href="${escape(eventLink(e))}" target="_blank" rel="noopener noreferrer">Add to my calendar</a>`}${safeUrl(e.organizerUrl) ? `<a class="text-link" href="${escape(safeUrl(e.organizerUrl))}" target="_blank" rel="noopener noreferrer">Official tournament details ↗</a>` : ''}${safeUrl(e.teamRegistrationUrl) ? `<a class="text-link" href="${escape(safeUrl(e.teamRegistrationUrl))}" target="_blank" rel="noopener noreferrer">Team registration form ↗</a>` : ''}</div></article>`;
    }).join('') : '<div class="empty-state"><span class="empty-mark" aria-hidden="true">/</span><div><h3>No upcoming dates in this category.</h3><p>Try another event filter. Past events appear in the history section below.</p></div></div>';
    $('event-list').innerHTML = render(list.filter(e=>!e.travel && (kind==='all'||e.kind===kind)));
    $('travel-event-list').innerHTML = render(list.filter(e=>e.travel));
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
  // Refresh expiring notices and deadlines while a visitor leaves the page open.
  function announcements() {
    const live = c.announcements.filter(a => Date.parse(a.expires) > Date.now());
    $('announcements').hidden = !live.length;
    $('announcements').innerHTML = live.map(a=>`<p>${escape(a.text)}</p>`).join('');
  }
  announcements(); setInterval(() => { events(); featuredEvent(); announcements(); },60000);
  if(c.testimonials.length) $('testimonial-list').innerHTML = `<div class="testimonial-grid">${c.testimonials.map(t=>`<blockquote><p>“${escape(t.quote)}”</p><footer>${escape(t.attribution)}</footer></blockquote>`).join('')}</div>`;
  else $('stories').hidden = true;
})();

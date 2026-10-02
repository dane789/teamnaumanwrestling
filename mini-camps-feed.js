(function(root){
  'use strict';
  function csv(text) {
    const rows=[]; let row=[],value='',quoted=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i];
      if(ch==='"') { if(quoted && text[i+1]==='"'){value+='"';i++;} else if(quoted || !value) quoted=!quoted; else value+=ch; }
      else if(ch===',' && !quoted){row.push(value);value='';}
      else if((ch==='\n'||ch==='\r') && !quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(value);rows.push(row);row=[];value='';}
      else value+=ch;
    }
    if(quoted)throw Error('Incomplete camp feed');
    if(value || row.length){row.push(value);rows.push(row);}
    return rows;
  }
  function eastern(date,time,timezone){
    const midday=new Date(date+'T12:00:00Z');
    if(!Number.isFinite(midday.getTime()) || midday.toISOString().slice(0,10)!==date)throw Error('Invalid date');
    const offset=new Intl.DateTimeFormat('en-US',{timeZone:timezone,timeZoneName:'shortOffset'}).formatToParts(midday).find(p=>p.type==='timeZoneName').value.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
    const iso=date+'T'+time+':00'+(offset?offset[1]+offset[2].padStart(2,'0')+':'+(offset[3]||'00'):'Z');
    const actual=new Date(iso);
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(actual);
    const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
    if(`${p.year}-${p.month}-${p.day}`!==date || `${p.hour}:${p.minute}`!==time)throw Error('Invalid Eastern time');
    return iso;
  }
  function read(text,schema,kind='Camp',travel=false){
    if(!['Camp','Clinic','Tournament'].includes(kind))throw Error('Invalid event type');
    if(schema.type!=='object'||!schema.properties||!schema['x-sheet-columns'])throw Error('Camp schema unavailable');
    const rows=csv(text),columns=schema['x-sheet-columns'];
    const headerIndex=rows.findIndex(r=>Object.keys(columns).every(h=>r.includes(h)||(h==='Camp'&&r.includes('Event'))));
    if(headerIndex<0)throw Error('Camp headings changed');
    const headers=rows[headerIndex],errors=[],valid=[];
    rows.slice(headerIndex+1).forEach((values,index)=>{
      const rowNumber=headerIndex+index+2;
      const titleHeader=headers.includes('Event')?'Event':'Camp';
      if(!String(values[headers.indexOf(titleHeader)]||'').trim())return;
      const obj={};
      Object.entries(columns).forEach(([header,key])=>{const str=String(values[headers.indexOf(header==='Camp'?titleHeader:header)]||'').trim();obj[key]=['number','integer'].includes(schema.properties[key].type)?(str===''?NaN:Number(str)):str;});
      const extra=h=>String(values[headers.indexOf(h)]||'').trim();
      const allDay=extra('All day').toUpperCase()==='TRUE';
      const endDate=extra('End date')||obj.date;
      const teamLink=extra('Team signup link');
      if(obj.status==='Draft')return;
      try{
        for(const [key,rule] of Object.entries(schema.properties)){
          const v=obj[key];
          if(allDay && ['startTime','endTime'].includes(key))continue;
          if(kind!=='Camp' && ['fee','capacity'].includes(key) && extra(key==='fee'?'Price':'Capacity')==='')continue;
          if(rule.type==='string' && (typeof v!=='string'||v.length<(rule.minLength||0)||v.length>(rule.maxLength||Infinity)||rule.pattern&&!new RegExp(rule.pattern).test(v)))throw Error('Check '+key);
          if(['number','integer'].includes(rule.type) && (!Number.isFinite(v)||v<(rule.minimum??-Infinity)||rule.type==='integer'&&!Number.isInteger(v)))throw Error('Check '+key);
          if(rule.enum&&!rule.enum.includes(v))throw Error('Check '+key);
        }
        if(!/^\d{4}-\d{2}-\d{2}$/.test(endDate)||endDate<obj.date)throw Error('Check end date');
        eastern(endDate,'12:00',schema['x-timezone']);
        if(teamLink&&!new RegExp(schema.properties.registrationUrl.pattern).test(teamLink))throw Error('Check team signup link');
        if(extra('All day')&&!['TRUE','FALSE'].includes(extra('All day').toUpperCase()))throw Error('Check All day');
        const nextDate=new Date(endDate+'T12:00:00Z');nextDate.setUTCDate(nextDate.getUTCDate()+1);
        const start=eastern(obj.date,allDay?'00:00':obj.startTime,schema['x-timezone']),end=eastern(allDay?nextDate.toISOString().slice(0,10):endDate,allDay?'00:00':obj.endTime,schema['x-timezone']);
        if(Date.parse(end)<=Date.parse(start))throw Error('End must be after start');
        const testOnly=/\bTEST ONLY\b/i.test(obj.title+' '+obj.description);
        const price=Number.isFinite(obj.fee)?` $${obj.fee} per wrestler.`:' Fee: confirm with the club.';
        const capacity=Number.isFinite(obj.capacity)?` Limited to ${obj.capacity} wrestlers.`:'';
        const roster=extra('Roster status');
        if(travel&&!['Recruiting','Full','Closed'].includes(roster))throw Error('Check roster status');
        const detail=travel?[extra('Divisions')&&'Divisions: '+extra('Divisions'),extra('Weights needed')&&'Open weights: '+extra('Weights needed'),extra('Weigh-ins')&&'Weigh-ins: '+extra('Weigh-ins'),extra('Signup deadline')&&'Club signup deadline: '+extra('Signup deadline'),...extra('Weekend notes').split(/\r?\n/)].filter(Boolean):undefined;
        const closed=obj.status==='Cancelled'||testOnly||(travel&&roster!=='Recruiting');
        valid.push({id:obj.id,title:obj.title,kind,start,end,allDay,location:obj.location,fee:obj.fee,capacity:obj.capacity,description:obj.description+price+capacity,registrationUrl:closed?'':obj.registrationUrl,teamRegistrationUrl:closed?'':teamLink,registrationVerified:!!obj.registrationUrl&&!closed,cancelled:obj.status==='Cancelled',testOnly,rowNumber,...(travel?{travel:true,organizer:extra('Organizer'),organizerUrl:extra('Official link'),divisions:extra('Divisions'),weightsNeeded:extra('Weights needed'),familyDeadline:extra('Signup deadline'),travelDetails:detail,rosterStatus:roster}:{} )});
      }catch(error){errors.push({row:rowNumber,message:error.message});}
    });
    const counts=new Map();valid.forEach(e=>counts.set(e.id,(counts.get(e.id)||0)+1));
    const events=valid.filter(e=>{if(counts.get(e.id)>1){errors.push({row:e.rowNumber,message:'Duplicate ID'});return false;}return true;});
    return {events,errors};
  }
  const api={read,csv,eastern};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.TNWCCampFeed=api;
})(typeof window==='undefined'?{}:window);

const defaultState = {
  profile: 'GraceAnn',
  tasks: [
    { id: crypto.randomUUID(), title: 'Confirm football schedule when coach sends it', owner: 'Andrew', due: 'This week', done: false },
    { id: crypto.randomUUID(), title: 'School forms + first-week paperwork', owner: 'Shared', due: 'Before school', done: false },
    { id: crypto.randomUUID(), title: 'Friday dinner plan', owner: 'Andrew', due: 'Friday', done: false }
  ],
  events: [
    { id: crypto.randomUUID(), day: 'Friday', date: 'Aug 7', time: '3:30 PM', title: 'Family reset / weekend handoff', person: 'Family' },
    { id: crypto.randomUUID(), day: 'Saturday', date: 'Aug 8', time: '10:00 AM', title: 'Football', person: 'Tennyson' }
  ],
  domains: [
    { id: crypto.randomUUID(), name: 'School communication', owner: 'GraceAnn', note: 'Emails, forms, teacher follow-up' },
    { id: crypto.randomUUID(), name: 'Football logistics', owner: 'Andrew', note: 'Schedule, gear, rides, reminders' },
    { id: crypto.randomUUID(), name: 'Dinner Wed–Fri', owner: 'GraceAnn', note: 'Use prepped / oven-ready meals' },
    { id: crypto.randomUUID(), name: 'Weekend meal reset', owner: 'Andrew', note: 'Groceries + prep before work stretch' },
    { id: crypto.randomUUID(), name: 'Hearth upkeep', owner: 'Shared', note: 'Chores stay on Hearth; no duplicate tracking' },
    { id: crypto.randomUUID(), name: 'Family calendar hygiene', owner: 'Andrew', note: 'Add dates as soon as they arrive' }
  ],
  meals: [
    { day: 'Monday', meal: 'Sheet-pan chicken + potatoes', note: 'Green beans; season kids’ portions simply.' },
    { day: 'Tuesday', meal: 'Burgers + oven fries', note: 'Raw veggies or roasted broccoli.' },
    { day: 'Wednesday', meal: 'Prepped pork tenderloin', note: 'Roasted carrots + rice.' },
    { day: 'Thursday', meal: 'Chicken sausages + potatoes', note: 'Everything on one pan.' },
    { day: 'Friday', meal: 'Pizza + cut fruit', note: 'Intentional easy night.' }
  ],
  calendarSources: [
    { name: 'GraceAnn', type: 'Apple Calendar' }, { name: 'Andrew', type: 'Apple Calendar' },
    { name: 'Emerson', type: 'Apple Calendar' }, { name: 'Tennyson', type: 'Apple Calendar' },
    { name: 'Alouette', type: 'Apple Calendar' }, { name: 'Hearth', type: 'Chores / routines' }
  ],
  updatedAt: new Date().toISOString()
};

const LS_KEY = 'visser-command-center-state-v1';
const CODE_KEY = 'visser-command-center-code';
let state = loadLocal();
let cloudConnected = false;

function loadLocal(){
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || structuredClone(defaultState); }
  catch { return structuredClone(defaultState); }
}
function saveLocal(){ state.updatedAt = new Date().toISOString(); localStorage.setItem(LS_KEY, JSON.stringify(state)); render(); debounceSync(); }
function familyCode(){ return localStorage.getItem(CODE_KEY) || ''; }
let syncTimer;
function debounceSync(){ clearTimeout(syncTimer); if(familyCode()) syncTimer=setTimeout(pushCloud,450); }

async function pullCloud(){
  if(!familyCode()) return setSync(false,'Local');
  try{
    setSync(false,'Syncing…');
    const res=await fetch('/api/state',{headers:{'X-Household-Code':familyCode()}});
    if(!res.ok) throw new Error(await res.text());
    const remote=await res.json();
    if(remote?.state){ state=remote.state; localStorage.setItem(LS_KEY,JSON.stringify(state)); }
    cloudConnected=true; setSync(true,'Shared'); render();
  }catch(e){ cloudConnected=false; setSync(false,'Local'); toast('Could not connect to shared data'); }
}
async function pushCloud(){
  if(!familyCode()) return;
  try{
    const res=await fetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json','X-Household-Code':familyCode()},body:JSON.stringify({state})});
    if(!res.ok) throw new Error(await res.text());
    cloudConnected=true; setSync(true,'Shared');
  }catch{ cloudConnected=false; setSync(false,'Local'); }
}
function setSync(online,label){ const b=document.querySelector('#syncBtn'); b.classList.toggle('online',online); document.querySelector('#syncLabel').textContent=label; }
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function render(){
  document.querySelector('#profileBtn').textContent=state.profile;
  document.querySelector('#todayEvents').innerHTML = state.events.filter(e=>e.day==='Friday').map(eventHTML).join('') || '<div class="empty">Nothing added yet.</div>';
  document.querySelector('#taskList').innerHTML = state.tasks.map(t=>`<article class="task ${t.done?'done':''}"><input class="check" type="checkbox" ${t.done?'checked':''} data-task-check="${t.id}"><div><div class="task-title">${esc(t.title)}</div><div class="task-meta">${esc(t.due||'No deadline')}</div></div><button class="owner-pill" data-cycle-owner="${t.id}">${esc(t.owner)}</button></article>`).join('') || '<div class="empty">Inbox zero. Nice.</div>';
  const owners=['GraceAnn','Andrew']; document.querySelector('#adultSummary').innerHTML=owners.map(o=>{const active=state.tasks.filter(t=>!t.done&&t.owner===o).length+state.domains.filter(d=>d.owner===o).length;return `<div class="adult-chip"><span>${o}</span><strong>${active}</strong><small>active ownership items</small></div>`}).join('');
  document.querySelector('#weekGrid').innerHTML=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((d,i)=>{const ev=state.events.filter(e=>e.day===d);return `<article class="day"><h3>${d.slice(0,3)}</h3><small>${ev[0]?.date||''}</small><div class="day-events">${ev.map(e=>`<div class="mini-event"><span class="person-dot person-${e.person}"></span><strong>${esc(e.time)}</strong><br>${esc(e.title)}</div>`).join('')||'<span class="task-meta">Open</span>'}</div></article>`}).join('');
  document.querySelector('#domainGrid').innerHTML=state.domains.map(d=>`<article class="domain"><p class="eyebrow">Responsibility</p><h3>${esc(d.name)}</h3><p>${esc(d.note)}</p><button class="owner-pill" data-cycle-domain="${d.id}">${esc(d.owner)}</button></article>`).join('');
  document.querySelector('#mealGrid').innerHTML=state.meals.map(m=>`<article class="meal"><h3>${m.day}</h3><div class="meal-main">${esc(m.meal)}</div><small>${esc(m.note)}</small></article>`).join('');
  document.querySelector('#calendarSources').innerHTML=state.calendarSources.map(c=>`<div class="calendar-source"><strong>${esc(c.name)}</strong><span>${esc(c.type)}</span></div>`).join('');
  document.querySelector('#familyCode').value=familyCode();
}
function eventHTML(e){return `<div class="event"><span class="event-time">${esc(e.time)}</span><div><span class="person-dot person-${e.person}"></span><strong>${esc(e.title)}</strong></div><span class="owner-pill">${esc(e.person)}</span></div>`}
function cycleOwner(current){return current==='GraceAnn'?'Andrew':current==='Andrew'?'Shared':'GraceAnn'}

document.addEventListener('click',e=>{
  const tab=e.target.closest('.tab'); if(tab){document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));tab.classList.add('active');document.querySelectorAll('.view').forEach(x=>x.classList.remove('active-view'));document.querySelector('#'+tab.dataset.view).classList.add('active-view');return;}
  const action=e.target.closest('[data-action]')?.dataset.action; if(action) openModal(action);
  if(e.target.matches('[data-cycle-owner]')){const t=state.tasks.find(x=>x.id===e.target.dataset.cycleOwner);t.owner=cycleOwner(t.owner);saveLocal();}
  if(e.target.matches('[data-cycle-domain]')){const d=state.domains.find(x=>x.id===e.target.dataset.cycleDomain);d.owner=cycleOwner(d.owner);saveLocal();}
});
document.addEventListener('change',e=>{if(e.target.matches('[data-task-check]')){const t=state.tasks.find(x=>x.id===e.target.dataset.taskCheck);t.done=e.target.checked;saveLocal();}});
document.querySelector('#profileBtn').addEventListener('click',()=>{state.profile=state.profile==='GraceAnn'?'Andrew':'GraceAnn';saveLocal();});
document.querySelector('#syncBtn').addEventListener('click',pullCloud);
document.querySelector('#saveCode').addEventListener('click',()=>{localStorage.setItem(CODE_KEY,document.querySelector('#familyCode').value.trim());pullCloud();});
document.querySelector('#resetLocal').addEventListener('click',()=>{localStorage.removeItem(LS_KEY);state=structuredClone(defaultState);render();toast('Local copy reset');});

const modal=document.querySelector('#modal'), modalBody=document.querySelector('#modalBody'), modalTitle=document.querySelector('#modalTitle');
function field(label,name,type='text',value=''){return `<div class="modal-field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${esc(value)}" required></div>`}
function select(label,name,options){return `<div class="modal-field"><label>${label}</label><select name="${name}">${options.map(o=>`<option>${o}</option>`).join('')}</select></div>`}
let modalAction='';
function openModal(action){
  modalAction=action;
  if(action==='add-task'){modalTitle.textContent='Add family task';modalBody.innerHTML=field('What needs to happen?','title')+field('When?','due')+select('Owner','owner',['GraceAnn','Andrew','Shared']);}
  if(action==='add-event'){modalTitle.textContent='Add calendar item';modalBody.innerHTML=field('Event','title')+select('Day','day',['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'])+field('Date label','date')+field('Time','time')+select('Person','person',['Family','GraceAnn','Andrew','Emerson','Tennyson','Alouette']);}
  if(action==='add-domain'){modalTitle.textContent='Add responsibility';modalBody.innerHTML=field('Responsibility','name')+field('What ownership includes','note')+select('Owner','owner',['GraceAnn','Andrew','Shared']);}
  if(action==='edit-meals'){modalTitle.textContent='Edit meal plan';modalBody.innerHTML=state.meals.map((m,i)=>field(m.day,`meal${i}`,'text',m.meal)).join('');}
  modal.showModal();
}
document.querySelector('#modalForm').addEventListener('submit',e=>{
  if(e.submitter?.value==='cancel') return;
  e.preventDefault(); const fd=new FormData(e.currentTarget);
  if(modalAction==='add-task')state.tasks.unshift({id:crypto.randomUUID(),title:fd.get('title'),due:fd.get('due'),owner:fd.get('owner'),done:false});
  if(modalAction==='add-event')state.events.push({id:crypto.randomUUID(),title:fd.get('title'),day:fd.get('day'),date:fd.get('date'),time:fd.get('time'),person:fd.get('person')});
  if(modalAction==='add-domain')state.domains.push({id:crypto.randomUUID(),name:fd.get('name'),note:fd.get('note'),owner:fd.get('owner')});
  if(modalAction==='edit-meals')state.meals=state.meals.map((m,i)=>({...m,meal:fd.get(`meal${i}`)}));
  modal.close(); saveLocal();
});
function toast(msg){const el=document.createElement('div');el.className='toast';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),2400)}
render(); if(familyCode()) pullCloud();

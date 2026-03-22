// ── STATE ─────────────────────────────────────────────────────────
let tasks=[], idN=0, editId=null, dragId=null;
let curView='all', curTag='', curLayout='board', sortMode='none';
let fPri=[], fDue=[], modalSubs=[], toastTimer;

const TODAY = new Date().toISOString().slice(0,10);
const YESTERDAY = new Date(Date.now()-86400000).toISOString().slice(0,10);
const TOMORROW  = new Date(Date.now()+86400000).toISOString().slice(0,10);
const NEXTWEEK  = new Date(Date.now()+5*86400000).toISOString().slice(0,10);

// ── SEED ─────────────────────────────────────────────────────────
[
  
].forEach(s=>tasks.push({id:++idN,activity:['Created'],starred:false,...s}));

// ── VIEW METADATA ─────────────────────────────────────────────────
const VM={all:{t:'All Tasks',s:'Manage and track all your work'},today:{t:'Due Today',s:'Tasks that need attention right now'},overdue:{t:'Overdue',s:'Tasks past their deadline'},completed:{t:'Completed',s:'Tasks you have finished'},starred:{t:'Starred',s:'Your important tasks'}};

function setView(v,el){
  curView=v;
  document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active')); el.classList.add('active');
  document.getElementById('view-title').textContent=VM[v].t;
  document.getElementById('view-sub').textContent=VM[v].s;
  render();
}
function setTag(tag,el){
  curTag=tag;
  document.querySelectorAll('.tag-nav').forEach(e=>e.classList.remove('active')); el.classList.add('active');
  render();
}
function setLayout(l,el){
  curLayout=l;
  document.querySelectorAll('.vt-btn').forEach(e=>e.classList.remove('active')); el.classList.add('active');
  render();
}
const SORTS=['none','priority','due','alpha'];
const SLBL={none:'Sort',priority:'Priority',due:'Due Date',alpha:'A–Z'};
const SICO={none:'↕',priority:'🔴',due:'📅',alpha:'A'};
function cycleSort(){
  sortMode=SORTS[(SORTS.indexOf(sortMode)+1)%SORTS.length];
  document.getElementById('sort-lbl').textContent=SLBL[sortMode];
  document.getElementById('sort-icon').textContent=SICO[sortMode];
  render();
}
function toggleFP(){document.getElementById('filter-panel').classList.toggle('open');document.getElementById('fp-toggle').classList.toggle('active');}
function toggleFP2(el){const v=el.dataset.fp;el.classList.toggle('sel');fPri=fPri.includes(v)?fPri.filter(x=>x!==v):[...fPri,v];render();}
function toggleFD(el){const v=el.dataset.fd;el.classList.toggle('sel');fDue=fDue.includes(v)?fDue.filter(x=>x!==v):[...fDue,v];render();}
function resetFilters(){fPri=[];fDue=[];document.querySelectorAll('.fp-chip').forEach(e=>e.classList.remove('sel'));render();}

// ── FILTER + SORT ─────────────────────────────────────────────────
function applyFilters(list){
  const q=(document.getElementById('search-input').value||'').trim().toLowerCase();
  const todayStr=TODAY, weekLater=NEXTWEEK;
  return list.filter(t=>{
    if(curTag&&t.tag!==curTag)return false;
    if(curView==='today'&&t.due!==todayStr)return false;
    if(curView==='overdue'&&(!t.due||t.due>=todayStr||t.col==='done'))return false;
    if(curView==='completed'&&t.col!=='done')return false;
    if(curView==='starred'&&!t.starred)return false;
    if(q&&!t.title.toLowerCase().includes(q)&&!(t.desc||'').toLowerCase().includes(q))return false;
    if(fPri.length&&!fPri.includes(t.priority))return false;
    if(fDue.length){const m=fDue.some(fd=>fd==='today'?t.due===todayStr:fd==='week'?t.due&&t.due<=weekLater&&t.due>=todayStr:t.due&&t.due<todayStr&&t.col!=='done');if(!m)return false;}
    return true;
  });
}
function applySortFn(list){
  const o={high:0,med:1,low:2};
  if(sortMode==='priority')return[...list].sort((a,b)=>o[a.priority]-o[b.priority]);
  if(sortMode==='due')return[...list].sort((a,b)=>(a.due||'9999')>(b.due||'9999')?1:-1);
  if(sortMode==='alpha')return[...list].sort((a,b)=>a.title.localeCompare(b.title));
  return list;
}

// ── RENDER ────────────────────────────────────────────────────────
function render(){updateCounts();updateOV();curLayout==='board'?renderBoard():renderList();}

function updateCounts(){
  document.getElementById('cnt-all').textContent=tasks.length;
  document.getElementById('cnt-today').textContent=tasks.filter(t=>t.due===TODAY).length;
  document.getElementById('cnt-over').textContent=tasks.filter(t=>t.due&&t.due<TODAY&&t.col!=='done').length;
  document.getElementById('cnt-done').textContent=tasks.filter(t=>t.col==='done').length;
  document.getElementById('cnt-star').textContent=tasks.filter(t=>t.starred).length;
  const done=tasks.filter(t=>t.col==='done').length;
  document.getElementById('sb-done').textContent=done;
  document.getElementById('sb-total').textContent=tasks.length;
  document.getElementById('sb-rate').textContent=(tasks.length?Math.round(done/tasks.length*100):0)+'%';
  document.getElementById('sb-streak').textContent=done?'🔥'+Math.min(done,7):'0';
}
function updateOV(){
  const t=tasks.length||1;
  const nT=tasks.filter(x=>x.col==='todo').length, nP=tasks.filter(x=>x.col==='progress').length, nD=tasks.filter(x=>x.col==='done').length, nO=tasks.filter(x=>x.due&&x.due<TODAY&&x.col!=='done').length;
  document.getElementById('ov-todo').textContent=nT; document.getElementById('ovf-todo').style.width=(nT/t*100)+'%';
  document.getElementById('ov-prog').textContent=nP; document.getElementById('ovf-prog').style.width=(nP/t*100)+'%';
  document.getElementById('ov-done').textContent=nD; document.getElementById('ovf-done').style.width=(nD/t*100)+'%';
  document.getElementById('ov-over').textContent=nO; document.getElementById('ovf-over').style.width=(nO/t*100)+'%';
}

function renderBoard(){
  const area=document.getElementById('board-area');
  area.innerHTML=`<div class="board">${['todo','progress','done'].map(col=>{
    const all=applyFilters(tasks.filter(t=>t.col===col));
    const sorted=applySortFn(all);
    const cName={todo:'To Do',progress:'In Progress',done:'Done'}[col];
    const cCls={todo:'col-todo',progress:'col-prog',done:'col-done'}[col];
    const pct=tasks.length?(tasks.filter(t=>t.col===col).length/tasks.length*100):0;
    return `<div class="column ${cCls}" data-col="${col}" ondrop="drop(event)" ondragover="allowDrop(event)" ondragleave="dragLeave(event)">
      <div class="col-head">
        <div class="col-title-wrap"><div class="col-dot"></div><span class="col-title">${cName}</span><div class="col-badge">${sorted.length}</div></div>
        <button class="col-plus" onclick="openModal('${col}')">+</button>
      </div>
      <div class="col-pb"><div class="col-pf" style="width:${pct}%"></div></div>
      <div class="tasks-list" id="list-${col}">
        ${sorted.length?sorted.map(t=>cardHTML(t)).join(''):`<div class="empty-col"><span class="ei">${col==='todo'?'📋':col==='progress'?'⚙️':'✅'}</span><span>Nothing here</span></div>`}
      </div>
    </div>`;
  }).join('')}</div>`;
  bindDrag();
}

function renderList(){
  const filtered=applyFilters(tasks), sorted=applySortFn(filtered), area=document.getElementById('board-area');
  if(!sorted.length){area.innerHTML=`<div class="empty-col" style="padding:60px 0;display:flex;flex-direction:column;align-items:center;gap:8px"><span class="ei">🔍</span><span>No tasks found</span></div>`;return;}
  area.innerHTML=`<div class="list-view">${sorted.map(t=>listHTML(t)).join('')}</div>`;
  bindDrag();
}

function cardHTML(t){
  const ov=isOv(t), soon=isSoon(t);
  const dc=ov?'due-over':soon?'due-soon':'due-norm';
  const sc=t.subtasks.length, sd=t.subtasks.filter(s=>s.d).length;
  return `<div class="task-card t-${t.tag}${t.col==='done'?' completed-card':''}" id="tc-${t.id}" draggable="true" data-id="${t.id}">
    <div class="task-top">
      <div class="ck${t.col==='done'?' checked':''}" onclick="toggleDone(${t.id},event)">${t.col==='done'?'✓':''}</div>
      <div class="task-title" onclick="openDP(${t.id})">${esc(t.title)}</div>
      <div class="task-actions">
        <button class="ta-btn" onclick="toggleStar(${t.id},event)" title="Star">${t.starred?'⭐':'☆'}</button>
        <button class="ta-btn" onclick="dupTask(${t.id},event)" title="Duplicate">⧉</button>
        <button class="ta-btn" onclick="editTask(${t.id},event)" title="Edit">✏️</button>
        <button class="ta-btn del" onclick="askDel(${t.id},event)" title="Delete">🗑</button>
      </div>
    </div>
    ${t.desc?`<div class="task-desc">${esc(t.desc)}</div>`:''}
    <div class="task-meta">
      <span class="tag-chip ${t.tag}">${t.tag}</span>
      <span class="tag-chip ${t.priority}">${t.priority}</span>
      ${t.due?`<span class="due-badge ${dc}">${ov?'🔥':'📅'} ${fmtD(t.due)}</span>`:''}
    </div>
    ${sc?`<div class="sub-progress"><div class="sub-bar"><div class="sub-fill" style="width:${Math.round(sd/sc*100)}%"></div></div><div class="sub-cnt">${sd}/${sc} subtasks</div></div>`:''}
  </div>`;
}

function listHTML(t){
  const ov=isOv(t);
  return `<div class="list-item${t.col==='done'?' completed-card':''}" id="li-${t.id}">
    <div class="li-ck${t.col==='done'?' checked':''}" onclick="toggleDone(${t.id},event)">${t.col==='done'?'✓':''}</div>
    <div class="li-title" onclick="openDP(${t.id})">${esc(t.title)}</div>
    <span class="tag-chip ${t.tag}">${t.tag}</span>
    <span class="li-col">${t.col==='todo'?'To Do':t.col==='progress'?'In Progress':'Done'}</span>
    ${t.due?`<span class="li-due" style="${ov?'color:var(--accent2)':''}">${ov?'🔥 ':''} ${fmtD(t.due)}</span>`:''}
    ${t.starred?`<span>⭐</span>`:''}
    <div class="li-actions">
      <button class="ta-btn" onclick="editTask(${t.id},event)">✏️</button>
      <button class="ta-btn del" onclick="askDel(${t.id},event)">🗑</button>
    </div>
  </div>`;
}

function bindDrag(){
  document.querySelectorAll('.task-card').forEach(c=>{
    c.addEventListener('dragstart',function(e){dragId=parseInt(this.dataset.id);this.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragId);});
    c.addEventListener('dragend',function(){this.classList.remove('dragging');document.querySelectorAll('.column').forEach(c=>c.classList.remove('drag-over'));dragId=null;});
  });
}

// ── DRAG/DROP ─────────────────────────────────────────────────────
function allowDrop(e){e.preventDefault();e.currentTarget.classList.add('drag-over');}
function dragLeave(e){if(!e.currentTarget.contains(e.relatedTarget))e.currentTarget.classList.remove('drag-over');}
function drop(e){
  e.preventDefault();const col=e.currentTarget;col.classList.remove('drag-over');
  const id=parseInt(e.dataTransfer.getData('text/plain')),nc=col.dataset.col;
  const t=tasks.find(x=>x.id===id);
  if(t&&t.col!==nc){t.col=nc;t.activity.push('Moved to '+(nc==='todo'?'To Do':nc==='progress'?'In Progress':'Done'));render();showToast(nc==='done'?'🎉 Completed!':'📦 Moved to '+(nc==='todo'?'To Do':nc==='progress'?'In Progress':'Done'));}
}

// ── ACTIONS ───────────────────────────────────────────────────────
function toggleDone(id,e){
  if(e)e.stopPropagation();
  const t=tasks.find(x=>x.id===id);
  t.col=t.col==='done'?'todo':'done';
  t.activity.push(t.col==='done'?'Completed ✅':'Reopened');
  render();showToast(t.col==='done'?'✅ Done!':'↩️ Reopened');
}
function toggleStar(id,e){
  e.stopPropagation();
  const t=tasks.find(x=>x.id===id);t.starred=!t.starred;
  render();showToast(t.starred?'⭐ Starred':'Unstarred');
}
function dupTask(id,e){
  e.stopPropagation();
  const t=tasks.find(x=>x.id===id);
  tasks.push({...JSON.parse(JSON.stringify(t)),id:++idN,title:'Copy of '+t.title,starred:false,activity:['Created (duplicate)']});
  render();showToast('⧉ Task duplicated');
}
function editTask(id,e){
  if(e)e.stopPropagation();
  const t=tasks.find(x=>x.id===id);editId=id;
  document.getElementById('m-title').textContent='Edit Task';
  document.getElementById('m-ttl').value=t.title;
  document.getElementById('m-dsc').value=t.desc||'';
  document.getElementById('m-col').value=t.col;
  document.getElementById('m-pri').value=t.priority;
  document.getElementById('m-tag').value=t.tag;
  document.getElementById('m-due').value=t.due||'';
  modalSubs=JSON.parse(JSON.stringify(t.subtasks||[]));
  renderSubList();
  document.getElementById('overlay').classList.add('open');
  setTimeout(()=>document.getElementById('m-ttl').focus(),200);
}
function askDel(id,e){
  if(e)e.stopPropagation();
  document.getElementById('conf-overlay').classList.add('open');
  document.getElementById('conf-yes').onclick=()=>{tasks=tasks.filter(t=>t.id!==id);closeConf();render();showToast('🗑 Deleted');};
}
function closeConf(){document.getElementById('conf-overlay').classList.remove('open');}

// ── DETAIL PANEL ──────────────────────────────────────────────────
function openDP(id){
  const t=tasks.find(x=>x.id===id),ov=isOv(t);
  const sc=t.subtasks.length,sd=t.subtasks.filter(s=>s.d).length;
  document.getElementById('dp-panel').innerHTML=`
    <div class="dp-hd"><div class="dp-title">${esc(t.title)}</div><button class="dp-close" onclick="closeDP()">✕</button></div>
    ${t.desc?`<div><div class="dp-sec">Description</div><div class="dp-desc">${esc(t.desc)}</div></div>`:''}
    <div>
      <div class="dp-sec">Details</div>
      <div class="dp-chips">
        <span class="tag-chip ${t.tag}">${t.tag}</span>
        <span class="tag-chip ${t.priority}">${t.priority} priority</span>
        <span class="tag-chip ${t.col==='done'?'dev':'design'}">${t.col==='todo'?'📋 To Do':t.col==='progress'?'⚙️ In Progress':'✅ Done'}</span>
        ${t.due?`<span class="tag-chip ${ov?'bug':'research'}">${ov?'🔥 Overdue':'📅'} ${fmtD(t.due)}</span>`:''}
        ${t.starred?`<span class="tag-chip content">⭐ Starred</span>`:''}
      </div>
    </div>
    ${sc?`<div><div class="dp-sec">Subtasks — ${sd}/${sc} done</div>
      <div style="height:4px;background:var(--border);border-radius:99px;margin-bottom:10px;overflow:hidden"><div style="height:100%;width:${Math.round(sd/sc*100)}%;background:var(--accent);border-radius:99px;transition:width .4s"></div></div>
      <div class="dp-subs">${t.subtasks.map((s,i)=>`<div class="dp-sub"><div class="dp-sc${s.d?' checked':''}" onclick="toggleSubDP(${t.id},${i})">${s.d?'✓':''}</div><span style="${s.d?'text-decoration:line-through;color:var(--muted)':''}">${esc(s.t)}</span></div>`).join('')}</div></div>`:''}
    <div><div class="dp-sec">Activity</div><div class="dp-act">${(t.activity||[]).map(a=>`<div class="dp-ai"><div class="dp-ad"></div>${esc(a)}</div>`).join('')}</div></div>
    <div class="dp-btns"><button class="btn-cancel" style="flex:1" onclick="editTask(${t.id})">✏️ Edit</button><button class="btn-save" style="flex:1;justify-content:center;display:flex" onclick="closeDP();openModal('${t.col}')">+ New</button></div>
  `;
  document.getElementById('dp-overlay').classList.add('open');
}
function closeDP(){document.getElementById('dp-overlay').classList.remove('open');}
function toggleSubDP(tid,si){const t=tasks.find(x=>x.id===tid);t.subtasks[si].d=!t.subtasks[si].d;t.activity.push('Updated subtask');render();openDP(tid);}

// ── MODAL ─────────────────────────────────────────────────────────
function openModal(col){
  editId=null;modalSubs=[];
  document.getElementById('m-title').textContent='New Task';
  document.getElementById('m-ttl').value='';
  document.getElementById('m-dsc').value='';
  document.getElementById('m-col').value=col||'todo';
  document.getElementById('m-pri').value='med';
  document.getElementById('m-tag').value='design';
  document.getElementById('m-due').value='';
  renderSubList();
  document.getElementById('overlay').classList.add('open');
  setTimeout(()=>document.getElementById('m-ttl').focus(),200);
}
function closeModal(){document.getElementById('overlay').classList.remove('open');editId=null;}
function ovClick(e){if(e.target===document.getElementById('overlay'))closeModal();}
function addSub(){
  const v=document.getElementById('sub-inp').value.trim();
  if(!v)return;
  modalSubs.push({t:v,d:false});
  document.getElementById('sub-inp').value='';
  renderSubList();
  document.getElementById('sub-inp').focus();
}
function renderSubList(){
  document.getElementById('sub-list').innerHTML=modalSubs.map((s,i)=>`<div class="sub-item">
    <div class="s-ck${s.d?' checked':''}" onclick="toggleMS(${i})">${s.d?'✓':''}</div>
    <span class="s-txt${s.d?' done':''}">${esc(s.t)}</span>
    <button class="s-del" onclick="removeMS(${i})">✕</button>
  </div>`).join('');
}
function toggleMS(i){modalSubs[i].d=!modalSubs[i].d;renderSubList();}
function removeMS(i){modalSubs.splice(i,1);renderSubList();}
function submitTask(){
  const title=document.getElementById('m-ttl').value.trim();
  if(!title){const el=document.getElementById('m-ttl');el.classList.add('shake');el.style.borderColor='var(--accent2)';setTimeout(()=>{el.classList.remove('shake');el.style.borderColor='';},500);return;}
  const data={title,desc:document.getElementById('m-dsc').value.trim(),col:document.getElementById('m-col').value,priority:document.getElementById('m-pri').value,tag:document.getElementById('m-tag').value,due:document.getElementById('m-due').value||null,subtasks:modalSubs};
  if(editId){const t=tasks.find(x=>x.id===editId);Object.assign(t,data);t.activity.push('Edited');showToast('✏️ Updated');}
  else{tasks.push({id:++idN,starred:false,activity:['Created'],...data});showToast('✨ Added');}
  closeModal();render();
}

// ── HELPERS ───────────────────────────────────────────────────────
function isOv(t){return t.due&&t.col!=='done'&&t.due<TODAY;}
function isSoon(t){if(!t.due||t.col==='done')return false;const d=new Date(t.due+'T00:00:00'),n=new Date();n.setHours(0,0,0,0);const df=(d-n)/86400000;return df>=0&&df<=2;}
function fmtD(s){if(!s)return'';const d=new Date(s+'T00:00:00'),n=new Date();n.setHours(0,0,0,0);const df=Math.round((d-n)/86400000);if(df===0)return'Today';if(df===1)return'Tomorrow';if(df===-1)return'Yesterday';if(df<0)return Math.abs(df)+'d ago';if(df<=7)return'In '+df+'d';return d.toLocaleDateString('en',{month:'short',day:'numeric'});}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2400);}

// ── KEYBOARD ──────────────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  const inI=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);
  if(e.key==='Escape'){closeModal();closeDP();closeConf();}
  if(e.key==='Enter'&&document.getElementById('overlay').classList.contains('open')&&!inI)submitTask();
  if(e.key==='Enter'&&document.activeElement===document.getElementById('sub-inp')){e.preventDefault();addSub();}
  if(!inI){
    if(e.key==='n'||e.key==='N'){e.preventDefault();openModal();}
    if(e.key==='/'||e.key==='.'){e.preventDefault();document.getElementById('search-input').focus();}
    if(e.key==='b'||e.key==='B')setLayout('board',document.getElementById('vt-board'));
    if(e.key==='l'||e.key==='L')setLayout('list',document.getElementById('vt-list'));
    if(e.key==='s'||e.key==='S')cycleSort();
  }
});

render();
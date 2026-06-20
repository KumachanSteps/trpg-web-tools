(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'trpgWebTools.sessionCheckCalendar.sessions';
  const REPORT_KEY = 'trpgWebTools.sessionReportGenerator.pendingImport';
  const LOG_KEY = 'trpgWebTools.sessionLogTracker.pendingImport';
  const pad = n => String(n).padStart(2, '0');
  const today = new Date();
  let sessions = loadSessions();
  let selectedId = sessions[0]?.id || '';
  let cursor = selectedId ? new Date(new Date(sessions[0].start).getFullYear(), new Date(sessions[0].start).getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1);
  let editingId = '';

  function seedSessions() {
    return [{ id: crypto.randomUUID(), scenario: '無貌の街 第3回', system: 'クトゥルフ神話TRPG（6版）', start: '2026-07-02T20:00', end: '23:00', gm: '星見 月夜', format: 'オンライン（ココフォリア＋Discord）', status: 'scheduled', memo: 'ココフォリア部屋とNPC立ち絵を前日までに確認。', hashtags: ['TRPG','クトゥルフ神話TRPG'], players: [{pl:'夜桜 澪',pc:'探索者：浅杜 睦雨'},{pl:'白銀 狼',pc:'探索者：神代 累'},{pl:'蒼井 翼',pc:'探索者：九条 衛'},{pl:'花房 鈴音',pc:'探索者：遠山 霧'}], links: [{label:'ココフォリア',url:''},{label:'Discordサーバー',url:''},{label:'キャラシ（Googleドライブ）',url:''}], tasks: [{title:'ココフォリア部屋作成',due:'2026-07-01',status:'期限切れ',done:true},{title:'NPC立ち絵準備',due:'2026-07-02',status:'今日',done:false},{title:'BGM設定',due:'2026-07-05',status:'3日以内',done:false},{title:'PLに事前案内送付',due:'2026-06-30',status:'完了',done:true}] }, { id: crypto.randomUUID(), scenario:'星屑の魔導師', system:'エモクロアTRPG', start:'2026-07-04T13:00', end:'17:00', gm:'くま', format:'オンライン', status:'tentative', memo:'', hashtags:['TRPG','エモクロアTRPG'], players:[], links:[], tasks:[{title:'概要共有',due:'2026-07-01',status:'期限切れ',done:false}] }];
  }
  function loadSessions(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || seedSessions(); } catch { return seedSessions(); } }
  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); }
  function dateKey(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  function sessionDate(s){ return (s.start || '').slice(0,10); }
  function fmtDate(iso){ const d = new Date(iso); return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`; }
  function fmtDateTime(s){ const d = new Date(s.start); return `${fmtDate(s.start)} ${pad(d.getHours())}:${pad(d.getMinutes())}${s.end ? '–' + s.end : ''}`; }
  function esc(v){ return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
  function render(){ renderCalendar(); renderToday(); renderTasks(); renderDetail(); save(); }
  function renderCalendar(){
    $('monthTitle').textContent = `${cursor.getFullYear()}年 ${cursor.getMonth()+1}月`;
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    $('calendarGrid').innerHTML = Array.from({length:42}, (_,i) => {
      const d = new Date(start); d.setDate(start.getDate()+i); const key = dateKey(d);
      const evs = sessions.filter(s => sessionDate(s) === key);
      return `<div class="day ${d.getMonth()!==cursor.getMonth()?'other':''} ${key===dateKey(today)?'today':''}" data-date="${key}"><div class="day-num">${d.getDate()}</div>${evs.map(s => `<button class="event ${esc(s.format).includes('オンライン')?'voice':''}" data-id="${esc(s.id)}"><span class="event-time">● ${(s.start||'').slice(11,16)}${s.end?'–'+esc(s.end):''}</span><span class="event-title">${esc(s.scenario)}</span></button>`).join('')}</div>`;
    }).join('');
    document.querySelectorAll('.event').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); selectedId = b.dataset.id; renderDetail(); }));
    document.querySelectorAll('.day').forEach(d => d.addEventListener('dblclick', () => openDialog('', d.dataset.date)));
  }
  function renderToday(){
    const list = sessions.filter(s => sessionDate(s) === dateKey(today));
    $('todayList').innerHTML = list.length ? list.map(miniSession).join('') : '<p class="mini-card">今日の予定はありません。</p>';
    $('todayList').querySelectorAll('[data-id]').forEach(el => el.addEventListener('click', () => { selectedId = el.dataset.id; renderDetail(); }));
  }
  function miniSession(s){ return `<button class="mini-card" data-id="${esc(s.id)}"><small>${(s.start||'').slice(11,16)}${s.end?'–'+esc(s.end):''}</small><strong>${esc(s.scenario)}</strong><span class="chip">${esc(s.format||'形式未設定')}</span><span class="chip green">${esc(s.system||'システム未設定')}</span></button>`; }
  function renderTasks(){
    const start = new Date(today); start.setDate(today.getDate() - today.getDay()); const end = new Date(start); end.setDate(start.getDate()+6);
    $('weekRange').textContent = `(${start.getMonth()+1}/${start.getDate()}〜${end.getMonth()+1}/${end.getDate()})`;
    const tasks = sessions.flatMap(s => (s.tasks||[]).map(t => ({...t, scenario:s.scenario, sessionId:s.id}))).sort((a,b)=>(a.due||'').localeCompare(b.due||''));
    $('taskList').innerHTML = tasks.slice(0,6).map(t => `<button class="mini-card" data-id="${esc(t.sessionId)}"><strong>${t.done?'☑':'☐'} ${esc(t.title)}</strong><small>${esc(t.scenario)}　${esc(t.due||'期限なし')}</small><span class="chip ${t.status==='完了'?'green':t.status==='期限切れ'?'red':'amber'}">${esc(t.status||'未着手')}</span></button>`).join('') || '<p class="mini-card">準備タスクはありません。</p>';
    $('taskList').querySelectorAll('[data-id]').forEach(el => el.addEventListener('click', () => { selectedId = el.dataset.id; renderDetail(); }));
  }
  function renderDetail(){
    const s = sessions.find(x => x.id === selectedId);
    if (!s) { $('detailContent').className = 'detail-content empty'; $('detailContent').textContent = 'カレンダーからセッションを選択してください。'; return; }
    $('detailContent').className = 'detail-content';
    $('detailContent').innerHTML = `<h3 class="detail-title">${esc(s.scenario)}</h3><div class="detail-row"><span>シナリオ名</span><b>${esc(s.scenario)}</b></div><div class="detail-row"><span>システム</span><b>${esc(s.system)}</b></div><div class="detail-row"><span>日時</span><b>${esc(fmtDateTime(s))}</b></div><div class="detail-row"><span>GM</span><b>${esc(s.gm)}</b></div><div class="detail-row"><span>形式</span><b>${esc(s.format)}</b></div><div class="detail-row"><span>ステータス</span><b><span class="chip green">${s.status==='scheduled'?'予定確定':s.status==='completed'?'完了':'調整中'}</span></b></div><h4>参加者（PL / PC）</h4><div class="people">${(s.players||[]).map(p=>`<div class="person"><b>${esc(p.pl)}</b><span>${esc(p.pc)}</span></div>`).join('') || '<p>未登録</p>'}</div><h4>関連リンク</h4><div class="links">${(s.links||[]).map(l=>`<a class="link-pill" href="${esc(l.url||'#')}" target="_blank" rel="noopener noreferrer">🔗 ${esc(l.label)} <span>↗</span></a>`).join('') || '<p>未登録</p>'}</div><h4>準備タスク</h4><div class="detail-tasks">${(s.tasks||[]).map(t=>`<div class="task-row"><span>${t.done?'☑':'☐'} ${esc(t.title)}</span><span>${esc(t.due||'')} <span class="chip">${esc(t.status||'')}</span></span></div>`).join('') || '<p>未登録</p>'}</div><p>${esc(s.memo||'')}</p><div class="detail-actions"><button id="editBtn" class="primary">💾 編集</button><button id="deleteBtn" class="danger">🗑 削除</button><button id="sendLogBtn" class="bridge-button">↗ 卓ログトラッカーへ送る</button></div>`;
    $('editBtn').onclick = () => openDialog(s.id); $('deleteBtn').onclick = deleteSelected; $('sendLogBtn').onclick = () => sendToLogTracker(s);
  }
  function openDialog(id='', date=''){
    editingId = id; const s = sessions.find(x => x.id === id) || {start:`${date || dateKey(today)}T20:00`, players:[], links:[], tasks:[], hashtags:[]};
    $('dialogTitle').textContent = id ? 'セッション編集' : 'セッション追加'; $('deleteSessionBtn').hidden = !id;
    $('scenarioInput').value = s.scenario || ''; $('systemInput').value = s.system || ''; $('dateInput').value = s.start || ''; $('endTimeInput').value = s.end || ''; $('gmInput').value = s.gm || ''; $('formatInput').value = s.format || ''; $('statusInput').value = s.status || 'scheduled'; $('hashtagsInput').value = (s.hashtags||[]).join(', '); $('playersInput').value = (s.players||[]).map(p=>`${p.pl||''} / ${p.pc||''}`).join('\n'); $('linksInput').value = (s.links||[]).map(l=>`${l.label||''} | ${l.url||''}`).join('\n'); $('tasksInput').value = (s.tasks||[]).map(t=>`${t.title||''} | ${t.due||''} | ${t.status||''}${t.done?' | done':''}`).join('\n'); $('memoInput').value = s.memo || '';
    $('sessionDialog').showModal();
  }
  function parseLines(text, mapper){ return text.split('\n').map(x=>x.trim()).filter(Boolean).map(mapper); }
  $('sessionForm').addEventListener('submit', e => { if (e.submitter?.value === 'cancel') return; e.preventDefault(); const current = sessions.find(x=>x.id===editingId) || {id:crypto.randomUUID()}; Object.assign(current, { scenario:$('scenarioInput').value.trim(), system:$('systemInput').value.trim(), start:$('dateInput').value, end:$('endTimeInput').value, gm:$('gmInput').value.trim(), format:$('formatInput').value.trim(), status:$('statusInput').value, memo:$('memoInput').value.trim(), hashtags:$('hashtagsInput').value.split(',').map(x=>x.trim()).filter(Boolean), players:parseLines($('playersInput').value, line => { const [pl,pc] = line.split('/').map(x=>x.trim()); return {pl, pc}; }), links:parseLines($('linksInput').value, line => { const [label,url] = line.split('|').map(x=>x.trim()); return {label, url}; }), tasks:parseLines($('tasksInput').value, line => { const [title,due,status,done] = line.split('|').map(x=>x.trim()); return {title,due,status,done:done==='done'||status==='完了'}; }) }); if (!editingId) sessions.push(current); selectedId = current.id; $('sessionDialog').close(); toast('保存しました'); render(); });
  function deleteSelected(){ if (!selectedId || !confirm('このセッションを削除しますか？')) return; sessions = sessions.filter(s=>s.id!==selectedId); selectedId = sessions[0]?.id || ''; toast('削除しました'); render(); }
  $('deleteSessionBtn').onclick = deleteSelected;
  function sendToLogTracker(s){ const payload = { source:'session-check-calendar', version:'1.0', createdAt:new Date().toISOString(), items:[{ id:`calendar_import_${Date.now()}`, sourceCalendarId:s.id, scenario:s.scenario, system:s.system, dates:[sessionDate(s)], latestDate:sessionDate(s), sessionCount:1, gm:s.gm, players:s.players||[], format:s.format, status:s.status, memo:s.memo, links:s.links||[], hashtags:s.hashtags||[] }]}; try { if (localStorage.getItem(LOG_KEY) && !confirm('未取り込みの卓ログデータがすでにあります。新しいデータで上書きしますか？')) return; localStorage.setItem(LOG_KEY, JSON.stringify(payload)); toast('卓ログトラッカー用データを作成しました'); if (confirm('卓ログトラッカーを開きますか？')) window.open('../session-log-tool/', '_blank', 'noopener,noreferrer'); } catch { alert('ブラウザの保存領域に書き込めませんでした。JSONをコピーしてください。\n' + JSON.stringify(payload)); } }
  $('reportBridgeBtn').onclick = () => { const s = sessions.find(x=>x.id===selectedId); if (!s) return toast('セッションを選択してください'); const payload = {source:'session-check-calendar',version:'1.0',createdAt:new Date().toISOString(),items:[{id:`report_import_${Date.now()}`,sourceCalendarId:s.id,scenario:s.scenario,system:s.system,dates:[sessionDate(s)],latestDate:sessionDate(s),sessionCount:1,gm:s.gm,players:s.players||[],format:s.format,status:s.status,memo:s.memo,links:s.links||[],hashtags:s.hashtags||[]}]}; try { if (localStorage.getItem(REPORT_KEY) && !confirm('未取り込みの卓報告データがすでにあります。新しいデータで上書きしますか？')) return; localStorage.setItem(REPORT_KEY, JSON.stringify(payload)); toast('卓報告ジェネレーター用データを作成しました'); if (confirm('卓報告ジェネレーターを開きますか？')) window.open('../session-report-generator/', '_blank', 'noopener,noreferrer'); } catch { alert('ブラウザの保存領域に書き込めませんでした。'); } };
  $('addSessionBtn').onclick = () => openDialog(); $('todayBtn').onclick = () => { cursor = new Date(today.getFullYear(), today.getMonth(), 1); render(); }; $('prevMonthBtn').onclick = () => { cursor.setMonth(cursor.getMonth()-1); render(); }; $('nextMonthBtn').onclick = () => { cursor.setMonth(cursor.getMonth()+1); render(); }; $('themeBtn').onclick = () => document.body.classList.toggle('light'); $('helpBtn').onclick = () => alert('月カレンダーで予定を確認し、日付をダブルクリックするとセッションを追加できます。詳細から卓ログトラッカーへ連携できます。'); $('shortcutBtn').onclick = () => alert('Ctrl/⌘ + Shift + N: セッション追加\nEsc: ダイアログを閉じる'); $('closeDetailBtn').onclick = () => { selectedId=''; renderDetail(); }; $('showAllTasksBtn').onclick = () => alert(sessions.flatMap(s=>(s.tasks||[]).map(t=>`${t.done?'☑':'☐'} ${t.title} / ${s.scenario} / ${t.due||'期限なし'}`)).join('\n') || 'タスクはありません。');
  $('exportJsonBtn').onclick = () => download('session-check-calendar.json', JSON.stringify({version:'0.1', exportedAt:new Date().toISOString(), sessions}, null, 2), 'application/json');
  $('exportIcalBtn').onclick = () => download('session-check-calendar.ics', toIcal(), 'text/calendar');
  $('importInput').onchange = async e => { const file = e.target.files[0]; if (!file) return; const data = JSON.parse(await file.text()); sessions = data.sessions || data; selectedId = sessions[0]?.id || ''; toast('JSONを読み込みました'); render(); };
  function toIcal(){ return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//TRPG Web Tools//Session Check Calendar//JA',...sessions.flatMap(s=>['BEGIN:VEVENT',`UID:${s.id}@trpg-web-tools`,`SUMMARY:${s.scenario}`,`DTSTART:${(s.start||'').replaceAll('-','').replace(':','')}00`,`DESCRIPTION:${(s.memo||'').replaceAll('\n','\\n')}`,'END:VEVENT']),'END:VCALENDAR'].join('\r\n'); }
  function download(name, text, type){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click(); URL.revokeObjectURL(a.href); }
  function toast(msg){ const el=$('toast'); el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2200); }
  document.addEventListener('keydown', e => { if ((e.ctrlKey||e.metaKey) && e.shiftKey && e.key.toLowerCase()==='n') openDialog(); });
  render();
})();

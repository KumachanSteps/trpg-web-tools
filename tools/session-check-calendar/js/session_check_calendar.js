(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'trpgWebTools.sessionCheckCalendar.sessions';
  const REPORT_KEY = 'trpgWebTools.sessionReportGenerator.pendingImport';
  const LOG_KEY = 'trpgWebTools.sessionLogTracker.pendingImport';
  const SOURCE_LABELS = {
    manual: '手入力',
    sessionLog: '卓ログトラッカーJSON',
    google: 'Googleカレンダー',
    ical: 'iCal',
  };

  const pad = n => String(n).padStart(2, '0');
  const today = new Date();
  let sessions = loadSessions();
  let selectedId = sessions[0]?.id || '';
  let selectedDate = '';
  let cursor = selectedId
    ? new Date(new Date(sessions[0].start).getFullYear(), new Date(sessions[0].start).getMonth(), 1)
    : new Date(today.getFullYear(), today.getMonth(), 1);
  let editingId = '';
  let pendingImport = [];

  function newId(prefix = 'calendar') {
    if (window.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function seedSessions() {
    return [
      {
        id: newId('session'),
        source: 'manual',
        sourceCalendar: 'TRPG予定',
        scenario: '無貌の街 第3回',
        system: 'クトゥルフ神話TRPG（6版）',
        start: '2026-07-02T20:00',
        end: '23:00',
        gm: '星見 月夜',
        format: 'オンライン（ココフォリア＋Discord）',
        status: 'scheduled',
        memo: 'ココフォリア部屋とNPC立ち絵を前日までに確認。',
        hashtags: ['TRPG', 'クトゥルフ神話TRPG'],
        players: [
          { pl: '夜桜 澪', pc: '探索者：浅杜 睦雨' },
          { pl: '白銀 狼', pc: '探索者：神代 累' },
          { pl: '蒼井 翼', pc: '探索者：九条 衛' },
          { pl: '花房 鈴音', pc: '探索者：遠山 霧' },
        ],
        links: [
          { label: 'ココフォリア', url: '' },
          { label: 'Discordサーバー', url: '' },
          { label: 'キャラシ（Googleドライブ）', url: '' },
        ],
        tasks: [
          { id: newId('task'), title: 'ココフォリア部屋作成', due: '2026-07-01', status: '期限切れ', done: true, order: 10 },
          { id: newId('task'), title: 'NPC立ち絵準備', due: '2026-07-02', status: '今日', done: false, order: 20 },
          { id: newId('task'), title: 'BGM設定', due: '2026-07-05', status: '3日以内', done: false, order: 30 },
          { id: newId('task'), title: 'PLに事前案内送付', due: '2026-06-30', status: '完了', done: true, order: 40 },
        ],
      },
      {
        id: newId('session'),
        source: 'manual',
        sourceCalendar: 'TRPG予定',
        scenario: '星屑の魔導師',
        system: 'エモクロアTRPG',
        start: '2026-07-04T13:00',
        end: '17:00',
        gm: 'くま',
        format: 'オンライン',
        status: 'tentative',
        memo: '',
        hashtags: ['TRPG', 'エモクロアTRPG'],
        players: [],
        links: [],
        tasks: [{ id: newId('task'), title: '概要共有', due: '2026-07-01', status: '期限切れ', done: false, order: 10 }],
      },
    ];
  }

  function normalizeSessions(value) {
    const list = Array.isArray(value) ? value : [];
    return list.map(session => ({
      ...session,
      id: session.id || newId('session'),
      source: session.source || 'manual',
      sourceCalendar: session.sourceCalendar || 'TRPG予定',
      players: Array.isArray(session.players) ? session.players : [],
      links: Array.isArray(session.links) ? session.links : [],
      hashtags: Array.isArray(session.hashtags) ? session.hashtags : splitTags(session.hashtags || ''),
      tasks: normalizeTasks(session.tasks),
    }));
  }

  function normalizeTasks(tasks) {
    return (Array.isArray(tasks) ? tasks : []).map((task, index) => ({
      id: task.id || newId('task'),
      title: task.title || task.name || '',
      due: task.due || task.date || '',
      status: task.status || (task.done ? '完了' : '未着手'),
      done: Boolean(task.done || task.status === '完了'),
      order: Number.isFinite(Number(task.order)) ? Number(task.order) : (index + 1) * 10,
    }));
  }

  function loadSessions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normalizeSessions(JSON.parse(raw)) : seedSessions();
    } catch {
      return seedSessions();
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }

  function dateKey(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function sessionDate(session) {
    return (session.start || '').slice(0, 10);
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso || '';
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }

  function fmtDateTime(session) {
    const d = new Date(session.start);
    if (Number.isNaN(d.getTime())) return '';
    return `${fmtDate(session.start)} ${pad(d.getHours())}:${pad(d.getMinutes())}${session.end ? `–${session.end}` : ''}`;
  }

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function splitTags(value) {
    return String(value || '')
      .split(/[#,、,\s]+/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  function render() {
    renderCalendar();
    renderFocus();
    renderToday();
    renderTasks();
    renderDetail();
    save();
  }

  function renderCalendar() {
    $('monthTitle').textContent = `${cursor.getFullYear()}年 ${cursor.getMonth() + 1}月`;
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());

    $('calendarGrid').innerHTML = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = dateKey(d);
      const evs = sessions.filter(session => sessionDate(session) === key);
      const isSelected = selectedDate === key;
      return `
        <button class="day ${d.getMonth() !== cursor.getMonth() ? 'other' : ''} ${key === dateKey(today) ? 'today' : ''} ${isSelected ? 'selected' : ''}" type="button" data-date="${key}">
          <span class="day-num">${d.getDate()}</span>
          <span class="day-add">＋</span>
          ${evs.map(session => `
            <span class="event ${esc(session.format).includes('オンライン') ? 'voice' : ''}" data-id="${esc(session.id)}">
              <span class="event-time">● ${(session.start || '').slice(11, 16)}${session.end ? `–${esc(session.end)}` : ''}</span>
              <span class="event-title">${esc(session.scenario)}</span>
            </span>
          `).join('')}
        </button>`;
    }).join('');

    document.querySelectorAll('.day').forEach(day => {
      day.addEventListener('click', event => {
        const eventEl = event.target.closest('.event');
        if (eventEl) {
          selectedId = eventEl.dataset.id;
          selectedDate = sessionDate(sessions.find(session => session.id === selectedId) || {});
        } else {
          selectedDate = day.dataset.date;
          const firstSession = sessions.find(session => sessionDate(session) === selectedDate);
          selectedId = firstSession?.id || '';
        }
        render();
      });
      day.addEventListener('dblclick', () => openDialog('', day.dataset.date));
    });
  }

  function renderFocus() {
    const panel = $('focusPanel');
    if (!selectedDate) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    $('focusDateLabel').textContent = fmtDate(`${selectedDate}T00:00`);
  }

  function renderToday() {
    const list = sessions.filter(session => sessionDate(session) === dateKey(today));
    $('todayList').innerHTML = list.length ? list.map(miniSession).join('') : '<p class="mini-card">今日の予定はありません。</p>';
    $('todayList').querySelectorAll('[data-id]').forEach(el => {
      el.addEventListener('click', () => {
        selectedId = el.dataset.id;
        selectedDate = sessionDate(sessions.find(session => session.id === selectedId) || {});
        render();
      });
    });
  }

  function miniSession(session) {
    return `
      <button class="mini-card" data-id="${esc(session.id)}" type="button">
        <small>${(session.start || '').slice(11, 16)}${session.end ? `–${esc(session.end)}` : ''}</small>
        <strong>${esc(session.scenario)}</strong>
        <span class="chip">${esc(session.format || '形式未設定')}</span>
        <span class="chip green">${esc(session.system || 'システム未設定')}</span>
      </button>`;
  }

  function getTaskItems() {
    return sessions
      .flatMap(session => (session.tasks || []).map(task => ({ ...task, scenario: session.scenario, sessionId: session.id })))
      .sort((a, b) => (a.order - b.order) || (a.due || '').localeCompare(b.due || ''));
  }

  function renderTasks() {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    $('weekRange').textContent = `(${start.getMonth() + 1}/${start.getDate()}〜${end.getMonth() + 1}/${end.getDate()})`;

    const tasks = getTaskItems();
    $('taskList').innerHTML = tasks.slice(0, 8).map(task => `
      <article class="task-card ${task.done ? 'done' : ''}" draggable="true" data-session-id="${esc(task.sessionId)}" data-task-id="${esc(task.id)}">
        <label class="task-check" aria-label="${esc(task.title)}を完了にする">
          <input type="checkbox" ${task.done ? 'checked' : ''} />
          <span></span>
        </label>
        <button class="task-main" type="button">
          <strong>${esc(task.title)}</strong>
          <small>${esc(task.scenario)}　${esc(task.due || '期限なし')}</small>
          <span class="chip ${task.status === '完了' ? 'green' : task.status === '期限切れ' ? 'red' : 'amber'}">${esc(task.status || '未着手')}</span>
        </button>
        <span class="drag-grip" aria-hidden="true">⋮⋮</span>
      </article>
    `).join('') || '<p class="mini-card">準備タスクはありません。</p>';

    $('taskList').querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('dragstart', event => {
        card.classList.add('dragging');
        event.dataTransfer.setData('text/plain', JSON.stringify({ sessionId: card.dataset.sessionId, taskId: card.dataset.taskId }));
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      card.addEventListener('dragover', event => event.preventDefault());
      card.addEventListener('drop', event => {
        event.preventDefault();
        const from = JSON.parse(event.dataTransfer.getData('text/plain') || '{}');
        moveTaskBefore(from.sessionId, from.taskId, card.dataset.sessionId, card.dataset.taskId);
      });
      card.querySelector('.task-main').addEventListener('click', () => {
        selectedId = card.dataset.sessionId;
        selectedDate = sessionDate(sessions.find(session => session.id === selectedId) || {});
        render();
      });
      card.querySelector('input').addEventListener('change', event => {
        toggleTask(card.dataset.sessionId, card.dataset.taskId, event.target.checked);
      });
    });
  }

  function moveTaskBefore(fromSessionId, fromTaskId, toSessionId, toTaskId) {
    if (!fromSessionId || !fromTaskId || !toSessionId || !toTaskId || fromTaskId === toTaskId) return;
    const all = getTaskItems();
    const fromIndex = all.findIndex(task => task.sessionId === fromSessionId && task.id === fromTaskId);
    const toIndex = all.findIndex(task => task.sessionId === toSessionId && task.id === toTaskId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = all.splice(fromIndex, 1);
    all.splice(toIndex, 0, moved);
    all.forEach((item, index) => {
      const session = sessions.find(s => s.id === item.sessionId);
      const task = session?.tasks.find(t => t.id === item.id);
      if (task) task.order = (index + 1) * 10;
    });
    toast('タスクを並び替えました');
    render();
  }

  function toggleTask(sessionId, taskId, done) {
    const task = sessions.find(session => session.id === sessionId)?.tasks.find(item => item.id === taskId);
    if (!task) return;
    task.done = done;
    task.status = done ? '完了' : (task.status === '完了' ? '未着手' : task.status);
    toast(done ? 'タスクを完了にしました' : 'タスクを未完了に戻しました');
    render();
  }

  function renderDetail() {
    const session = sessions.find(item => item.id === selectedId);
    if (!session) {
      $('detailContent').className = 'detail-content empty';
      $('detailContent').textContent = selectedDate ? '選択した日付にセッションはありません。上のボタンから追加できます。' : 'カレンダーからセッションを選択してください。';
      return;
    }
    $('detailContent').className = 'detail-content';
    $('detailContent').innerHTML = `
      <h3 class="detail-title">${esc(session.scenario)}</h3>
      <div class="detail-row"><span>シナリオ名</span><b>${esc(session.scenario)}</b></div>
      <div class="detail-row"><span>システム</span><b>${esc(session.system)}</b></div>
      <div class="detail-row"><span>日時</span><b>${esc(fmtDateTime(session))}</b></div>
      <div class="detail-row"><span>GM</span><b>${esc(session.gm)}</b></div>
      <div class="detail-row"><span>形式</span><b>${esc(session.format)}</b></div>
      <div class="detail-row"><span>読込元</span><b>${esc(SOURCE_LABELS[session.source] || session.source || '手入力')} / ${esc(session.sourceCalendar || 'TRPG予定')}</b></div>
      <div class="detail-row"><span>ステータス</span><b><span class="chip green">${session.status === 'scheduled' ? '予定確定' : session.status === 'completed' ? '完了' : '調整中'}</span></b></div>
      <h4>参加者（PL / PC）</h4>
      <div class="people">${(session.players || []).map(player => `<div class="person"><b>${esc(player.pl)}</b><span>${esc(player.pc)}</span></div>`).join('') || '<p>未登録</p>'}</div>
      <h4>関連リンク</h4>
      <div class="links">${(session.links || []).map(link => `<a class="link-pill" href="${esc(link.url || '#')}" target="_blank" rel="noopener noreferrer">🔗 ${esc(link.label)} <span>↗</span></a>`).join('') || '<p>未登録</p>'}</div>
      <h4>準備タスク</h4>
      <div class="detail-tasks">${(session.tasks || []).map(task => `<div class="task-row"><span>${task.done ? '☑' : '☐'} ${esc(task.title)}</span><span>${esc(task.due || '')} <span class="chip">${esc(task.status || '')}</span></span></div>`).join('') || '<p>未登録</p>'}</div>
      <p>${esc(session.memo || '')}</p>
      <div class="detail-actions"><button id="editBtn" class="primary" type="button">💾 編集</button><button id="deleteBtn" class="danger" type="button">🗑 削除</button><button id="sendLogBtn" class="bridge-button" type="button">↗ 卓ログトラッカーへ送る</button></div>`;
    $('editBtn').onclick = () => openDialog(session.id);
    $('deleteBtn').onclick = deleteSelected;
    $('sendLogBtn').onclick = () => sendToLogTracker(session);
  }

  function openDialog(id = '', date = '') {
    editingId = id;
    const session = sessions.find(item => item.id === id) || {
      start: `${date || selectedDate || dateKey(today)}T20:00`,
      players: [],
      links: [],
      tasks: [],
      hashtags: [],
      source: 'manual',
      sourceCalendar: 'TRPG予定',
    };
    $('dialogTitle').textContent = id ? 'セッション編集' : 'セッション追加';
    $('deleteSessionBtn').hidden = !id;
    $('scenarioInput').value = session.scenario || '';
    $('systemInput').value = session.system || '';
    $('dateInput').value = session.start || '';
    $('endTimeInput').value = session.end || '';
    $('gmInput').value = session.gm || '';
    $('formatInput').value = session.format || '';
    $('statusInput').value = session.status || 'scheduled';
    $('hashtagsInput').value = (session.hashtags || []).join(', ');
    $('playersInput').value = (session.players || []).map(player => `${player.pl || ''} / ${player.pc || ''}`).join('\n');
    $('linksInput').value = (session.links || []).map(link => `${link.label || ''} | ${link.url || ''}`).join('\n');
    $('tasksInput').value = (session.tasks || []).map(task => `${task.title || ''} | ${task.due || ''} | ${task.status || ''}${task.done ? ' | done' : ''}`).join('\n');
    $('memoInput').value = session.memo || '';
    $('sessionDialog').showModal();
  }

  function openTaskDialog(date = '') {
    $('taskTitleInput').value = '';
    $('taskDueInput').value = date || selectedDate || dateKey(today);
    $('taskStatusInput').value = '未着手';
    $('taskDoneInput').value = 'false';
    $('taskSessionSelect').innerHTML = sessions.map(session => `<option value="${esc(session.id)}" ${session.id === selectedId ? 'selected' : ''}>${esc(session.scenario)} / ${esc(fmtDateTime(session))}</option>`).join('');
    if (!sessions.length) {
      toast('先に紐付ける卓を追加してください');
      return;
    }
    $('taskDialog').showModal();
  }

  function parseLines(text, mapper) {
    return text.split('\n').map(line => line.trim()).filter(Boolean).map(mapper);
  }

  $('sessionForm').addEventListener('submit', event => {
    if (event.submitter?.value === 'cancel') return;
    event.preventDefault();
    const current = sessions.find(item => item.id === editingId) || { id: newId('session'), source: 'manual', sourceCalendar: 'TRPG予定' };
    Object.assign(current, {
      scenario: $('scenarioInput').value.trim(),
      system: $('systemInput').value.trim(),
      start: $('dateInput').value,
      end: $('endTimeInput').value,
      gm: $('gmInput').value.trim(),
      format: $('formatInput').value.trim(),
      status: $('statusInput').value,
      memo: $('memoInput').value.trim(),
      hashtags: splitTags($('hashtagsInput').value),
      players: parseLines($('playersInput').value, line => {
        const [pl, pc] = line.split('/').map(item => item.trim());
        return { pl, pc };
      }),
      links: parseLines($('linksInput').value, line => {
        const [label, url] = line.split('|').map(item => item.trim());
        return { label, url };
      }),
      tasks: normalizeTasks(parseLines($('tasksInput').value, line => {
        const [title, due, status, done] = line.split('|').map(item => item.trim());
        return { title, due, status, done: done === 'done' || status === '完了' };
      })),
    });
    if (!editingId) sessions.push(current);
    selectedId = current.id;
    selectedDate = sessionDate(current);
    $('sessionDialog').close();
    toast('保存しました');
    render();
  });

  $('taskForm').addEventListener('submit', event => {
    if (event.submitter?.value === 'cancel') return;
    event.preventDefault();
    const session = sessions.find(item => item.id === $('taskSessionSelect').value);
    if (!session) return;
    session.tasks = normalizeTasks(session.tasks);
    session.tasks.push({
      id: newId('task'),
      title: $('taskTitleInput').value.trim(),
      due: $('taskDueInput').value,
      status: $('taskStatusInput').value,
      done: $('taskDoneInput').value === 'true' || $('taskStatusInput').value === '完了',
      order: (getTaskItems().length + 1) * 10,
    });
    selectedId = session.id;
    selectedDate = sessionDate(session);
    $('taskDialog').close();
    toast('タスクを追加しました');
    render();
  });

  function deleteSelected() {
    if (!selectedId || !confirm('このセッションを削除しますか？')) return;
    sessions = sessions.filter(session => session.id !== selectedId);
    selectedId = sessions[0]?.id || '';
    selectedDate = selectedId ? sessionDate(sessions[0]) : '';
    toast('削除しました');
    render();
  }

  function createBridgeItem(session) {
    return {
      id: `calendar_import_${Date.now()}`,
      sourceCalendarId: session.id,
      scenario: session.scenario,
      system: session.system,
      dates: [sessionDate(session)].filter(Boolean),
      latestDate: sessionDate(session),
      sessionCount: 1,
      gm: session.gm,
      players: session.players || [],
      format: session.format,
      status: session.status,
      memo: session.memo,
      links: session.links || [],
      hashtags: session.hashtags || [],
    };
  }

  function sendToLogTracker(session) {
    const payload = { source: 'session-check-calendar', version: '1.0', createdAt: new Date().toISOString(), items: [createBridgeItem(session)] };
    try {
      if (localStorage.getItem(LOG_KEY) && !confirm('未取り込みの卓ログデータがすでにあります。新しいデータで上書きしますか？')) return;
      localStorage.setItem(LOG_KEY, JSON.stringify(payload));
      toast('卓ログトラッカー用データを作成しました');
      if (confirm('卓ログトラッカーを開きますか？')) window.open('../session-log-tool/', '_blank', 'noopener,noreferrer');
    } catch {
      alert(`ブラウザの保存領域に書き込めませんでした。JSONをコピーしてください。\n${JSON.stringify(payload)}`);
    }
  }

  function sendToReportGenerator() {
    const session = sessions.find(item => item.id === selectedId);
    if (!session) return toast('セッションを選択してください');
    const payload = { source: 'session-check-calendar', version: '1.0', createdAt: new Date().toISOString(), items: [createBridgeItem(session)] };
    try {
      if (localStorage.getItem(REPORT_KEY) && !confirm('未取り込みの卓報告データがすでにあります。新しいデータで上書きしますか？')) return;
      localStorage.setItem(REPORT_KEY, JSON.stringify(payload));
      toast('卓報告ジェネレーター用データを作成しました');
      if (confirm('卓報告ジェネレーターを開きますか？')) window.open('../session-report-generator/', '_blank', 'noopener,noreferrer');
    } catch {
      alert('ブラウザの保存領域に書き込めませんでした。');
    }
  }

  function normalizeImportedJson(data) {
    if (Array.isArray(data?.sessions)) return normalizeSessions(data.sessions);
    if (Array.isArray(data)) return normalizeSessions(data);
    if (Array.isArray(data?.items)) return normalizeBridgeItems(data.items, data.source || 'sessionLog');
    if (Array.isArray(data?.logs)) return normalizeSessionLogRows(data.logs);
    if (Array.isArray(data?.records)) return normalizeSessionLogRows(data.records);
    return normalizeSessionLogRows(Object.values(data || {}).filter(item => item && typeof item === 'object'));
  }

  function normalizeBridgeItems(items, source) {
    return items.map(item => ({
      id: newId('session'),
      source: source === 'session-log-tracker' ? 'sessionLog' : source,
      sourceCalendar: '卓ログトラッカー',
      scenario: item.scenario || item.title || '名称未設定',
      system: item.system || '',
      start: `${item.latestDate || item.dates?.[0] || dateKey(today)}T20:00`,
      end: '',
      gm: item.gm || item.keeper || '',
      format: item.format || '',
      status: item.status || 'scheduled',
      memo: item.memo || item.note || '',
      hashtags: Array.isArray(item.hashtags) ? item.hashtags : splitTags(item.tags || ''),
      players: Array.isArray(item.players) ? item.players : [],
      links: Array.isArray(item.links) ? item.links : [],
      tasks: [],
    }));
  }

  function normalizeSessionLogRows(rows) {
    return rows.map(row => ({
      id: newId('session'),
      source: 'sessionLog',
      sourceCalendar: '卓ログトラッカー',
      scenario: row.scenario || row.title || row.scenarioName || '名称未設定',
      system: row.system || '',
      start: `${row.latestDate || row.date || row.dates?.[0] || dateKey(today)}T20:00`,
      end: '',
      gm: row.gm || row.keeper || row.kp || '',
      format: row.format || '',
      status: row.status || 'scheduled',
      memo: row.memo || row.note || row.comment || '',
      hashtags: Array.isArray(row.hashtags) ? row.hashtags : splitTags(row.tags || row.hashtag || ''),
      players: Array.isArray(row.players) ? row.players : [],
      links: Array.isArray(row.links) ? row.links : [],
      tasks: [],
    }));
  }

  function parseIcal(text, source = 'ical') {
    return text.split('BEGIN:VEVENT').slice(1).map(block => {
      const get = key => (block.match(new RegExp(`${key}(?:;[^:]*)?:(.+)`)) || [])[1]?.trim() || '';
      const startRaw = get('DTSTART');
      const endRaw = get('DTEND');
      const startDate = parseIcalDate(startRaw);
      const endDate = parseIcalDate(endRaw);
      const calendar = get('X-WR-CALNAME') || get('CATEGORIES') || 'TRPG予定';
      return {
        id: newId('session'),
        source,
        sourceCalendar: calendar,
        scenario: get('SUMMARY') || '名称未設定',
        system: '',
        start: startDate.datetime,
        end: endDate.time,
        gm: '',
        format: '',
        status: 'scheduled',
        memo: get('DESCRIPTION').replaceAll('\\n', '\n'),
        hashtags: [],
        players: [],
        links: [],
        tasks: [],
      };
    }).filter(item => item.start);
  }

  function parseIcalDate(value) {
    const compact = String(value || '').replace('Z', '');
    const match = compact.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
    if (!match) return { datetime: '', time: '' };
    const [, y, m, d, h = '20', min = '00'] = match;
    return { datetime: `${y}-${m}-${d}T${h}:${min}`, time: `${h}:${min}` };
  }

  function openImportDialog(items, title, lead) {
    pendingImport = items;
    $('importDialogTitle').textContent = title;
    $('importDialogLead').textContent = lead;
    const groups = [...new Set(items.map(item => item.sourceCalendar || 'TRPG予定'))];
    $('importSourceList').innerHTML = groups.map(group => {
      const count = items.filter(item => (item.sourceCalendar || 'TRPG予定') === group).length;
      return `<label class="source-option"><input type="checkbox" value="${esc(group)}" checked /><span><strong>${esc(group)}</strong><small>${count}件の予定を読み込み</small></span></label>`;
    }).join('');
    $('importDialog').showModal();
  }

  $('confirmImportBtn').addEventListener('click', event => {
    event.preventDefault();
    const selectedSources = [...$('importSourceList').querySelectorAll('input:checked')].map(input => input.value);
    const incoming = pendingImport.filter(item => selectedSources.includes(item.sourceCalendar || 'TRPG予定'));
    sessions = normalizeSessions([...sessions, ...incoming]);
    selectedId = incoming[0]?.id || selectedId;
    selectedDate = incoming[0] ? sessionDate(incoming[0]) : selectedDate;
    $('importDialog').close();
    toast(`${incoming.length}件を読み込みました`);
    render();
  });

  $('deleteSessionBtn').onclick = deleteSelected;
  $('reportBridgeBtn').onclick = sendToReportGenerator;
  $('addSessionBtn').onclick = () => openDialog('', selectedDate);
  $('addTaskBtn').onclick = () => openTaskDialog(selectedDate);
  $('focusAddSessionBtn').onclick = () => openDialog('', selectedDate);
  $('focusAddTaskBtn').onclick = () => openTaskDialog(selectedDate);
  $('clearFocusBtn').onclick = () => { selectedDate = ''; render(); };
  $('todayBtn').onclick = () => { cursor = new Date(today.getFullYear(), today.getMonth(), 1); selectedDate = dateKey(today); render(); };
  $('prevMonthBtn').onclick = () => { cursor.setMonth(cursor.getMonth() - 1); render(); };
  $('nextMonthBtn').onclick = () => { cursor.setMonth(cursor.getMonth() + 1); render(); };
  $('themeBtn').onclick = () => document.body.classList.toggle('light');
  $('helpBtn').onclick = () => alert('日付クリックでフォーカス、ダブルクリックでセッション追加。JSON/iCal/Googleカレンダーからは読み込むカレンダーを選択できます。');
  $('shortcutBtn').onclick = () => alert('Ctrl/⌘ + Shift + N: セッション追加\nCtrl/⌘ + Shift + T: タスク追加\nEsc: ダイアログを閉じる');
  $('languageBtn').onclick = () => toast('JP/EN切替は後続アップデートで対応予定です');
  $('closeDetailBtn').onclick = () => { selectedId = ''; renderDetail(); };
  $('showAllTasksBtn').onclick = () => alert(getTaskItems().map(task => `${task.done ? '☑' : '☐'} ${task.title} / ${task.scenario} / ${task.due || '期限なし'}`).join('\n') || 'タスクはありません。');
  $('exportJsonBtn').onclick = () => download('session-check-calendar.json', JSON.stringify({ version: '0.11', exportedAt: new Date().toISOString(), sessions }, null, 2), 'application/json');
  $('exportIcalBtn').onclick = () => download('session-check-calendar.ics', toIcal(), 'text/calendar');
  $('importInput').onchange = async event => {
    const file = event.target.files[0];
    if (!file) return;
    const data = JSON.parse(await file.text());
    openImportDialog(normalizeImportedJson(data), 'JSONから読み込むカレンダーを選択', '卓準備カレンダーJSONと卓ログトラッカー出力JSONに対応しています。');
    event.target.value = '';
  };
  $('icalInput').onchange = async event => {
    const file = event.target.files[0];
    if (!file) return;
    openImportDialog(parseIcal(await file.text(), 'ical'), 'iCalから読み込むカレンダーを選択', 'iCal内のカレンダー名・カテゴリごとに取り込み対象を選択できます。');
    event.target.value = '';
  };
  $('googleImportBtn').onclick = () => {
    const sample = [
      { id: newId('session'), source: 'google', sourceCalendar: 'TRPG予定', scenario: 'Google予定：無貌の街 第4回', system: '', start: `${dateKey(today)}T20:00`, end: '23:00', gm: '', format: 'オンライン', status: 'scheduled', memo: 'Googleカレンダー連携のプレビュー取り込みです。', hashtags: [], players: [], links: [], tasks: [] },
      { id: newId('session'), source: 'google', sourceCalendar: '仕事', scenario: 'Google予定：別カレンダー例', system: '', start: `${dateKey(today)}T10:00`, end: '11:00', gm: '', format: '', status: 'tentative', memo: '', hashtags: [], players: [], links: [], tasks: [] },
    ];
    openImportDialog(sample, 'Googleカレンダーから同期するカレンダーを選択', 'ブラウザのみで動くため、現段階では同期対象選択UIのプレビューです。「TRPG予定」など必要なカレンダーだけを選べます。');
  };

  function toIcal() {
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TRPG Web Tools//Session Check Calendar//JA',
      ...sessions.flatMap(session => [
        'BEGIN:VEVENT',
        `UID:${session.id}@trpg-web-tools`,
        `SUMMARY:${session.scenario}`,
        `DTSTART:${(session.start || '').replaceAll('-', '').replace(':', '')}00`,
        session.end ? `DTEND:${sessionDate(session).replaceAll('-', '')}T${session.end.replace(':', '')}00` : '',
        `CATEGORIES:${session.sourceCalendar || 'TRPG予定'}`,
        `DESCRIPTION:${(session.memo || '').replaceAll('\n', '\\n')}`,
        'END:VEVENT',
      ].filter(Boolean)),
      'END:VCALENDAR',
    ].join('\r\n');
  }

  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2200);
  }

  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'n') openDialog('', selectedDate);
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 't') openTaskDialog(selectedDate);
  });

  render();
})();

(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'trpgWebTools.sessionCheckCalendar.sessions';
  const GOOGLE_SETTINGS_KEY = 'trpgWebTools.sessionCheckCalendar.secretIcalSync';
  const LEGACY_GOOGLE_SETTINGS_KEY = 'trpgWebTools.sessionCheckCalendar.googleSync';
  const GOOGLE_ICAL_PROXY_URL = 'https://trpg-calendar-ical-proxy.oc-character-cloudflare.workers.dev/';
  const PANEL_STATE_KEY = 'trpgWebTools.sessionCheckCalendar.panelState';
  const CALENDAR_SETTINGS_KEY = 'trpgWebTools.sessionCheckCalendar.settings';
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
  let calendarSettings = loadCalendarSettings();
  let sessions = loadSessions();
  let selectedDate = currentCalendarDateKey();
  let selectedId = sessions.find(session => sessionDate(session) === selectedDate)?.id || '';
  let cursor = calendarMonthDate(selectedDate);
  let editingId = '';
  let pendingImport = [];
  let googleSettings = loadGoogleSettings();
  let panelState = loadPanelState();
  let googleSyncTimer = 0;
  let googleSyncing = false;

  function loadCalendarSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(CALENDAR_SETTINGS_KEY) || '{}');
      return { timeZone: isValidTimeZone(stored.timeZone) ? stored.timeZone : 'Asia/Tokyo' };
    } catch {
      return { timeZone: 'Asia/Tokyo' };
    }
  }

  function saveCalendarSettings() {
    localStorage.setItem(CALENDAR_SETTINGS_KEY, JSON.stringify(calendarSettings));
  }

  function isValidTimeZone(timeZone) {
    try {
      new Intl.DateTimeFormat('ja-JP', { timeZone }).format();
      return Boolean(timeZone);
    } catch {
      return false;
    }
  }

  function newId(prefix = 'calendar') {
    if (window.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function loadGoogleSettings() {
    const defaults = { feeds: [], autoSync: true, intervalMinutes: 30, lastSyncAt: '', lastError: '', ignoredEvents: [] };
    try {
      localStorage.removeItem(LEGACY_GOOGLE_SETTINGS_KEY);
      const stored = JSON.parse(localStorage.getItem(GOOGLE_SETTINGS_KEY) || '{}');
      const feeds = Array.isArray(stored.feeds)
        ? stored.feeds.map(normalizeGoogleFeed)
        : stored.secretIcalUrl
          ? [normalizeGoogleFeed({
              id: 'feed_migrated',
              label: 'Google Calendar 1',
              secretIcalUrl: stored.secretIcalUrl,
              feedKey: stored.feedKey,
              lastSyncAt: stored.lastSyncAt,
              lastError: stored.lastError,
            }, 0)]
          : [];
      return { ...defaults, ...stored, feeds, ignoredEvents: Array.isArray(stored.ignoredEvents) ? stored.ignoredEvents : [], secretIcalUrl: undefined, feedKey: undefined };
    } catch {
      return defaults;
    }
  }

  function normalizeGoogleFeed(feed, index) {
    return {
      id: feed?.id || newId('feed'),
      label: String(feed?.label || `Google Calendar ${index + 1}`),
      secretIcalUrl: String(feed?.secretIcalUrl || ''),
      enabled: feed?.enabled !== false,
      feedKey: String(feed?.feedKey || ''),
      lastSyncAt: String(feed?.lastSyncAt || ''),
      lastError: String(feed?.lastError || ''),
    };
  }

  function saveGoogleSettings() {
    localStorage.setItem(GOOGLE_SETTINGS_KEY, JSON.stringify(googleSettings));
  }

  function loadPanelState() {
    try {
      return { calendar: false, right: false, dataTools: false, ...JSON.parse(localStorage.getItem(PANEL_STATE_KEY) || '{}') };
    } catch {
      return { calendar: false, right: false, dataTools: false };
    }
  }

  function savePanelState() {
    localStorage.setItem(PANEL_STATE_KEY, JSON.stringify(panelState));
  }

  function applyPanelState() {
    const layout = $('calendarLayout');
    const calendarCollapsed = Boolean(panelState.calendar);
    const rightCollapsed = Boolean(panelState.right);
    $('calendarPanel').classList.toggle('is-collapsed', calendarCollapsed);
    $('rightPanel').classList.toggle('is-collapsed', rightCollapsed);
    layout.classList.toggle('left-collapsed', calendarCollapsed);
    layout.classList.toggle('right-collapsed', rightCollapsed);
    $('collapseCalendarBtn').setAttribute('aria-expanded', String(!calendarCollapsed));
    $('collapseRightBtn').setAttribute('aria-expanded', String(!rightCollapsed));
    $('collapseCalendarBtn').title = calendarCollapsed ? 'カレンダーを展開する' : 'カレンダーを折りたたむ';
    $('collapseRightBtn').title = rightCollapsed ? '予定と準備を展開する' : '予定と準備を折りたたむ';
    $('dataToolsPanel').open = Boolean(panelState.dataTools);
  }

  function togglePanel(name) {
    panelState[name] = !panelState[name];
    savePanelState();
    applyPanelState();
  }

  function updatePanelViewportHeight() {
    if (window.matchMedia('(max-width: 1100px)').matches) {
      $('calendarLayout').style.removeProperty('--calendar-viewport-height');
      return;
    }
    const top = $('calendarLayout').getBoundingClientRect().top;
    $('calendarLayout').style.setProperty('--calendar-viewport-height', `${Math.max(560, window.innerHeight - top - 16)}px`);
  }

  function seedSessions() {
    return [
      {
        id: newId('session'),
        sampleData: true,
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
        sampleData: true,
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

  function isSampleSession(session) {
    if (session?.sampleData === true) return true;
    return (session?.scenario === '無貌の街 第3回' && session?.start === '2026-07-02T20:00' && session?.gm === '星見 月夜')
      || (session?.scenario === '星屑の魔導師' && session?.start === '2026-07-04T13:00' && session?.gm === 'くま');
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

  function zonedDateTime(date, timeZone = calendarSettings.timeZone) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return { date: '', time: '', datetime: '' };
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
    const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
    const datePart = `${parts.year}-${parts.month}-${parts.day}`;
    const timePart = `${parts.hour}:${parts.minute}`;
    return { date: datePart, time: timePart, datetime: `${datePart}T${timePart}` };
  }

  function currentCalendarDateKey() {
    return zonedDateTime(new Date()).date;
  }

  function calendarMonthDate(key) {
    const [year, month] = String(key || '').split('-').map(Number);
    return new Date(year || today.getFullYear(), (month || today.getMonth() + 1) - 1, 1);
  }

  function sessionDisplayStart(session) {
    if (session?.startInstant && !session?.allDay) {
      const display = zonedDateTime(new Date(session.startInstant));
      if (display.datetime) return display.datetime;
    }
    return session?.start || '';
  }

  function sessionDisplayEnd(session) {
    if (session?.endInstant && !session?.allDay) {
      const display = zonedDateTime(new Date(session.endInstant));
      if (display.time) return display.time;
    }
    return session?.end || '';
  }

  function sessionDate(session) {
    return sessionDisplayStart(session).slice(0, 10);
  }

  function eventTimeClass(session) {
    if (session.allDay) return 'is-all-day';
    const hour = Number(sessionDisplayStart(session).slice(11, 13));
    return Number.isFinite(hour) && hour >= 18 ? 'is-night' : 'is-daytime';
  }

  function eventTimeLabel(session) {
    if (session.allDay) return '終日';
    const start = sessionDisplayStart(session).slice(11, 16);
    const end = sessionDisplayEnd(session);
    return `${start}${end ? `–${esc(end)}` : ''}`;
  }

  function fmtDate(iso) {
    const [year, month, day] = String(iso || '').slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return iso || '';
    return `${year}年${month}月${day}日`;
  }

  function fmtDateTime(session) {
    const start = sessionDisplayStart(session);
    if (!start) return '';
    if (session.allDay) return `${fmtDate(start)} 終日`;
    const end = sessionDisplayEnd(session);
    return `${fmtDate(start)} ${start.slice(11, 16)}${end ? `–${end}` : ''}`;
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
    renderSampleDataButton();
    renderCalendarTimeZone();
    save();
  }

  function timeZoneLabel(timeZone = calendarSettings.timeZone) {
    const labels = {
      'Asia/Tokyo': '日本時間',
      'America/New_York': '米国東部時間',
      'America/Chicago': '米国中部時間',
      'America/Denver': '米国山岳部時間',
      'America/Los_Angeles': '米国太平洋時間',
      'Europe/London': '英国時間',
      UTC: '協定世界時',
    };
    return labels[timeZone] || timeZone;
  }

  function renderCalendarTimeZone() {
    $('calendarTimeZoneLabel').textContent = `${timeZoneLabel()} · ${calendarSettings.timeZone}`;
  }

  function updateTimeZonePreview() {
    const timeZone = $('calendarTimeZoneInput').value;
    $('calendarTimeZonePreview').textContent = new Intl.DateTimeFormat('ja-JP', {
      timeZone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());
  }

  function openCalendarSettings() {
    $('calendarTimeZoneInput').value = calendarSettings.timeZone;
    updateTimeZonePreview();
    $('calendarSettingsDialog').showModal();
  }

  function renderSampleDataButton() {
    const count = sessions.filter(isSampleSession).length;
    $('removeSampleDataBtn').hidden = count === 0;
    $('removeSampleDataBtn').textContent = count ? `サンプル削除 (${count})` : 'サンプル削除';
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
        <button class="day ${d.getMonth() !== cursor.getMonth() ? 'other' : ''} ${key === currentCalendarDateKey() ? 'today' : ''} ${isSelected ? 'selected' : ''}" type="button" data-date="${key}">
          <span class="day-num">${d.getDate()}</span>
          <span class="day-add">＋</span>
          ${evs.map(session => `
            <span class="event ${eventTimeClass(session)}" data-id="${esc(session.id)}" title="ダブルクリックで編集">
              <span class="event-time">● ${eventTimeLabel(session)}</span>
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
      day.addEventListener('dblclick', event => {
        const eventEl = event.target.closest('.event');
        if (eventEl) {
          event.preventDefault();
          openDialog(eventEl.dataset.id);
          return;
        }
        openDialog('', day.dataset.date);
      });
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
    const list = sessions.filter(session => sessionDate(session) === currentCalendarDateKey());
    $('todayList').innerHTML = list.length ? list.map(miniSession).join('') : '<p class="mini-card">予定なし</p>';
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
        <small>${eventTimeLabel(session)}</small>
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
    const start = new Date(`${currentCalendarDateKey()}T12:00`);
    start.setDate(start.getDate() - start.getDay());
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
        <button class="task-delete" type="button" aria-label="${esc(task.title)}を削除" title="タスクを削除">×</button>
        <span class="drag-grip" aria-hidden="true">⋮⋮</span>
      </article>
    `).join('') || '<p class="mini-card">タスクなし</p>';

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
      card.querySelector('.task-delete').addEventListener('click', () => deleteTask(card.dataset.sessionId, card.dataset.taskId));
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

  function deleteTask(sessionId, taskId) {
    const session = sessions.find(item => item.id === sessionId);
    const task = session?.tasks.find(item => item.id === taskId);
    if (!session || !task || !confirm(`タスク「${task.title}」を削除しますか？`)) return;
    session.tasks = session.tasks.filter(item => item.id !== taskId);
    toast('タスクを削除しました');
    render();
  }

  function renderDetail() {
    const session = sessions.find(item => item.id === selectedId);
    $('detailPane').hidden = !session && !selectedDate;
    if (!session) {
      $('detailContent').className = 'detail-content empty';
      $('detailContent').textContent = selectedDate ? '予定なし' : '';
      return;
    }
    $('detailContent').className = 'detail-content';
    const seriesSessions = session.series
      ? sessions.filter(item => item.series === session.series).sort((a, b) => String(a.start).localeCompare(String(b.start)))
      : [];
    $('detailContent').innerHTML = `
      <h3 class="detail-title">${esc(session.scenario)}</h3>
      ${session.series ? `<div class="detail-row"><span>シリーズ</span><b>${esc(session.series)}</b></div>` : ''}
      <div class="detail-row"><span>システム</span><b>${esc(session.system)}</b></div>
      <div class="detail-row"><span>日時</span><b>${esc(fmtDateTime(session))}</b></div>
      <div class="detail-row"><span>GM</span><b>${esc(session.gm)}</b></div>
      <div class="detail-row"><span>形式</span><b>${esc(session.format)}</b></div>
      <div class="detail-row"><span>ステータス</span><b><span class="chip green">${session.status === 'scheduled' ? '予定確定' : session.status === 'completed' ? '完了' : '調整中'}</span></b></div>
      <h4>参加者（PL / PC）</h4>
      <div class="people">${(session.players || []).map(player => `<div class="person"><b>${esc(player.pl)}</b><span>${esc(player.pc)}</span></div>`).join('') || '<p>未登録</p>'}</div>
      <h4>関連リンク</h4>
      <div class="links">${(session.links || []).map(link => `<a class="link-pill" href="${esc(link.url || '#')}" target="_blank" rel="noopener noreferrer">🔗 ${esc(link.label)} <span>↗</span></a>`).join('') || '<p>未登録</p>'}</div>
      <h4>準備タスク</h4>
      <div class="detail-tasks">${(session.tasks || []).map(task => `<div class="task-row"><span>${task.done ? '☑' : '☐'} ${esc(task.title)}</span><span class="task-row-meta">${esc(task.due || '')} <span class="chip">${esc(task.status || '')}</span><button class="task-row-delete" type="button" data-task-id="${esc(task.id)}" aria-label="タスクを削除">×</button></span></div>`).join('') || '<p>未登録</p>'}</div>
      ${seriesSessions.length > 1 ? `<h4>同じシリーズ</h4><div class="series-list">${seriesSessions.map(item => `<button class="series-link ${item.id === session.id ? 'is-current' : ''}" type="button" data-series-id="${esc(item.id)}"><b>${esc(fmtDate(item.start))}</b>　${esc(item.scenario)}</button>`).join('')}</div>` : ''}
      <p>${esc(session.memo || '')}</p>
      <div class="detail-actions"><button id="editBtn" class="hub-btn is-blue" type="button">編集</button><button id="deleteBtn" class="hub-btn danger" type="button">削除</button><button id="sendLogBtn" class="hub-btn is-note bridge-button" type="button">↗ 卓ログトラッカーへ送る</button></div>`;
    $('editBtn').onclick = () => openDialog(session.id);
    $('deleteBtn').onclick = deleteSelected;
    $('sendLogBtn').onclick = () => sendToLogTracker(session);
    $('detailContent').querySelectorAll('.task-row-delete').forEach(button => button.onclick = () => deleteTask(session.id, button.dataset.taskId));
    $('detailContent').querySelectorAll('.series-link').forEach(button => button.onclick = () => {
      selectedId = button.dataset.seriesId;
      selectedDate = sessionDate(sessions.find(item => item.id === selectedId) || {});
      const d = new Date(`${selectedDate}T00:00`);
      if (!Number.isNaN(d.getTime())) cursor = new Date(d.getFullYear(), d.getMonth(), 1);
      render();
    });
  }

  function openDialog(id = '', date = '') {
    editingId = id;
    const session = sessions.find(item => item.id === id) || {
      start: `${date || selectedDate || currentCalendarDateKey()}T20:00`,
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
    $('dateInput').value = sessionDisplayStart(session);
    $('endTimeInput').value = sessionDisplayEnd(session);
    $('gmInput').value = session.gm || '';
    $('formatInput').value = session.format || '';
    $('seriesInput').value = session.series || '';
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
    $('taskDueInput').value = date || selectedDate || currentCalendarDateKey();
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
    const displayedStartBeforeEdit = sessionDisplayStart(current);
    const displayedEndBeforeEdit = sessionDisplayEnd(current);
    const nextStart = $('dateInput').value;
    const nextEnd = $('endTimeInput').value;
    Object.assign(current, {
      scenario: $('scenarioInput').value.trim(),
      system: $('systemInput').value.trim(),
      start: nextStart,
      end: nextEnd,
      gm: $('gmInput').value.trim(),
      format: $('formatInput').value.trim(),
      series: $('seriesInput').value.trim(),
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
    if (nextStart !== displayedStartBeforeEdit) current.startInstant = '';
    if (nextEnd !== displayedEndBeforeEdit) current.endInstant = '';
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
    const selected = sessions.find(session => session.id === selectedId);
    if (selected?.source === 'google' && selected.googleFeedKey && selected.googleEventId) {
      const key = googleIgnoreKey(selected.googleFeedKey, selected.googleEventId);
      googleSettings.ignoredEvents = [...new Set([...(googleSettings.ignoredEvents || []), key])];
      saveGoogleSettings();
    }
    sessions = sessions.filter(session => session.id !== selectedId);
    selectedId = sessions.find(session => sessionDate(session) === selectedDate)?.id || '';
    toast(selected?.source === 'google' ? '同期予定を非表示にしました' : '削除しました');
    render();
  }

  function removeSampleData() {
    const count = sessions.filter(isSampleSession).length;
    if (!count) return toast('削除できるサンプルデータはありません');
    if (!confirm(`サンプルのセッション${count}件と、その準備タスクを削除しますか？\n手入力・同期・読込データは削除しません。`)) return;
    sessions = sessions.filter(session => !isSampleSession(session));
    if (!sessions.some(session => session.id === selectedId)) {
      selectedId = sessions[0]?.id || '';
      selectedDate = selectedId ? sessionDate(sessions[0]) : '';
    }
    const anchor = sessions.find(session => session.id === selectedId);
    cursor = anchor
      ? calendarMonthDate(sessionDate(anchor))
      : calendarMonthDate(currentCalendarDateKey());
    toast(`サンプルデータ${count}件を削除しました`);
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
      start: `${item.latestDate || item.dates?.[0] || currentCalendarDateKey()}T20:00`,
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
      start: `${row.latestDate || row.date || row.dates?.[0] || currentCalendarDateKey()}T20:00`,
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

  function unfoldIcal(text) {
    return String(text || '').replace(/\r?\n[ \t]/g, '');
  }

  function parseIcalProperties(block) {
    const properties = new Map();
    unfoldIcal(block).split(/\r?\n/).forEach(line => {
      const colon = line.indexOf(':');
      if (colon < 1) return;
      const descriptor = line.slice(0, colon);
      const [rawName, ...rawParams] = descriptor.split(';');
      const name = rawName.toUpperCase();
      const params = Object.fromEntries(rawParams.map(param => {
        const separator = param.indexOf('=');
        return separator < 0
          ? [param.toUpperCase(), '']
          : [param.slice(0, separator).toUpperCase(), param.slice(separator + 1).replace(/^"|"$/g, '')];
      }));
      const entry = { value: line.slice(colon + 1), params };
      if (!properties.has(name)) properties.set(name, []);
      properties.get(name).push(entry);
    });
    return properties;
  }

  function decodeIcalText(value) {
    return String(value || '')
      .replaceAll('\\n', '\n')
      .replaceAll('\\N', '\n')
      .replaceAll('\\,', ',')
      .replaceAll('\\;', ';')
      .replaceAll('\\\\', '\\');
  }

  function calendarDateTime(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return { datetime: '', date: '', time: '', instant: '' };
    return { ...zonedDateTime(date), instant: date.toISOString() };
  }

  function zonedWallTimeToDate(parts, timeZone) {
    const utcGuess = Date.UTC(parts.y, parts.m - 1, parts.d, parts.h, parts.min);
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      });
      const displayed = Object.fromEntries(formatter.formatToParts(new Date(utcGuess)).map(part => [part.type, part.value]));
      const displayedAsUtc = Date.UTC(Number(displayed.year), Number(displayed.month) - 1, Number(displayed.day), Number(displayed.hour), Number(displayed.minute));
      return new Date(utcGuess - (displayedAsUtc - utcGuess));
    } catch {
      return new Date(parts.y, parts.m - 1, parts.d, parts.h, parts.min);
    }
  }

  function parseIcalDate(property) {
    const value = String(property?.value || '');
    const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?$/);
    if (!match) return { datetime: '', time: '', instant: '', allDay: false };
    const [, y, m, d, h, min, , utc] = match;
    if (!h) return { datetime: `${y}-${m}-${d}T00:00`, time: '', instant: '', allDay: true };
    const parts = { y: Number(y), m: Number(m), d: Number(d), h: Number(h), min: Number(min) };
    const date = utc
      ? new Date(Date.UTC(parts.y, parts.m - 1, parts.d, parts.h, parts.min))
      : zonedWallTimeToDate(parts, property?.params?.TZID || calendarSettings.timeZone);
    return { ...calendarDateTime(date), allDay: false };
  }

  function parseIcal(text, source = 'ical', feedKey = '') {
    const unfolded = unfoldIcal(text);
    const calendarProperties = parseIcalProperties(unfolded.split('BEGIN:VEVENT')[0] || '');
    const calendarName = decodeIcalText(calendarProperties.get('X-WR-CALNAME')?.[0]?.value) || 'TRPG予定';
    return unfolded.split('BEGIN:VEVENT').slice(1).map(block => {
      const properties = parseIcalProperties(block.split('END:VEVENT')[0] || '');
      const first = name => properties.get(name)?.[0] || { value: '', params: {} };
      const startDate = parseIcalDate(first('DTSTART'));
      const endDate = parseIcalDate(first('DTEND'));
      const uid = decodeIcalText(first('UID').value) || newId('ical-event');
      const recurrenceId = decodeIcalText(first('RECURRENCE-ID').value);
      const statusValue = String(first('STATUS').value || '').toUpperCase();
      const url = decodeIcalText(first('URL').value);
      const categories = decodeIcalText(first('CATEGORIES').value).split(',').map(item => item.trim()).filter(Boolean);
      return {
        id: newId(source === 'google' ? 'google' : 'session'),
        source,
        sourceCalendar: calendarName,
        googleFeedKey: feedKey,
        googleEventId: recurrenceId ? `${uid}::${recurrenceId}` : uid,
        googleDescription: decodeIcalText(first('DESCRIPTION').value),
        scenario: decodeIcalText(first('SUMMARY').value) || '名称未設定',
        system: '',
        start: startDate.datetime,
        end: endDate.allDay ? '' : endDate.time,
        startInstant: startDate.instant,
        endInstant: endDate.instant,
        allDay: startDate.allDay,
        gm: '',
        format: decodeIcalText(first('LOCATION').value),
        status: statusValue === 'CANCELLED' ? 'cancelled' : statusValue === 'TENTATIVE' ? 'tentative' : 'scheduled',
        memo: decodeIcalText(first('DESCRIPTION').value),
        hashtags: categories,
        players: [],
        links: url ? [{ label: 'Google Calendar', url }] : [],
        tasks: [],
      };
    }).filter(item => item.start);
  }

  function renderGoogleSyncStatus() {
    const status = $('googleSyncStatus');
    const feeds = (googleSettings.feeds || []).filter(feed => feed.secretIcalUrl);
    if (!feeds.length) {
      status.textContent = '未接続';
      status.className = 'sync-status';
      status.title = '';
      return;
    }
    if (googleSyncing) {
      status.textContent = 'Google同期中…';
      status.className = 'sync-status is-syncing';
      return;
    }
    if (googleSettings.lastError) {
      status.textContent = '同期エラー';
      status.className = 'sync-status is-error';
      status.title = googleSettings.lastError;
      return;
    }
    const lastSync = googleSettings.lastSyncAt ? new Date(googleSettings.lastSyncAt) : null;
    status.textContent = lastSync && !Number.isNaN(lastSync.getTime())
      ? `${feeds.length}件 同期 ${pad(lastSync.getHours())}:${pad(lastSync.getMinutes())}`
      : `${feeds.length}件 接続済み`;
    status.className = 'sync-status is-active';
    status.title = `${feeds.map(feed => feed.label).join('、')} を連携中`;
  }

  function openGoogleSyncDialog() {
    renderGoogleFeedRows(googleSettings.feeds?.length ? googleSettings.feeds : [normalizeGoogleFeed({}, 0)]);
    $('googleAutoSyncInput').checked = googleSettings.autoSync !== false;
    $('googleSyncIntervalInput').value = String(googleSettings.intervalMinutes || 30);
    $('googleSyncDetails').className = `sync-details${googleSettings.lastError ? ' is-error' : ''}`;
    $('googleSyncDetails').textContent = googleSettings.lastError
      ? `前回の同期エラー: ${googleSettings.lastError}`
      : googleSettings.lastSyncAt
        ? `最終同期: ${new Date(googleSettings.lastSyncAt).toLocaleString('ja-JP')}`
        : 'まだ同期していません。';
    $('disconnectGoogleBtn').hidden = !(googleSettings.feeds || []).length;
    const ignoredCount = (googleSettings.ignoredEvents || []).length;
    $('ignoredEventsCount').textContent = `非表示の同期予定 ${ignoredCount}件`;
    $('restoreIgnoredEventsBtn').hidden = ignoredCount === 0;
    $('googleSyncDialog').showModal();
  }

  function googleFeedStatus(feed) {
    if (feed.lastError) return { text: `前回のエラー: ${feed.lastError}`, error: true };
    if (feed.lastSyncAt) return { text: `最終同期: ${new Date(feed.lastSyncAt).toLocaleString('ja-JP')}`, error: false };
    return { text: 'まだ同期していません。', error: false };
  }

  function renderGoogleFeedRows(feeds) {
    const list = $('googleCalendarList');
    if (!feeds.length) {
      list.innerHTML = '<p class="calendar-feed-empty">カレンダーがありません。「カレンダー追加」から登録してください。</p>';
      return;
    }
    list.innerHTML = feeds.map((feed, index) => {
      const status = googleFeedStatus(feed);
      return `
        <article class="calendar-feed-row" data-feed-id="${esc(feed.id)}">
          <label>表示名<input class="feed-label-input" value="${esc(feed.label || `Google Calendar ${index + 1}`)}" placeholder="TRPG予定" /></label>
          <label>シークレットiCal URL<input class="feed-url-input" type="password" autocomplete="off" value="${esc(feed.secretIcalUrl)}" placeholder="https://calendar.google.com/calendar/ical/.../basic.ics" /></label>
          <label class="feed-enabled"><input class="feed-enabled-input" type="checkbox" ${feed.enabled !== false ? 'checked' : ''} /><span>同期</span></label>
          <button class="feed-remove" type="button">削除</button>
          <p class="feed-status ${status.error ? 'is-error' : ''}">${esc(status.text)}</p>
        </article>`;
    }).join('');
    list.querySelectorAll('.feed-remove').forEach(button => {
      button.onclick = () => {
        const id = button.closest('.calendar-feed-row').dataset.feedId;
        renderGoogleFeedRows(readGoogleFeedRows().filter(feed => feed.id !== id));
      };
    });
  }

  function readGoogleFeedRows() {
    return [...$('googleCalendarList').querySelectorAll('.calendar-feed-row')].map((row, index) => {
      const previous = (googleSettings.feeds || []).find(feed => feed.id === row.dataset.feedId) || {};
      return normalizeGoogleFeed({
        ...previous,
        id: row.dataset.feedId,
        label: row.querySelector('.feed-label-input').value.trim() || `Google Calendar ${index + 1}`,
        secretIcalUrl: row.querySelector('.feed-url-input').value.trim(),
        enabled: row.querySelector('.feed-enabled-input').checked,
      }, index);
    });
  }

  function googleEventToSession(event, feedKey, existing = null) {
    const description = event.googleDescription || event.memo || '';
    const keepsManualMemo = Boolean(existing?.memo && existing.memo !== existing.googleDescription);
    const links = (existing?.links || []).filter(link => link.label !== 'Google Calendar');
    const googleLink = (event.links || []).find(link => link.label === 'Google Calendar');
    if (googleLink) links.push(googleLink);
    return {
      ...(existing || {}),
      id: existing?.id || newId('google'),
      source: 'google',
      sourceCalendar: event.sourceCalendar || 'TRPG予定',
      googleFeedKey: feedKey,
      googleEventId: event.googleEventId,
      googleDescription: description,
      scenario: event.scenario || existing?.scenario || '名称未設定',
      system: existing?.system || '',
      start: event.start,
      end: event.end || '',
      startInstant: event.startInstant || '',
      endInstant: event.endInstant || '',
      gm: existing?.gm || '',
      format: existing?.format || event.format || '',
      series: existing?.series || '',
      allDay: Boolean(event.allDay),
      status: event.status === 'tentative' ? 'tentative' : 'scheduled',
      memo: keepsManualMemo ? existing.memo : description,
      hashtags: existing?.hashtags?.length ? existing.hashtags : (event.hashtags || []),
      players: existing?.players || [],
      links,
      tasks: normalizeTasks(existing?.tasks || []),
    };
  }

  function mergeGoogleEvents(events, feedKey, rangeStart, rangeEnd) {
    const seenIds = new Set();
    let added = 0;
    let updated = 0;
    let removed = 0;
    const cancelledIds = new Set(events.filter(event => event.status === 'cancelled').map(event => event.googleEventId));

    events.filter(event => event.status !== 'cancelled').forEach(event => {
      seenIds.add(event.googleEventId);
      if ((googleSettings.ignoredEvents || []).includes(googleIgnoreKey(feedKey, event.googleEventId))) return;
      const index = sessions.findIndex(session => session.source === 'google' && session.googleFeedKey === feedKey && session.googleEventId === event.googleEventId);
      const existing = index >= 0 ? sessions[index] : null;
      const mapped = googleEventToSession(event, feedKey, existing);
      if (!mapped.start) return;
      if (index >= 0) {
        sessions[index] = mapped;
        updated += 1;
      } else {
        sessions.push(mapped);
        added += 1;
      }
    });

    sessions = sessions.filter(session => {
      if (session.source !== 'google' || session.googleFeedKey !== feedKey || !session.googleEventId) return true;
      if (cancelledIds.has(session.googleEventId)) {
        removed += 1;
        return false;
      }
      const start = new Date(session.startInstant || session.start).getTime();
      const inRange = Number.isFinite(start) && start >= rangeStart.getTime() && start <= rangeEnd.getTime();
      if (inRange && !seenIds.has(session.googleEventId)) {
        removed += 1;
        return false;
      }
      return true;
    });
    return { added, updated, removed };
  }

  function googleIgnoreKey(feedKey, eventId) {
    return `${feedKey}::${eventId}`;
  }

  function validateSecretIcalUrl(value) {
    let url;
    try {
      url = new URL(String(value || '').trim());
    } catch {
      throw new Error('シークレットiCal URLの形式を確認してください。');
    }
    if (url.protocol !== 'https:' || url.hostname !== 'calendar.google.com' || !url.pathname.startsWith('/calendar/ical/') || !url.pathname.endsWith('/basic.ics')) {
      throw new Error('Google Calendarの「シークレット アドレス（iCal形式）」を貼り付けてください。');
    }
    return url.toString();
  }

  async function hashSecretIcalUrl(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].slice(0, 12).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function fetchSecretIcal(secretIcalUrl) {
    const response = await fetch(GOOGLE_ICAL_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/calendar' },
      body: JSON.stringify({ url: secretIcalUrl }),
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `iCal中継エラー（HTTP ${response.status}）`);
    }
    const text = await response.text();
    if (!text.includes('BEGIN:VCALENDAR')) throw new Error('Google CalendarからiCalデータを取得できませんでした。');
    return text;
  }

  function scheduleGoogleSync(delayMinutes = googleSettings.intervalMinutes || 30) {
    window.clearTimeout(googleSyncTimer);
    googleSyncTimer = 0;
    if (!googleSettings.autoSync || !(googleSettings.feeds || []).some(feed => feed.enabled !== false && feed.secretIcalUrl)) return;
    googleSyncTimer = window.setTimeout(() => syncGoogleCalendar(false), Math.max(1, Number(delayMinutes)) * 60 * 1000);
  }

  async function syncGoogleCalendar(manual = false) {
    if (googleSyncing) return;
    const feeds = (googleSettings.feeds || []).filter(feed => feed.enabled !== false && feed.secretIcalUrl);
    if (!feeds.length) {
      if (manual) openGoogleSyncDialog();
      return;
    }
    googleSyncing = true;
    googleSettings.lastError = '';
    renderGoogleSyncStatus();
    const rangeStart = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    const rangeEnd = new Date(today.getFullYear() + 2, today.getMonth() + 1, 1);
    const totals = { added: 0, updated: 0, removed: 0, succeeded: 0 };
    const errors = [];
    for (const feed of feeds) {
      try {
        const secretIcalUrl = validateSecretIcalUrl(feed.secretIcalUrl);
        const feedKey = await hashSecretIcalUrl(secretIcalUrl);
        const text = await fetchSecretIcal(secretIcalUrl);
        const parsed = parseIcal(text, 'google', feedKey);
        const events = parsed.filter(event => {
          const start = new Date(event.startInstant || event.start).getTime();
          return event.status === 'cancelled' || (Number.isFinite(start) && start >= rangeStart.getTime() && start <= rangeEnd.getTime());
        });
        const counts = mergeGoogleEvents(events, feedKey, rangeStart, rangeEnd);
        feed.feedKey = feedKey;
        feed.lastSyncAt = new Date().toISOString();
        feed.lastError = '';
        totals.added += counts.added;
        totals.updated += counts.updated;
        totals.removed += counts.removed;
        totals.succeeded += 1;
      } catch (error) {
        feed.lastError = error instanceof Error ? error.message : 'Google Calendarを同期できませんでした。';
        errors.push(`${feed.label}: ${feed.lastError}`);
      }
    }
    googleSettings.lastSyncAt = totals.succeeded ? new Date().toISOString() : googleSettings.lastSyncAt;
    googleSettings.lastError = errors.join(' / ');
    saveGoogleSettings();
    render();
    googleSyncing = false;
    renderGoogleSyncStatus();
    scheduleGoogleSync();
    if (errors.length) {
      toast(`Google同期: ${totals.succeeded}/${feeds.length}件成功`);
      if (manual) openGoogleSyncDialog();
    } else {
      toast(`${feeds.length}カレンダー同期: 追加${totals.added}・更新${totals.updated}・削除${totals.removed}件`);
    }
  }

  function maybeAutoSyncGoogle() {
    renderGoogleSyncStatus();
    if (!googleSettings.autoSync || !(googleSettings.feeds || []).some(feed => feed.enabled !== false && feed.secretIcalUrl)) return;
    const interval = Math.max(1, Number(googleSettings.intervalMinutes || 30));
    const elapsed = Date.now() - new Date(googleSettings.lastSyncAt || 0).getTime();
    const needsTimezoneMigration = sessions.some(session => session.source === 'google' && !session.allDay && !session.startInstant);
    if (needsTimezoneMigration || !googleSettings.lastSyncAt || elapsed >= interval * 60 * 1000) {
      syncGoogleCalendar(false);
    } else {
      scheduleGoogleSync(Math.max(1, interval - elapsed / 60000));
    }
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

  $('googleSyncForm').addEventListener('submit', event => {
    if (event.submitter?.value === 'cancel') return;
    event.preventDefault();
    const feeds = readGoogleFeedRows().filter(feed => feed.secretIcalUrl);
    try {
      if (!feeds.length) throw new Error('同期するカレンダーを1件以上登録してください。');
      feeds.forEach(feed => validateSecretIcalUrl(feed.secretIcalUrl));
      if (new Set(feeds.map(feed => feed.secretIcalUrl)).size !== feeds.length) throw new Error('同じシークレットiCal URLが重複しています。');
    } catch (error) {
      $('googleSyncDetails').className = 'sync-details is-error';
      $('googleSyncDetails').textContent = error instanceof Error ? error.message : 'カレンダー設定を確認してください。';
      return;
    }
    googleSettings = {
      ...googleSettings,
      feeds,
      autoSync: $('googleAutoSyncInput').checked,
      intervalMinutes: Number($('googleSyncIntervalInput').value) || 30,
      lastError: '',
    };
    saveGoogleSettings();
    $('googleSyncDialog').close();
    renderGoogleSyncStatus();
    syncGoogleCalendar(true);
  });

  $('disconnectGoogleBtn').onclick = () => {
    window.clearTimeout(googleSyncTimer);
    googleSyncTimer = 0;
    googleSettings = { feeds: [], autoSync: true, intervalMinutes: 30, lastSyncAt: '', lastError: '', ignoredEvents: googleSettings.ignoredEvents || [] };
    saveGoogleSettings();
    $('googleSyncDialog').close();
    renderGoogleSyncStatus();
    toast('Google Calendar連携を解除しました（同期済み予定は残ります）');
  };

  $('restoreIgnoredEventsBtn').onclick = () => {
    const count = (googleSettings.ignoredEvents || []).length;
    if (!count || !confirm(`非表示にした同期予定${count}件を、次回同期で再表示しますか？`)) return;
    googleSettings.ignoredEvents = [];
    saveGoogleSettings();
    $('ignoredEventsCount').textContent = '非表示の同期予定 0件';
    $('restoreIgnoredEventsBtn').hidden = true;
    toast('非表示を解除しました。同期を開始します');
    syncGoogleCalendar(true);
  };

  $('calendarSettingsForm').addEventListener('submit', event => {
    if (event.submitter?.value === 'cancel') return;
    event.preventDefault();
    const timeZone = $('calendarTimeZoneInput').value;
    if (!isValidTimeZone(timeZone)) return toast('有効なタイムゾーンを選択してください');
    calendarSettings.timeZone = timeZone;
    saveCalendarSettings();
    const selected = sessions.find(session => session.id === selectedId);
    selectedDate = selected ? sessionDate(selected) : currentCalendarDateKey();
    cursor = calendarMonthDate(selectedDate);
    $('calendarSettingsDialog').close();
    render();
    toast(`${timeZoneLabel()}へ変更しました`);
    if ((googleSettings.feeds || []).some(feed => feed.enabled !== false && feed.secretIcalUrl)) syncGoogleCalendar(false);
  });

  $('deleteSessionBtn').onclick = deleteSelected;
  $('reportBridgeBtn').onclick = sendToReportGenerator;
  $('removeSampleDataBtn').onclick = removeSampleData;
  $('focusAddSessionBtn').onclick = () => openDialog('', selectedDate);
  $('focusAddTaskBtn').onclick = () => openTaskDialog(selectedDate);
  $('clearFocusBtn').onclick = () => { selectedDate = ''; render(); };
  $('todayBtn').onclick = () => { selectedDate = currentCalendarDateKey(); cursor = calendarMonthDate(selectedDate); render(); };
  $('prevMonthBtn').onclick = () => { cursor.setMonth(cursor.getMonth() - 1); render(); };
  $('nextMonthBtn').onclick = () => { cursor.setMonth(cursor.getMonth() + 1); render(); };
  $('helpBtn').onclick = () => alert('日付クリックでフォーカス、イベントのダブルクリックで編集できます。歯車から表示タイムゾーンを選択でき、日中卓・夜卓もその時間帯で判定します。Google連携では複数の非公開カレンダーを読み取り専用で同期します。');
  $('shortcutBtn').onclick = () => alert('Ctrl/⌘ + Shift + N: セッション追加\nCtrl/⌘ + Shift + T: タスク追加\nEsc: ダイアログを閉じる');
  $('languageBtn').onclick = () => toast('JP/EN切替は後続アップデートで対応予定です');
  $('closeDetailBtn').onclick = () => { selectedId = ''; renderDetail(); };
  $('showAllTasksBtn').onclick = () => alert(getTaskItems().map(task => `${task.done ? '☑' : '☐'} ${task.title} / ${task.scenario} / ${task.due || '期限なし'}`).join('\n') || 'タスクはありません。');
  $('exportJsonBtn').onclick = () => download('session-check-calendar.json', JSON.stringify({ version: '0.18', exportedAt: new Date().toISOString(), calendarSettings, sessions }, null, 2), 'application/json');
  $('exportIcalBtn').onclick = () => download('session-check-calendar.ics', toIcal(), 'text/calendar');
  $('importInput').onchange = async event => {
    const file = event.target.files[0];
    if (!file) return;
    const data = JSON.parse(await file.text());
    if (isValidTimeZone(data?.calendarSettings?.timeZone)) {
      calendarSettings.timeZone = data.calendarSettings.timeZone;
      saveCalendarSettings();
      renderCalendarTimeZone();
    }
    openImportDialog(normalizeImportedJson(data), 'JSONから読み込むカレンダーを選択', '卓準備カレンダーJSONと卓ログトラッカー出力JSONに対応しています。');
    event.target.value = '';
  };
  $('icalInput').onchange = async event => {
    const file = event.target.files[0];
    if (!file) return;
    openImportDialog(parseIcal(await file.text(), 'ical'), 'iCalから読み込むカレンダーを選択', 'iCal内のカレンダー名・カテゴリごとに取り込み対象を選択できます。');
    event.target.value = '';
  };
  $('googleImportBtn').onclick = openGoogleSyncDialog;
  $('addGoogleCalendarBtn').onclick = () => {
    const feeds = readGoogleFeedRows();
    feeds.push(normalizeGoogleFeed({ label: `Google Calendar ${feeds.length + 1}` }, feeds.length));
    renderGoogleFeedRows(feeds);
  };
  $('collapseCalendarBtn').onclick = () => togglePanel('calendar');
  $('collapseRightBtn').onclick = () => togglePanel('right');
  $('calendarSettingsBtn').onclick = openCalendarSettings;
  $('calendarTimeZoneInput').onchange = updateTimeZonePreview;
  $('dataToolsPanel').addEventListener('toggle', () => {
    panelState.dataTools = $('dataToolsPanel').open;
    savePanelState();
  });

  function toIcal() {
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TRPG Web Tools//Session Check Calendar//JA',
      `X-WR-TIMEZONE:${calendarSettings.timeZone}`,
      ...sessions.flatMap(session => [
        'BEGIN:VEVENT',
        `UID:${session.id}@trpg-web-tools`,
        `SUMMARY:${session.scenario}`,
        icalDateLine(session, false),
        icalDateLine(session, true),
        `CATEGORIES:${session.sourceCalendar || 'TRPG予定'}`,
        `DESCRIPTION:${(session.memo || '').replaceAll('\n', '\\n')}`,
        'END:VEVENT',
      ].filter(Boolean)),
      'END:VCALENDAR',
    ].join('\r\n');
  }

  function icalDateLine(session, isEnd) {
    const instant = isEnd ? session.endInstant : session.startInstant;
    if (instant) {
      const date = new Date(instant);
      if (!Number.isNaN(date.getTime())) {
        const value = date.toISOString().replaceAll('-', '').replaceAll(':', '').replace('.000', '');
        return `${isEnd ? 'DTEND' : 'DTSTART'}:${value}`;
      }
    }
    const start = sessionDisplayStart(session);
    if (!start) return '';
    if (!isEnd && session.allDay) return `DTSTART;VALUE=DATE:${start.slice(0, 10).replaceAll('-', '')}`;
    const time = isEnd ? sessionDisplayEnd(session) : start.slice(11, 16);
    if (!time) return '';
    const value = `${start.slice(0, 10).replaceAll('-', '')}T${time.replace(':', '')}00`;
    return `${isEnd ? 'DTEND' : 'DTSTART'};TZID=${calendarSettings.timeZone}:${value}`;
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

  window.addEventListener('resize', updatePanelViewportHeight);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) maybeAutoSyncGoogle();
  });

  applyPanelState();
  updatePanelViewportHeight();
  render();
  renderGoogleSyncStatus();
  maybeAutoSyncGoogle();
})();

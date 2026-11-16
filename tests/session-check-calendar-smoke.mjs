import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../tools/session-check-calendar/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../tools/session-check-calendar/css/session_check_calendar.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../tools/session-check-calendar/js/session_check_calendar.js', import.meta.url), 'utf8');
const hubCss = readFileSync(new URL('../shared/hub/hub.css', import.meta.url), 'utf8');
const sessionLogHtml = readFileSync(new URL('../tools/session-log-tool/index.html', import.meta.url), 'utf8');

for (const id of [
  'calendarPanel',
  'rightPanel',
  'removeSampleDataBtn',
  'googleSyncDialog',
  'googleCalendarList',
  'addGoogleCalendarBtn',
  'googleAutoSyncInput',
  'dataToolsPanel',
  'seriesInput',
  'restoreIgnoredEventsBtn',
  'calendarSettingsBtn',
  'calendarSettingsDialog',
  'calendarTimeZoneInput',
  'calendarTimeZoneLabel',
  'dataToolsToggleBtn',
  'todayPanelToggle',
  'taskPanelToggle',
  'todayPanelBody',
  'taskPanelBody',
  'selectionTargetLabel',
  'focusAddSessionBtn',
  'focusAddTaskBtn',
  'dataToolsCloseBtn',
  'weekdays',
  'weekStartsOnInput',
  'daytimeStartInput',
  'nightStartInput',
  'allDayRuleInput',
  'allDayDurationHoursInput',
  'daytimeLegend',
  'nightLegend',
  'allDayLegend',
  'editDetailBtn',
  'deleteDetailBtn',
  'trackerImportDialog',
  'trackerMatchList',
  'taskGeneratorDialog',
  'taskTemplateTree',
  'addCustomTaskBtn',
]) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Missing calendar control: ${id}`);
}

if (!html.includes('v0.33') || !html.includes('session_check_calendar.js?v=0.33') || !html.includes('hub.css?v=0.1.2')) {
  throw new Error('Calendar version assets were not updated');
}

if (!sessionLogHtml.includes('hub.css?v=0.1.2')) {
  throw new Error('Session log tracker does not load the shared select-arrow update');
}

if (!html.includes('title="データ表記を閉じる" hidden>▶</button>')) {
  throw new Error('Data tools compact close control is missing');
}

for (const contract of ['appearance: none !important', 'background-position: right 18px center', 'padding-right: 40px !important']) {
  if (!hubCss.includes(contract)) throw new Error(`Missing shared select-arrow contract: ${contract}`);
}

if (html.includes('id="focusPanel"') || html.includes('id="formatInput"')) {
  throw new Error('Legacy selected-day panel or session format input should be removed');
}

if ((html.match(/formnovalidate/g) || []).length < 4) {
  throw new Error('Required-field dialogs must allow close/cancel without validation');
}

if (html.includes('id="collapseCalendarBtn"') || html.includes('id="collapseRightBtn"')) {
  throw new Error('Whole workspace collapse controls should be removed');
}

for (const contract of [
  '.workspace-panel-body',
  'body.hub .hub-main { padding-top: 14px; }',
  'overflow-y: auto',
  '.calendar-workspace-head',
  'justify-content: flex-end',
  '.calendar-header-tools',
  '.calendar-header-tools.is-open',
  '.calendar-workspace-head.is-tools-open',
  '.data-tools-close-button',
  '.data-tools-toggle-slot',
  'flex: 0 0 96px',
  '.day-head',
  '.day.is-sunday',
  '.day.is-saturday',
  'transform: translateX',
  '.month-add-actions',
  '.overview-panel.is-collapsed',
  '.detail-pane.has-session',
  '.event.is-daytime',
  '.event.is-night',
  '.event.is-all-day',
  '.event.is-series',
  '.detail-row-status',
  '.detail-head-actions',
  '.detail-icon-button svg',
  '.task-delete',
  '.calendar-app-icon svg',
  '.day.is-series-day:not(.selected)',
  '.tracker-match-list',
  '.task-template-tree',
  '.template-check',
  '.status-chip.status-tentative',
  '.status-chip.status-scheduled',
  '.status-chip.status-active',
  '.status-chip.status-completed',
  '.event.status-active',
]) {
  if (!css.includes(contract)) throw new Error(`Missing independent-panel layout contract: ${contract}`);
}

for (const contract of [
  "GOOGLE_SETTINGS_KEY",
  "PANEL_STATE_KEY",
  "trpg-calendar-ical-proxy.oc-character-cloudflare.workers.dev",
  "secretIcalUrl",
  "googleSettings.feeds",
  "readGoogleFeedRows",
  "renderGoogleFeedRows",
  "fetchSecretIcal",
  "hashSecretIcalUrl",
  "validateSecretIcalUrl",
  "googleEventId",
  "maybeAutoSyncGoogle",
  "mergeGoogleEvents",
  "isSampleSession",
  "removeSampleData",
  "eventTimeClass",
  "deleteTask",
  "googleIgnoreKey",
  "ignoredEvents",
  "seriesSessions",
  "CALENDAR_SETTINGS_KEY",
  "Asia/Tokyo",
  "zonedDateTime",
  "sessionDisplayStart",
  "startInstant",
  "calendarTimeZoneInput",
  "collapseOverviewPanels",
  "setOverviewPanel",
  "dataToolsToggleBtn",
  "renderSelectionTarget",
  "seriesBaseName",
  "applyAutoSeriesGrouping",
  "syncSeriesSharedFields",
  "seriesAuto",
  "DEFAULT_CALENDAR_SETTINGS",
  "weekStartsOn",
  "allDayDurationHours",
  "sessionDurationHours",
  "isConfiguredAllDay",
  "updateAllDaySettingsState",
  "dataToolsCloseBtn",
  "dataToolsToggleBtn').hidden = dataToolsOpen",
  "dataToolsCloseBtn').hidden = !dataToolsOpen",
  'LOG_STORAGE_KEY',
  'openTrackerImportDialog',
  'trackerPlayers',
  'openTaskGenerator',
  'TASK_TEMPLATES',
  'data-task-toggle',
  'is-series-day',
  'SESSION_STATUS',
  'applyAutomaticStatuses',
  'statusMeta',
  "session.series ? `series:${session.series}` : `session:${session.id}`",
  'now.datetime >= firstStart',
  'now.date > lastDate',
  'detailTaskItems',
  'シリーズ共通の準備タスク',
  'data-session-id',
  '予備日',
]) {
  if (!js.includes(contract)) throw new Error(`Missing Google sync contract: ${contract}`);
}

if (!js.includes("version: '0.33'") || js.includes('www.googleapis.com/calendar/v3/calendars/')) {
  throw new Error('Calendar export version or legacy Google preview is incorrect');
}

if (!js.includes("'is-series'") || !js.includes('detail-row detail-row-status')) {
  throw new Error('Series emphasis or status alignment contract is missing');
}

if (js.includes('<span>形式</span>') || js.includes('形式未設定')) {
  throw new Error('Legacy format display should be removed from calendar cards');
}

if (js.includes('id="editBtn"') || js.includes('id="deleteBtn"') || !html.includes('<svg viewBox="0 0 24 24"')) {
  throw new Error('Detail edit/delete actions should use SVG header icons');
}

if (!html.includes('<span class="hub-icon calendar-app-icon"') || html.includes('<span class="hub-icon" aria-hidden="true">▦</span>')) {
  throw new Error('Calendar header must use the SVG calendar icon');
}

if (js.includes('task-origin') || js.includes('sessionScenario') || css.includes('.task-origin')) {
  throw new Error('Series task rows should not repeat the event date and scenario');
}

for (const option of ['value="tentative">調整中', 'value="scheduled" selected>予定確定', 'value="active">現行', 'value="completed">完了']) {
  if (!html.includes(option)) throw new Error(`Missing session status option: ${option}`);
}

console.log('session-check-calendar smoke passed: tracker-aligned header, compact data tools, SVG detail actions, and calendar controls are present');

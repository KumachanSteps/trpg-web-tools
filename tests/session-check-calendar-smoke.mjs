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
]) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Missing calendar control: ${id}`);
}

if (!html.includes('v0.23') || !html.includes('session_check_calendar.js?v=0.23') || !html.includes('hub.css?v=0.1.2')) {
  throw new Error('Calendar version assets were not updated');
}

if (!sessionLogHtml.includes('hub.css?v=0.1.2')) {
  throw new Error('Session log tracker does not load the shared select-arrow update');
}

if (!html.includes('title="データ表記を閉じる">▶</button>')) {
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
  'overflow-y: auto',
  '.calendar-workspace-head',
  'justify-content: flex-end',
  '.calendar-header-tools',
  '.calendar-header-tools.is-open',
  '.calendar-workspace-head.is-tools-open',
  '.data-tools-close-button',
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
  '.task-delete',
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
  "seriesAuto",
  "DEFAULT_CALENDAR_SETTINGS",
  "weekStartsOn",
  "allDayDurationHours",
  "sessionDurationHours",
  "isConfiguredAllDay",
  "updateAllDaySettingsState",
  "dataToolsCloseBtn",
  "dataToolsToggleBtn').hidden = dataToolsOpen",
]) {
  if (!js.includes(contract)) throw new Error(`Missing Google sync contract: ${contract}`);
}

if (!js.includes("version: '0.23'") || js.includes('www.googleapis.com/calendar/v3/calendars/')) {
  throw new Error('Calendar export version or legacy Google preview is incorrect');
}

console.log('session-check-calendar smoke passed: compact data tools, inset shared select arrows, week starts, time bands, and multi-calendar sync are present');

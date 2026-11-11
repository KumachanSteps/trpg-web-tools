import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../tools/session-check-calendar/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../tools/session-check-calendar/css/session_check_calendar.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../tools/session-check-calendar/js/session_check_calendar.js', import.meta.url), 'utf8');

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
]) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Missing calendar control: ${id}`);
}

if (!html.includes('v0.20') || !html.includes('session_check_calendar.js?v=0.20')) {
  throw new Error('Calendar version assets were not updated');
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
  '.calendar-header-tools',
  '.calendar-header-tools.is-open',
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
]) {
  if (!js.includes(contract)) throw new Error(`Missing Google sync contract: ${contract}`);
}

if (!js.includes("version: '0.20'") || js.includes('www.googleapis.com/calendar/v3/calendars/')) {
  throw new Error('Calendar export version or legacy Google preview is incorrect');
}

console.log('session-check-calendar smoke passed: horizontal header tools, selected-day actions, series grouping, dialog close, timezone settings, and multi-calendar sync are present');

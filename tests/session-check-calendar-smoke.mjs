import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../tools/session-check-calendar/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../tools/session-check-calendar/css/session_check_calendar.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../tools/session-check-calendar/js/session_check_calendar.js', import.meta.url), 'utf8');

for (const id of [
  'calendarPanel',
  'rightPanel',
  'collapseCalendarBtn',
  'collapseRightBtn',
  'removeSampleDataBtn',
  'googleSyncDialog',
  'googleCalendarList',
  'addGoogleCalendarBtn',
  'googleAutoSyncInput',
]) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Missing calendar control: ${id}`);
}

if (!html.includes('v0.16 2026.11.11') || !html.includes('session_check_calendar.js?v=0.16')) {
  throw new Error('Calendar version assets were not updated');
}

for (const contract of [
  '.workspace-panel-body',
  'overflow-y: auto',
  '.workspace-panel.is-collapsed',
  '.layout.left-collapsed',
  '.layout.right-collapsed',
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
]) {
  if (!js.includes(contract)) throw new Error(`Missing Google sync contract: ${contract}`);
}

if (!js.includes("version: '0.16'") || js.includes('www.googleapis.com/calendar/v3/calendars/')) {
  throw new Error('Calendar export version or legacy Google preview is incorrect');
}

console.log('session-check-calendar smoke passed: sample cleanup, collapsible panes, and multi-calendar sync are present');

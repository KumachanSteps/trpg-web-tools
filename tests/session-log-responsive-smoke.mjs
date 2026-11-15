import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../tools/session-log-tool/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../tools/session-log-tool/css/log_tool_style.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../tools/session-log-tool/js/log_tool.js', import.meta.url), 'utf8');

if (!html.includes('v1.107') || !html.includes('log_tool_style.css?v=1.107.0') || !html.includes('log_tool.js?v=1.107')) {
  throw new Error('Session log tracker version assets were not updated');
}

if (html.includes('href="https://x.com/KumachanSteps"')) {
  throw new Error('Legacy X header action should be removed');
}

for (const contract of [
  '.header-action-row,',
  '.table-import-actions{',
  'flex-wrap:nowrap',
  'overflow-x:auto',
  'white-space:nowrap',
  '.table-import-actions>.header-button{flex:0 0 auto',
  '@media (min-width:840px) and (max-width:1100px)',
  '.table-header{flex-direction:row;align-items:center}',
  '.table-import-actions{width:auto;min-width:0;flex:1 1 auto;justify-content:flex-end}',
  'grid-template-columns:auto minmax(0,1fr)',
]) {
  if (!css.includes(contract)) throw new Error(`Missing responsive no-wrap contract: ${contract}`);
}

if (!js.includes('const APP_VERSION = "v1.107"')) {
  throw new Error('Session log tracker app version was not updated');
}

console.log('session-log responsive smoke passed: table title and actions share one grid row');

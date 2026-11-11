import worker from '../workers/calendar-ical-proxy/worker.js';

const origin = 'https://kumachansteps.github.io';
const secretUrl = 'https://calendar.google.com/calendar/ical/example%40group.calendar.google.com/private-token/basic.ics';
const nativeFetch = globalThis.fetch;

globalThis.fetch = async input => {
  if (String(input) !== secretUrl) throw new Error(`Unexpected upstream: ${input}`);
  return new Response('BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:test\r\nEND:VEVENT\r\nEND:VCALENDAR', {
    status: 200,
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};

try {
  const health = await worker.fetch(new Request('https://worker.example/'));
  if (health.status !== 200 || !(await health.json()).ok) throw new Error('Health check failed');

  const blocked = await worker.fetch(new Request('https://worker.example/', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/private.ics' }),
  }));
  if (blocked.status !== 400) throw new Error('Non-Google target was not blocked');

  const response = await worker.fetch(new Request('https://worker.example/', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: secretUrl }),
  }));
  const text = await response.text();
  if (response.status !== 200 || !text.includes('BEGIN:VCALENDAR')) throw new Error('Calendar was not proxied');
  if (response.headers.get('Access-Control-Allow-Origin') !== origin) throw new Error('CORS origin is incorrect');
  if (response.headers.get('Cache-Control') !== 'no-store') throw new Error('Calendar response may be cached');

  console.log('calendar-ical-proxy smoke passed: host/path validation, CORS, and no-store response');
} finally {
  globalThis.fetch = nativeFetch;
}

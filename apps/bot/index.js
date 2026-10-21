import { setTimeout as sleep } from 'node:timers/promises';

const { BOT_TOKEN } = process.env;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN is not set (see .env.example)');

async function call(method, params) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method} failed: ${json.description}`);
  return json.result;
}

// Long polling: getUpdates holds the connection open until an update arrives
// or the timeout passes. Nothing connects inward, so no URL or secret.
let offset = 0;
console.log('castor bot polling');
for (;;) {
  let updates;
  try {
    updates = await call('getUpdates', { offset, timeout: 50, allowed_updates: ['message'] });
  } catch (err) {
    console.error(err.message);
    await sleep(5000);
    continue;
  }

  for (const { update_id, message } of updates) {
    offset = update_id + 1;
    if (!message?.text) continue;
    await call('sendMessage', { chat_id: message.chat.id, text: 'Hi' }).catch((err) => console.error(err.message));
  }
}

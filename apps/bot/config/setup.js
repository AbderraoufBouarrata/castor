// One-time bot setup: name, descriptions, avatar. Safe to re-run.
import { readFile } from 'node:fs/promises';

const NAME = 'Castor';
const DESCRIPTION = 'Bobr The Builder';

const { BOT_TOKEN } = process.env;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN is not set (see .env.example)');

const form = (fields) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
};

async function call(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, { method: 'POST', body });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method} failed: ${json.description}`);
  console.log(`ok  ${method}`);
}

await call('setMyName', form({ name: NAME }));
await call('setMyDescription', form({ description: DESCRIPTION }));
await call('setMyShortDescription', form({ short_description: DESCRIPTION }));

const photo = form({ photo: JSON.stringify({ type: 'static', photo: 'attach://avatar' }) });
const jpg = await readFile(new URL('../castor.jpg', import.meta.url));
photo.append('avatar', new Blob([jpg], { type: 'image/jpeg' }), 'castor.jpg');
await call('setMyProfilePhoto', photo);

// getUpdates returns 409 while a webhook is registered.
await call('deleteWebhook');

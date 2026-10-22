// =============================================================================
// Telegram client
// =============================================================================

/** Call a Telegram Bot API method. Throws on any non-ok reply. */
export async function telegram(method, params) {
  const res = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method} failed: ${json.description}`);
  return json.result;
}

/** Send `text` to the chat `msg` came from. */
export const reply = (msg, text) => telegram('sendMessage', { chat_id: msg.chat.id, text });

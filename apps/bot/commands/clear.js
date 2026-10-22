// =============================================================================
// /clear: delete the conversation with the bot (private chats only)
//
// Telegram has no "list chat history" for bots, so we delete by message id:
// from the /clear message itself back to SCAN_BACK ids earlier, 100 ids per
// deleteMessages call. Ids that don't exist in this chat are skipped by
// Telegram. Limits set by Telegram, not by us:
//   - only messages from the last 48 hours can be deleted
//   - in private chats a bot can delete both its own and the user's messages
// =============================================================================

import { telegram, reply } from '../helpers/telegram.js';

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

/** How many message ids before /clear to try. 10 deleteMessages calls. */
const SCAN_BACK = 1000;

/** Telegram's per-call maximum for deleteMessages. */
const BATCH = 100;

// -----------------------------------------------------------------------------
// Command
// -----------------------------------------------------------------------------

export async function clear(msg) {
  // In a group this would delete other people's messages (if the bot is admin).
  if (msg.chat.type !== 'private') return reply(msg, 'ℹ️ /clear only works in a private chat with me.');

  const last = msg.message_id;
  const first = Math.max(1, last - SCAN_BACK + 1);

  // Newest first, so the visible part of the chat disappears right away.
  for (let top = last; top >= first; top -= BATCH) {
    const ids = [];
    for (let id = top; id > top - BATCH && id >= first; id--) ids.push(id);
    // A batch can fail if every message in it is older than 48 hours; keep going.
    await telegram('deleteMessages', { chat_id: msg.chat.id, message_ids: ids }).catch(() => {});
  }
}

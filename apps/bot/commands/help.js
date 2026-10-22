// =============================================================================
// /start, /help and anything unknown: usage text
// =============================================================================

import { reply } from '../helpers/telegram.js';
import { HELP } from '../helpers/format.js';

export const help = (msg) => reply(msg, HELP);

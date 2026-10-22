# @castor/core

Shared code for the Castor apps. No dependencies, no build step. Plain ES modules, Node 22 or newer.

## Contents

| File | Export | What |
|---|---|---|
| `job-state.js` | `STATES` | List of job states: `waiting`, `queued`, `rejected`, `building`, `running`, `done`, `failed` |
| `log.js` | `log(emoji, text)` | Print `HH:MM:SS <emoji>  <text>`. Two spaces after the emoji so it never looks glued to the text. |
| `log.js` | `short(job)` | First 8 characters of a job id |
| `log.js` | `duration(seconds)` | `42s` or `10m 00s` |
| `index.js` | all of the above | Package entry |

Used by: dispatcher and reaper (logs).

## Usage

Add it to the app's `package.json`:

```json
"dependencies": { "@castor/core": "*" }
```

Then run `npm install` from the repo root, and:

```js
import { log, short, duration } from '@castor/core';

log('🔨', `job ${short(job)} → building`);
// 12:04:31 🔨  job 7bfe34b6 → building
```

An app's Dockerfile must copy `packages/core` into the image (see `apps/dispatcher/Dockerfile`).

## Commands

None.

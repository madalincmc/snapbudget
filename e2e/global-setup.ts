import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { seed, sweepOrphans } from './seed';

export const AUTH_DIR = path.join('e2e', '.auth');
export const STORAGE_STATE = path.join(AUTH_DIR, 'owner.json');
export const SEEDED_IDS = path.join(AUTH_DIR, 'seeded.json');

export default async function globalSetup() {
  const swept = await sweepOrphans();
  if (swept > 0) {
    console.log(`swept ${swept} orphaned e2e user(s) from a previous run`);
  }

  const account = await seed();

  mkdirSync(AUTH_DIR, { recursive: true });

  // Playwright's storage-state format. The cookie is the one the app itself
  // would set, so every request the browser makes is indistinguishable from a
  // genuinely signed-in session.
  writeFileSync(
    STORAGE_STATE,
    JSON.stringify(
      {
        cookies: [
          {
            name: account.cookie.name,
            value: account.cookie.value,
            domain: 'localhost',
            path: '/',
            expires: Math.floor(Date.now() / 1000) + 60 * 60,
            httpOnly: false,
            secure: false,
            sameSite: 'Lax',
          },
        ],
        origins: [],
      },
      null,
      2,
    ),
  );

  writeFileSync(
    SEEDED_IDS,
    JSON.stringify({ ownerId: account.ownerId, memberId: account.memberId }, null, 2),
  );

  console.log(`seeded e2e account ${account.ownerEmail}`);
}

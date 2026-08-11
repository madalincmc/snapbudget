import { existsSync, readFileSync, rmSync } from 'node:fs';
import { AUTH_DIR, SEEDED_IDS } from './global-setup';
import { teardown } from './seed';

export default async function globalTeardown() {
  if (!existsSync(SEEDED_IDS)) return;

  const { ownerId, memberId } = JSON.parse(readFileSync(SEEDED_IDS, 'utf8'));
  await teardown([ownerId, memberId].filter(Boolean));

  // The session cookie is a live credential until it expires; it has no
  // business outliving the run that needed it.
  rmSync(AUTH_DIR, { recursive: true, force: true });

  console.log('e2e account deleted');
}

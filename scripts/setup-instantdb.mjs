/**
 * One-time InstantDB schema setup.
 * Writes seed documents to auto-create namespaces and attributes.
 *
 * Usage: node scripts/setup-instantdb.mjs
 */
import { init, id, tx } from '@instantdb/admin';

const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID;
const adminToken = process.env.INSTANT_ADMIN_TOKEN;

if (!appId || !adminToken) {
  console.error('Missing env vars.');
  process.exit(1);
}

const admin = init({ appId, adminToken });
const STATS_ID = '11111111-1111-4111-8111-111111111111';

async function main() {
  // Write seed documents to auto-create namespaces and their attributes
  console.log('Creating `games` namespace...');
  await admin.transact(
    tx.games[id()].update({
      state: { board: [], currentPlayer: 1, status: 'seed' },
      player1: '',
      status: 'seed',
    })
  );

  console.log('Creating `stats` namespace...');
  await admin.transact(
    tx.stats[STATS_ID].update({
      totalGames: 0,
      blackWins: 0,
      whiteWins: 0,
      draws: 0,
    })
  );

  console.log('Done! Schema ready.');
}

main().catch((e) => {
  console.error('Failed:', e?.data || e?.message || e);
  process.exit(1);
});

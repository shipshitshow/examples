/**
 * validate-db-connection.ts
 *
 * Validates connectivity to the configured MongoDB instance (Atlas or local).
 * Run before deploying to confirm MONGODB_URI is correct:
 *
 *   MONGODB_URI="mongodb+srv://..." npx tsx scripts/validate-db-connection.ts
 *
 * Or load from .env.production:
 *
 *   npx dotenv -e apps/api/.env.production -- npx tsx scripts/validate-db-connection.ts
 */

import mongoose from 'mongoose';

/* eslint-disable no-console */

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌  MONGODB_URI is not set');
  process.exit(1);
}

const isAtlas = uri.startsWith('mongodb+srv://');
console.log(`Connecting to ${isAtlas ? 'MongoDB Atlas' : 'MongoDB'} …`);

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });

  const admin = mongoose.connection.db?.admin();
  const ping = (await admin?.command({ ping: 1 })) as { ok: number } | undefined;

  if (ping?.ok === 1) {
    console.log('✅  DB ping OK');
  } else {
    console.error('❌  Ping did not return ok:1', ping);
    process.exit(1);
  }

  const buildInfo = (await admin?.command({ buildInfo: 1 })) as { version: string } | undefined;
  console.log(`    MongoDB version : ${buildInfo?.version ?? 'unknown'}`);

  const dbName = mongoose.connection.db?.databaseName;
  console.log(`    Database        : ${dbName}`);

  if (isAtlas) {
    // Confirm we are talking to a replica set (Atlas clusters are always RS)
    const isMaster = (await admin?.command({ isMaster: 1 })) as { setName?: string } | undefined;
    const rsName = isMaster?.setName ?? '(not a replica set)';
    console.log(`    Replica set     : ${rsName}`);
  }

  await mongoose.disconnect();
  console.log('Connection closed. All checks passed.');
} catch (err) {
  console.error('❌  Connection failed:', err);
  process.exit(1);
}

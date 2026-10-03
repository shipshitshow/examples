import 'dotenv/config';
import { buildApp } from './app.js';
import { config } from './config.js';
import { connectDb } from './db.js';
import { shutdown as posthogShutdown } from './services/posthog.js';

async function start() {
  try {
    await connectDb();

    const app = await buildApp();

    await app.listen({ port: config.PORT, host: '0.0.0.0' });

    const shutdown = async () => {
      await app.close();
      await posthogShutdown();
      process.exit(0);
    };
    process.on('SIGTERM', () => void shutdown());
    process.on('SIGINT', () => void shutdown());
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

void start();

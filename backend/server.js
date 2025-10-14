import dotenv from 'dotenv';
import http from 'http';

import { createApp } from './src/app.js';
import { connectDatabase, disconnectDatabase, databaseState } from './src/db/connection.js';
import { seedInitialData } from './src/db/seed.js';

dotenv.config();

const PORT = Number(process.env.PORT || 8085);
const DB_NAME = process.env.MONGODB_DB || 'coderonin';
// Use host-only URI by default; db is provided via DB_NAME
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';

async function bootstrap() {
  try {
    await connectDatabase({ uri: MONGODB_URI, dbName: DB_NAME });
    await seedInitialData();

    const app = createApp();
    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`codeRonin API ready on http://localhost:${PORT}`);
      const db = databaseState();
      if (!db.ready || db.mode !== 'external') {
        console.warn('Database is not ready or not external.');
      }
    });

    const shutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(async (err) => {
        if (err) {
          console.error('Error closing HTTP server', err);
          process.exitCode = 1;
        }
        await disconnectDatabase();
        process.exit();
      });
    };

    ['SIGINT', 'SIGTERM'].forEach((signal) => {
      process.on(signal, () => shutdown(signal));
    });
  } catch (err) {
    console.error('Failed to start backend', err);
    process.exit(1);
  }
}

bootstrap();

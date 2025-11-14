import dotenv from 'dotenv';
import http from 'http';

import { createApp } from './src/app.js';
import { connectDatabase, disconnectDatabase, databaseState } from './src/db/connection.js';
import { seedInitialData } from './src/db/seed.js';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL || 'file:./backend/data/coderonin.db';

async function bootstrap() {
  try {
    await connectDatabase({ url: DATABASE_URL });
    await seedInitialData();

    const app = createApp();
    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`codeRonin API ready on http://localhost:${PORT}`);
      const db = databaseState();
      if (!db.ready) {
        console.warn('Database is not ready -- check DATABASE_URL.');
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

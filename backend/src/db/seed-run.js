import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from './connection.js';
import { seedInitialData } from './seed.js';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || 'file:./backend/data/coderonin.db';

async function main() {
  try {
    await connectDatabase({ url: databaseUrl });
    await seedInitialData();
    console.log('Seeding completed. Admin user set to admin / Admin123.');
  } catch (err) {
    console.error('Seed failed', err);
    process.exitCode = 1;
  } finally {
    try {
      await disconnectDatabase();
    } catch {}
  }
}

main();

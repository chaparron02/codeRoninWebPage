import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from './connection.js';
import { seedInitialData } from './seed.js';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const db = process.env.MONGODB_DB || 'coderonin';

async function main() {
  try {
    await connectDatabase({ uri, dbName: db });
    await seedInitialData();
    console.log('Seeding completed. Admin user set to admin / Admin123.');
  } catch (err) {
    console.error('Seed failed', err);
    process.exitCode = 1;
  } finally {
    try { await disconnectDatabase(); } catch {}
  }
}

main();


import fs from 'fs';
import path from 'path';
import { pool } from '../config';

async function runSchema() {
  console.log('🔄 Initializing database schema...');
  try {
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const seedPath = path.join(__dirname, '../db/seed.sql');

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    // Run schema
    console.log('Executing schema.sql...');
    await pool.query(schemaSql);
    console.log('✅ Schema executed successfully.');

    // Run seeds
    console.log('Executing seed.sql...');
    await pool.query(seedSql);
    console.log('✅ Seed data loaded successfully.');

  } catch (error) {
    console.error('❌ Error executing schema/seeds:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('👋 Database connection pool closed.');
  }
}

runSchema();

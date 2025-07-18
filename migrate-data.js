#!/usr/bin/env node

/**
 * Data Migration Script: SQLite to Vercel KV
 * 
 * This script helps migrate data from your existing Kinobi SQLite database
 * to Vercel KV storage for seamless transition.
 * 
 * Usage:
 *   node migrate-data.js path/to/kinobi.db
 * 
 * Prerequisites:
 *   - Install sqlite3: npm install sqlite3
 *   - Set up Vercel KV environment variables
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import Database from 'sqlite3';
import { kv } from '@vercel/kv';

// Vercel KV wrapper with logging
class VercelKV {
  static async set(key, value) {
    console.log(`✅ KV.SET: ${key} => [${JSON.stringify(value).length} bytes]`);
    try {
      await kv.set(key, value);
      return true;
    } catch (error) {
      console.error(`❌ KV.SET failed for ${key}:`, error.message);
      throw error;
    }
  }

  static async get(key) {
    console.log(`🔍 KV.GET: ${key}`);
    try {
      const data = await kv.get(key);
      console.log(`✅ KV.GET success: ${key} => ${data ? 'data found' : 'no data'}`);
      return data;
    } catch (error) {
      console.error(`❌ KV.GET failed for ${key}:`, error.message);
      throw error;
    }
  }
}

function migrateChore(chore) {
  // New Chore structure for the API and frontend
  return {
    id: chore.id,
    name: chore.name,
    icon: chore.icon || '🧼', // Provide a default icon
    cycleDuration: chore.cycleDuration || 24,
    points: chore.points || 10,
    lastCompleted: chore.lastCompleted || null,
    lastTender: chore.lastTender || null, // Field expected by new frontend
    history: chore.history || [], // Field expected by new frontend
  };
}

function migrateTender(tender, tenderScores) {
    const score = tenderScores.find(s => s.name === tender.name);
    return {
        id: tender.id,
        name: tender.name,
        icon: '👤', // Add a default icon
        points: score ? score.totalPoints : 0,
    };
}

function migrateHistory(entry) {
    return {
        id: entry.id,
        chore: entry.chore_id, // Map chore_id to chore for simplicity
        tender: entry.person, // Map person to tender
        timestamp: entry.timestamp,
        points: entry.points || 10, // Add default points if not present
    };
}

function getDefaultConfig() {
  return {
    defaultCycleDuration: 24,
    defaultPoints: 10,
    warningThreshold: 75,
    urgentThreshold: 90,
  };
}

async function migrateData(dbPath) {
  console.log(`🔄 Starting data migration from ${dbPath}...`);

  const db = new Database.Database(dbPath, Database.OPEN_READONLY, (err) => {
    if (err) {
      console.error('❌ Could not connect to database:', err.message);
      process.exit(1);
    }
  });

  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM kinobi_instances", [], async (err, rows) => {
      if (err) {
        console.error('❌ Error reading database:', err.message);
        reject(err);
        return;
      }

      console.log(`📊 Found ${rows.length} instances to migrate`);

      for (const row of rows) {
        try {
          console.log(`\n🏠 Migrating instance: ${row.sync_id}`);

          // Parse existing data
          const tenders = JSON.parse(row.tenders || '[]');
          const tending_log = JSON.parse(row.tending_log || '[]');
          const rawChores = JSON.parse(row.chores || '[]');
          const config = row.config ? JSON.parse(row.config) : getDefaultConfig();
          const tender_scores = JSON.parse(row.tender_scores || '[]' );

          // Data Transformation
          const newChores = rawChores.map(migrateChore);
          const newTenders = tenders.map(tender => migrateTender(tender, tender_scores));
          const newHistory = tending_log.map(migrateHistory);
          const newConfig = {
              warningThreshold: config.warningThreshold || 75,
              dangerThreshold: config.urgentThreshold || 90,
              pointCycle: 24,
          };

          // Create the instance data structure for KV
          const instanceData = {
            chores: newChores,
            tenders: newTenders,
            history: newHistory,
            config: newConfig,
          };

          // Store in Vercel KV
          const kvKey = `kinobi:${row.sync_id}`;
          await VercelKV.set(kvKey, instanceData);

          console.log(`  ✅ Migrated ${newChores.length} chores`);
          console.log(`  ✅ Migrated ${newTenders.length} tenders`);
          console.log(`  ✅ Migrated ${newHistory.length} history entries`);
          console.log(`  ✅ Stored as ${kvKey}`);

        } catch (error) {
          console.error(`  ❌ Failed to migrate ${row.sync_id}:`, error.message);
        }
      }

      db.close();
      resolve();
    });
  });
}

async function main() {
  const dbPath = process.argv[2];

  if (!dbPath) {
    console.log(`
📋 Kinobi Data Migration Tool

This script helps you migrate your existing Kinobi data from SQLite to Vercel KV.

Usage:
  node migrate-data.js path/to/kinobi.db

Example:
  node migrate-data.js ../kinobi.db

Before running:
1. Install sqlite3: npm install sqlite3
2. Set up your Vercel KV environment variables
3. Replace MockKV with actual Vercel KV calls in this script

The script will:
✅ Read all instances from your SQLite database
✅ Migrate chores to the new format with cycle/points data
✅ Transfer all tenders, history, and configuration
✅ Store everything in Vercel KV with the same sync IDs
    `);
    process.exit(0);
  }

  try {
    await migrateData(dbPath);
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Update this script to use real Vercel KV calls');
    console.log('2. Deploy your Vercel application');
    console.log('3. Test that all data is accessible');
    console.log('4. Update your bookmarks to the new Vercel URL');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main(); 
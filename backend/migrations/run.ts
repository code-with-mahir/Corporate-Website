import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

dotenv.config();

interface Migration {
  filename: string;
  sql: string;
}

async function runMigrations(): Promise<void> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Starting database migrations...\n');

    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established\n');

    // Read all .sql files from migrations directory
    const migrationsDir = __dirname;
    const files = await readdir(migrationsDir);
    
    const sqlFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort((a, b) => {
        // Sort by numerical prefix (e.g., 001_, 002_)
        const numA = parseInt(a.split('_')[0]);
        const numB = parseInt(b.split('_')[0]);
        return numA - numB;
      });

    if (sqlFiles.length === 0) {
      console.log('⚠️  No migration files found');
      return;
    }

    console.log(`📁 Found ${sqlFiles.length} migration file(s)\n`);

    // Read and prepare migrations
    const migrations: Migration[] = [];
    for (const filename of sqlFiles) {
      const filepath = join(migrationsDir, filename);
      const sql = await readFile(filepath, 'utf-8');
      migrations.push({ filename, sql });
    }

    // Execute migrations in order
    let successCount = 0;
    let failureCount = 0;

    for (const migration of migrations) {
      try {
        console.log(`⏳ Running: ${migration.filename}`);
        await pool.query(migration.sql);
        console.log(`✅ Success: ${migration.filename}\n`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed: ${migration.filename}`);
        if (error instanceof Error) {
          console.error(`   Error: ${error.message}\n`);
        }
        failureCount++;
        
        // Continue with remaining migrations instead of failing completely
        // This allows idempotent migrations to succeed
      }
    }

    // Summary
    console.log('═'.repeat(50));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log(`   📁 Total: ${migrations.length}`);
    console.log('═'.repeat(50));

    if (failureCount > 0) {
      console.log('\n⚠️  Some migrations failed. Please check the errors above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All migrations completed successfully!');
    }

  } catch (error) {
    console.error('\n💥 Fatal error during migration process:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    }
    process.exit(1);
  } finally {
    // Always close the pool
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('\n💥 Unhandled promise rejection:', error);
  process.exit(1);
});

// Run migrations
runMigrations().catch((error) => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});

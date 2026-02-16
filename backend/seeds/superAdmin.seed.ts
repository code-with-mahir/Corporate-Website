import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

dotenv.config();

const BCRYPT_ROUNDS = 12;

interface SuperAdmin {
  id: string;
  email: string;
  created_at: Date;
}

async function seedSuperAdmin(): Promise<void> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Starting super admin seed...\n');

    // Validate environment variables
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error(
        'Missing required environment variables: SUPER_ADMIN_EMAIL and/or SUPER_ADMIN_PASSWORD'
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`Invalid email format: ${email}`);
    }

    // Validate password strength
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    console.log(`📧 Email: ${email}`);
    console.log(`🔒 Password: ${'*'.repeat(password.length)}\n`);

    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established\n');

    // Check if super admin already exists
    console.log('🔍 Checking if super admin already exists...');
    const checkQuery = 'SELECT id, email, created_at FROM super_admins WHERE email = $1';
    const checkResult = await pool.query<SuperAdmin>(checkQuery, [email]);

    if (checkResult.rows.length > 0) {
      const existingAdmin = checkResult.rows[0];
      console.log('⚠️  Super admin already exists!');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   ID: ${existingAdmin.id}`);
      console.log(`   Created: ${existingAdmin.created_at}`);
      console.log('\n✨ No changes made.');
      return;
    }

    console.log('✅ No existing super admin found\n');

    // Hash the password
    console.log(`🔐 Hashing password (${BCRYPT_ROUNDS} rounds)...`);
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    console.log('✅ Password hashed successfully\n');

    // Insert super admin
    console.log('💾 Inserting super admin into database...');
    const insertQuery = `
      INSERT INTO super_admins (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email, created_at
    `;
    const insertResult = await pool.query<SuperAdmin>(insertQuery, [email, passwordHash]);
    const newAdmin = insertResult.rows[0];

    console.log('✅ Super admin created successfully!\n');
    console.log('═'.repeat(50));
    console.log('📊 Super Admin Details:');
    console.log(`   Email: ${newAdmin.email}`);
    console.log(`   ID: ${newAdmin.id}`);
    console.log(`   Created: ${newAdmin.created_at}`);
    console.log('═'.repeat(50));
    console.log('\n🎉 Super admin seed completed successfully!');

  } catch (error) {
    console.error('\n💥 Error during super admin seed:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if (error.stack && process.env.NODE_ENV === 'development') {
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

// Run seed
seedSuperAdmin().catch((error) => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});

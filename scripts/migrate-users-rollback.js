/**
 * USER MIGRATION ROLLBACK SCRIPT
 * Rollback migration by deleting users created during migration
 * 
 * ⚠️ WARNING: This script DELETES users from users collection
 * Only run this if migration failed and you need to revert
 * 
 * Usage:
 *   node scripts/migrate-users-rollback.js
 * 
 * This script reads migration log file and deletes users that were migrated
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const UserSchema = new mongoose.Schema({}, { collection: 'users', strict: false });
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function rollback() {
  try {
    console.log('═══════════════════════════════════════════════════');
    console.log('USER MIGRATION ROLLBACK');
    console.log('⚠️  WARNING: This will DELETE users from users collection');
    console.log('═══════════════════════════════════════════════════');

    // Find latest migration log
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) {
      console.error('❌ Logs directory not found');
      process.exit(1);
    }

    const logFiles = fs.readdirSync(logDir)
      .filter(f => f.startsWith('migration-') && f.endsWith('.log'))
      .sort()
      .reverse();

    if (logFiles.length === 0) {
      console.error('❌ No migration log files found');
      process.exit(1);
    }

    const latestLog = path.join(logDir, logFiles[0]);
    console.log(`📄 Reading log file: ${latestLog}`);

    // Parse log file to find migrated users
    const logContent = fs.readFileSync(latestLog, 'utf-8');
    const migratedEmails = [];
    const lines = logContent.split('\n');
    
    for (const line of lines) {
      // Match pattern: "ADMIN email - MIGRATED → User _id" or "CUSTOMER email - MIGRATED → User _id"
      const match = line.match(/(ADMIN|CUSTOMER)\s+([^\s]+)\s+-\s+MIGRATED\s+→\s+User\s+([a-f0-9]{24})/i);
      if (match) {
        const email = match[2];
        const userId = match[3];
        migratedEmails.push({ email, userId, source: match[1] });
      }
    }

    if (migratedEmails.length === 0) {
      console.log('ℹ️  No migrated users found in log file');
      return;
    }

    console.log(`\n📊 Found ${migratedEmails.length} migrated users:`);
    migratedEmails.forEach(({ email, userId, source }) => {
      console.log(`   ${source}: ${email} → ${userId}`);
    });

    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI not found');
      process.exit(1);
    }

    let uri = MONGODB_URI;
    const uriParts = uri.split('?');
    const baseUri = uriParts[0];
    const queryString = uriParts[1] || '';
    if (baseUri.endsWith('/') || !baseUri.match(/\/[^\/]+$/)) {
      uri = baseUri.replace(/\/$/, '') + '/pj_website_ban_hoa' + (queryString ? '?' + queryString : '');
    }

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Confirm before deletion
    console.log('\n⚠️  ROLLBACK WILL DELETE THESE USERS FROM users COLLECTION');
    console.log('   Original collections (admins, customers) are NOT affected');
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      readline.question('   Type "ROLLBACK" to confirm: ', resolve);
    });
    readline.close();

    if (answer !== 'ROLLBACK') {
      console.log('❌ Rollback cancelled');
      await mongoose.disconnect();
      return;
    }

    // Delete migrated users
    console.log('\n🔄 Deleting migrated users...');
    let deleted = 0;
    let errors = 0;

    for (const { email, userId } of migratedEmails) {
      try {
        const result = await User.deleteOne({ _id: userId });
        if (result.deletedCount > 0) {
          deleted++;
          console.log(`   ✅ Deleted: ${email} (${userId})`);
        } else {
          console.log(`   ⚠️  Not found: ${email} (${userId})`);
        }
      } catch (error) {
        errors++;
        console.error(`   ❌ Error deleting ${email}: ${error.message}`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('ROLLBACK SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ Deleted: ${deleted} users`);
    console.log(`⚠️  Not found: ${migratedEmails.length - deleted - errors} users`);
    console.log(`❌ Errors: ${errors}`);

    if (deleted > 0) {
      console.log('\n✅ Rollback completed');
      console.log('   Original collections (admins, customers) remain unchanged');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error(`\n❌ FATAL ERROR: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

rollback();

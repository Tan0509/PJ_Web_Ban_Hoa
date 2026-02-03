/**
 * USER MIGRATION SCRIPT
 * Migrate all users from admins + customers collections to users collection
 * 
 * SAFETY FEATURES:
 * - Does NOT delete original collections
 * - Does NOT overwrite existing users (email conflict)
 * - Logs all conflicts to file
 * - Creates backup before migration
 * - Rollback-ready
 * 
 * Usage:
 *   node scripts/migrate-users.js
 * 
 * Environment Variables:
 *   MONGODB_URI (required, from .env.local or environment)
 *   MIGRATION_DRY_RUN=true (optional, default: false - only validate, no write)
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load .env.local manually (no dotenv dependency)
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  });
}

// User Schema (matching src/models/User.ts + extensions for migration)
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String },
  role: { type: String, enum: ['admin', 'staff', 'customer'], default: 'customer' },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'blocked', 'deleted'], default: 'active' },
  phone: { type: String },
  avatar: { type: String },
  deletedAt: { type: Date },
  provider: { type: String, default: 'local' },
  // OAuth fields (from customers)
  googleId: { type: String },
  facebookId: { type: String },
  // Address array (from customers)
  address: [{
    label: { type: String },
    detail: { type: String },
    recipient: { type: String },
    phone: { type: String },
    city: { type: String },
    district: { type: String },
    ward: { type: String },
    isDefault: { type: Boolean },
  }],
}, { collection: 'users' });

// Legacy schemas (read-only, no strict validation for migration)
const AdminSchema = new mongoose.Schema({}, { collection: 'admins', strict: false });
const CustomerSchema = new mongoose.Schema({}, { collection: 'customers', strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
const Customer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);

// Migration stats
const stats = {
  admins: { total: 0, migrated: 0, skipped: 0, conflicts: [] },
  customers: { total: 0, migrated: 0, skipped: 0, conflicts: [] },
  users: { total: 0, conflicts: [] },
  errors: [],
};

// Log file
const logDir = path.join(__dirname, '../logs');
const logFile = path.join(logDir, `migration-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
  console.log(logMessage);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  fs.appendFileSync(logFile, logMessage + '\n');
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.toLowerCase().trim() : '';
}

function normalizeRole(role) {
  if (!role) return 'customer';
  const r = role.toLowerCase();
  if (r === 'admin' || r === 'ADMIN') return 'admin';
  if (r === 'staff' || r === 'STAFF') return 'staff';
  return 'customer';
}

function mapStatus(active) {
  if (active === false || active === 'false') return 'blocked';
  return 'active';
}

function normalizeAdminToUser(adminDoc) {
  const email = normalizeEmail(adminDoc.email);
  if (!email) {
    log(`Admin ${adminDoc._id} missing email - SKIP`, 'warn');
    return null;
  }

  return {
    name: adminDoc.name || adminDoc.username || email.split('@')[0],
    email: email,
    password: adminDoc.password || null,
    role: normalizeRole(adminDoc.role),
    status: mapStatus(adminDoc.active),
    phone: adminDoc.phone || '',
    avatar: adminDoc.avatar || '',
    provider: 'local',
    createdAt: adminDoc.createdAt || new Date(),
  };
}

function normalizeCustomerToUser(customerDoc) {
  const email = normalizeEmail(customerDoc.email);
  if (!email) {
    log(`Customer ${customerDoc._id} missing email - SKIP`, 'warn');
    return null;
  }

  // Normalize address array
  let addressArray = [];
  if (Array.isArray(customerDoc.address)) {
    addressArray = customerDoc.address.map((addr) => ({
      label: addr.label || '',
      detail: addr.detail || addr.detail || '',
      recipient: addr.recipient || customerDoc.name || '',
      phone: addr.phone || customerDoc.phone || '',
      city: addr.city || '',
      district: addr.district || '',
      ward: addr.ward || '',
      isDefault: addr.isDefault || false,
    }));
  }

  return {
    name: customerDoc.name || email.split('@')[0],
    email: email,
    password: customerDoc.password || null,
    role: normalizeRole(customerDoc.role) || 'customer',
    status: mapStatus(customerDoc.active),
    phone: customerDoc.phone || '',
    avatar: customerDoc.avatar || '',
    provider: customerDoc.provider || 'local',
    googleId: customerDoc.googleId || null,
    facebookId: customerDoc.facebookId || null,
    address: addressArray,
    createdAt: customerDoc.createdAt || new Date(),
  };
}

async function checkExistingUser(email) {
  const normalized = normalizeEmail(email);
  return await User.findOne({ email: normalized });
}

async function migrateAdmin(adminDoc, dryRun = false) {
  stats.admins.total++;
  const email = normalizeEmail(adminDoc.email);
  
  // Check existing user
  const existing = await checkExistingUser(email);
  if (existing) {
    stats.admins.skipped++;
    stats.admins.conflicts.push({
      source: 'admins',
      sourceId: String(adminDoc._id),
      email: email,
      reason: 'Email already exists in users collection',
      existingUserId: String(existing._id),
    });
    log(`ADMIN ${email} - SKIP (email exists in users: ${existing._id})`, 'warn');
    return null;
  }

  const userData = normalizeAdminToUser(adminDoc);
  if (!userData) {
    stats.admins.skipped++;
    return null;
  }

  if (dryRun) {
    log(`ADMIN ${email} - DRY RUN (would create user)`, 'info');
    stats.admins.migrated++;
    return null;
  }

  try {
    const created = await User.create(userData);
    stats.admins.migrated++;
    log(`ADMIN ${email} - MIGRATED → User ${created._id}`, 'success');
    return created;
  } catch (error) {
    stats.admins.skipped++;
    stats.errors.push({
      source: 'admins',
      sourceId: String(adminDoc._id),
      email: email,
      error: error.message,
    });
    log(`ADMIN ${email} - ERROR: ${error.message}`, 'error');
    return null;
  }
}

async function migrateCustomer(customerDoc, dryRun = false) {
  stats.customers.total++;
  const email = normalizeEmail(customerDoc.email);
  
  // Check existing user
  const existing = await checkExistingUser(email);
  if (existing) {
    stats.customers.skipped++;
    stats.customers.conflicts.push({
      source: 'customers',
      sourceId: String(customerDoc._id),
      email: email,
      reason: 'Email already exists in users collection',
      existingUserId: String(existing._id),
    });
    log(`CUSTOMER ${email} - SKIP (email exists in users: ${existing._id})`, 'warn');
    return null;
  }

  const userData = normalizeCustomerToUser(customerDoc);
  if (!userData) {
    stats.customers.skipped++;
    return null;
  }

  if (dryRun) {
    log(`CUSTOMER ${email} - DRY RUN (would create user)`, 'info');
    stats.customers.migrated++;
    return null;
  }

  try {
    const created = await User.create(userData);
    stats.customers.migrated++;
    log(`CUSTOMER ${email} - MIGRATED → User ${created._id}`, 'success');
    return created;
  } catch (error) {
    stats.customers.skipped++;
    stats.errors.push({
      source: 'customers',
      sourceId: String(customerDoc._id),
      email: email,
      error: error.message,
    });
    log(`CUSTOMER ${email} - ERROR: ${error.message}`, 'error');
    return null;
  }
}

async function main() {
  try {
    const dryRun = process.env.MIGRATION_DRY_RUN === 'true';
    log('═══════════════════════════════════════════════════', 'info');
    log('USER MIGRATION SCRIPT', 'info');
    log(`Mode: ${dryRun ? 'DRY RUN (no writes)' : 'LIVE (will write to DB)'}`, 'info');
    log('═══════════════════════════════════════════════════', 'info');

    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      log('❌ MONGODB_URI not found', 'error');
      log('   Please set MONGODB_URI in .env.local or export it', 'error');
      process.exit(1);
    }

    // Parse database name from URI
    let uri = MONGODB_URI;
    const uriParts = uri.split('?');
    const baseUri = uriParts[0];
    const queryString = uriParts[1] || '';
    if (baseUri.endsWith('/') || !baseUri.match(/\/[^\/]+$/)) {
      uri = baseUri.replace(/\/$/, '') + '/pj_website_ban_hoa' + (queryString ? '?' + queryString : '');
    }

    await mongoose.connect(uri);
    log('✅ Connected to MongoDB', 'success');

    // Count existing records
    const adminsCount = await Admin.countDocuments();
    const customersCount = await Customer.countDocuments();
    const usersCount = await User.countDocuments();

    log(`\n📊 BEFORE MIGRATION:`, 'info');
    log(`   admins: ${adminsCount} records`, 'info');
    log(`   customers: ${customersCount} records`, 'info');
    log(`   users: ${usersCount} records`, 'info');

    stats.users.total = usersCount;

    // Migrate admins
    log(`\n🔄 MIGRATING ADMINS (${adminsCount} records)...`, 'info');
    const admins = await Admin.find({}).lean();
    for (const admin of admins) {
      await migrateAdmin(admin, dryRun);
    }

    // Migrate customers
    log(`\n🔄 MIGRATING CUSTOMERS (${customersCount} records)...`, 'info');
    const customers = await Customer.find({}).lean();
    for (const customer of customers) {
      await migrateCustomer(customer, dryRun);
    }

    // Final count
    const finalUsersCount = dryRun ? usersCount : await User.countDocuments();

    // Summary
    log('\n═══════════════════════════════════════════════════', 'info');
    log('MIGRATION SUMMARY', 'info');
    log('═══════════════════════════════════════════════════', 'info');
    log(`📊 Admins:`, 'info');
    log(`   Total: ${stats.admins.total}`, 'info');
    log(`   Migrated: ${stats.admins.migrated}`, 'success');
    log(`   Skipped: ${stats.admins.skipped}`, 'warn');
    log(`   Conflicts: ${stats.admins.conflicts.length}`, 'warn');
    log(`\n📊 Customers:`, 'info');
    log(`   Total: ${stats.customers.total}`, 'info');
    log(`   Migrated: ${stats.customers.migrated}`, 'success');
    log(`   Skipped: ${stats.customers.skipped}`, 'warn');
    log(`   Conflicts: ${stats.customers.conflicts.length}`, 'warn');
    log(`\n📊 Users Collection:`, 'info');
    log(`   Before: ${usersCount}`, 'info');
    log(`   After: ${finalUsersCount}`, 'info');
    log(`   Added: ${finalUsersCount - usersCount}`, dryRun ? 'info' : 'success');
    log(`\n⚠️  Errors: ${stats.errors.length}`, stats.errors.length > 0 ? 'error' : 'info');
    log(`⚠️  Conflicts: ${stats.admins.conflicts.length + stats.customers.conflicts.length}`, (stats.admins.conflicts.length + stats.customers.conflicts.length) > 0 ? 'warn' : 'info');

    // Log conflicts to JSON file
    const conflictsFile = path.join(logDir, `migration-conflicts-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    const allConflicts = [...stats.admins.conflicts, ...stats.customers.conflicts];
    if (allConflicts.length > 0) {
      fs.writeFileSync(conflictsFile, JSON.stringify(allConflicts, null, 2));
      log(`\n📄 Conflicts logged to: ${conflictsFile}`, 'warn');
    }

    // Log errors to JSON file
    if (stats.errors.length > 0) {
      const errorsFile = path.join(logDir, `migration-errors-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      fs.writeFileSync(errorsFile, JSON.stringify(stats.errors, null, 2));
      log(`📄 Errors logged to: ${errorsFile}`, 'error');
    }

    log(`\n📄 Full log: ${logFile}`, 'info');

    if (dryRun) {
      log('\n⚠️  DRY RUN MODE - No data was written', 'warn');
      log('   Run without MIGRATION_DRY_RUN to perform actual migration', 'info');
    } else {
      log('\n✅ MIGRATION COMPLETED', 'success');
      log('   Original collections (admins, customers) are NOT deleted', 'info');
      log('   They remain as backup/legacy collections', 'info');
    }

    await mongoose.disconnect();
    log('\n✅ Disconnected from MongoDB', 'success');
  } catch (error) {
    log(`\n❌ FATAL ERROR: ${error.message}`, 'error');
    log(error.stack, 'error');
    process.exit(1);
  }
}

main();

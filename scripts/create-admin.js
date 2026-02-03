/**
 * Script to create admin user in MongoDB
 * Usage: node scripts/create-admin.js
 * 
 * This script creates an admin user with:
 * - role: 'admin'
 * - status: 'active'
 * - provider: 'local'
 * - password: hashed with bcrypt
 */

// Load environment variables from .env.local
// Note: If running outside Next.js, you may need to install dotenv: npm install dotenv
// Then uncomment: require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema (matching src/models/User.ts)
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
}, { collection: 'users' });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function createAdmin() {
  try {
    // Connect to MongoDB
    // Read from environment variable (set in .env.local or export before running)
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI not found');
      console.error('   Please set MONGODB_URI in .env.local or export it:');
      console.error('   export MONGODB_URI="mongodb+srv://tanbanhoa:050997@pj-website-ban-hoa.fdeudnd.mongodb.net/?appName=PJ-Website-Ban-Hoa"');
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
    console.log('✅ Connected to MongoDB');

    // Admin credentials (you can modify these)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@flower-shop.com.vn';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!@#';
    const adminName = process.env.ADMIN_NAME || 'Quản trị viên';

    // Check if admin already exists
    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      console.log(`⚠️  Admin with email ${adminEmail} already exists`);
      console.log('   If you want to update password, delete the user first or use update script');
      await mongoose.disconnect();
      return;
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    console.log('✅ Password hashed');

    // Create admin user
    const admin = await User.create({
      name: adminName,
      email: adminEmail.toLowerCase().trim(),
      password: hashedPassword,
      role: 'admin',
      status: 'active',
      provider: 'local',
    });

    console.log('\n✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', admin.email);
    console.log('👤 Name:', admin.name);
    console.log('🔑 Role:', admin.role);
    console.log('✅ Status:', admin.status);
    console.log('🔐 Password:', adminPassword, '(plain text - save this!)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: Save the password above. It will not be shown again.');
    console.log('   You can now login at /auth/signin with these credentials.');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    if (error.code === 11000) {
      console.error('   Email already exists in database');
    }
    process.exit(1);
  }
}

createAdmin();

/**
 * Migrate product images from base64 (MongoDB) to Cloudinary URLs.
 * - Connects to MongoDB (MONGODB_URI from .env.local).
 * - Finds all products with images.
 * - For each image: if base64 → upload to Cloudinary, replace with URL.
 * - Updates each product's images array in MongoDB.
 *
 * Usage: node scripts/migrate-images-to-cloudinary.js
 * Or:    npm run migrate-images
 *
 * Environment (from .env.local): MONGODB_URI, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

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

// Avoid Cloudinary SDK auto-parsing CLOUDINARY_URL if it's a placeholder
if (process.env.CLOUDINARY_URL && (process.env.CLOUDINARY_URL.includes('<') || process.env.CLOUDINARY_URL.includes('>'))) {
  delete process.env.CLOUDINARY_URL;
}

const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadBase64ToCloudinary(base64String, folder = 'products') {
  try {
    const result = await cloudinary.uploader.upload(base64String, {
      folder,
      resource_type: 'auto',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });
    return result.secure_url;
  } catch (error) {
    console.error('Upload error:', error.message);
    return null;
  }
}

async function migrateProducts() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('❌ MONGODB_URI not set. Add it to .env.local');
      process.exit(1);
    }
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('❌ CLOUDINARY_* env vars not set. Add them to .env.local');
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
    const products = await Product.find({ images: { $exists: true, $ne: [] } });

    console.log(`📦 Found ${products.length} products with images`);

    let migrated = 0;
    let skipped = 0;

    for (const product of products) {
      const images = product.images || [];
      const newImages = [];

      console.log(`\n🔄 Processing: ${product.name} (${images.length} images)`);

      for (let i = 0; i < images.length; i++) {
        const img = images[i];

        if (img.startsWith('https://res.cloudinary.com')) {
          console.log(`  ⏭️  Image ${i + 1} already on Cloudinary`);
          newImages.push(img);
          skipped++;
          continue;
        }

        if (!img.startsWith('data:image')) {
          console.log(`  ⚠️  Image ${i + 1} not base64, skipping`);
          newImages.push(img);
          skipped++;
          continue;
        }

        console.log(`  ⬆️  Uploading image ${i + 1}...`);
        const cloudinaryUrl = await uploadBase64ToCloudinary(img, 'products');

        if (cloudinaryUrl) {
          console.log(`  ✅ Uploaded: ${cloudinaryUrl}`);
          newImages.push(cloudinaryUrl);
          migrated++;
        } else {
          console.log(`  ❌ Failed to upload image ${i + 1}, keeping original`);
          newImages.push(img); // keep original base64
        }
      }

      await Product.updateOne({ _id: product._id }, { $set: { images: newImages } });
      console.log(`✅ Updated product: ${product.name}`);
    }

    console.log(`\n🎉 Migration complete!`);
    console.log(`   Migrated: ${migrated} images`);
    console.log(`   Skipped: ${skipped} images`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrateProducts();

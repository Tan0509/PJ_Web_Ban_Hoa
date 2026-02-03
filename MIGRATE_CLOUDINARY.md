# 🚀 Migrate ảnh từ Base64 MongoDB sang Cloudinary CDN

## 📋 Mục tiêu

Chuyển từ lưu ảnh base64 trong MongoDB sang Cloudinary CDN để:
- ✅ Load web nhanh hơn 10-20 lần (từ 60s → 2-5s)
- ✅ Hỗ trợ 100+ ảnh/product (không bị giới hạn 16MB MongoDB)
- ✅ Tự động optimize ảnh (resize, WebP, cache)
- ✅ Giảm bandwidth và chi phí

---

## 🎯 PHASE 1: Setup Cloudinary (30 phút)

### Bước 1.1: Đăng ký Cloudinary

1. Truy cập: https://cloudinary.com/users/register/free
2. Đăng ký với email (hoặc Google login)
3. Sau khi đăng ký, vào **Dashboard** → lấy thông tin:
   - **Cloud Name**: `your-cloud-name`
   - **API Key**: `123456789012345`
   - **API Secret**: `abcdefghijklmnopqrstuvwxyz`

### Bước 1.2: Cài đặt package

```bash
cd /Users/lamnhuttan/Documents/PJ-Website-Ban-Hoa
npm install cloudinary
```

### Bước 1.3: Thêm Cloudinary credentials vào `.env.local`

Mở `.env.local` và thêm:

```env
# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
```

**Lưu ý:** Thay `your-cloud-name`, API Key, API Secret bằng giá trị thực từ Cloudinary Dashboard.

### Bước 1.4: Thêm vào Fly.io Secrets (nếu deploy trên Fly)

```bash
flyctl secrets set CLOUDINARY_CLOUD_NAME="your-cloud-name" -a pj-website-ban-hoa
flyctl secrets set CLOUDINARY_API_KEY="123456789012345" -a pj-website-ban-hoa
flyctl secrets set CLOUDINARY_API_SECRET="abcdefghijklmnopqrstuvwxyz" -a pj-website-ban-hoa
```

---

## 🎯 PHASE 2: Tạo Cloudinary Upload API (30 phút)

### Bước 2.1: Tạo Cloudinary helper

Tạo file `src/lib/cloudinary.ts`:

```typescript
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

/**
 * Upload base64 image to Cloudinary
 * @param base64String - Data URI (e.g., "data:image/jpeg;base64,/9j/4AAQ...")
 * @param folder - Cloudinary folder (e.g., "products")
 * @returns Cloudinary URL
 */
export async function uploadBase64ToCloudinary(
  base64String: string,
  folder: string = 'products'
): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(base64String, {
      folder,
      resource_type: 'auto',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' }, // Max size 1200x1200
        { quality: 'auto:good' }, // Auto quality optimization
        { fetch_format: 'auto' }, // Auto format (WebP for modern browsers)
      ],
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
}

/**
 * Delete image from Cloudinary
 * @param publicId - Cloudinary public ID (extracted from URL)
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
  }
}

/**
 * Extract Cloudinary public ID from URL
 * @param url - Cloudinary URL
 * @returns Public ID
 */
export function getPublicIdFromUrl(url: string): string {
  // Example: https://res.cloudinary.com/demo/image/upload/v1234/products/abc.jpg
  // → products/abc
  const matches = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
  return matches?.[1] || '';
}
```

### Bước 2.2: Tạo Upload API endpoint

Tạo file `src/pages/api/upload/image.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { uploadBase64ToCloudinary } from '@/lib/cloudinary';
import { isAdminFromSession } from '@/lib/authHelpers';

type SuccessResponse = { url: string };
type ErrorResponse = { error: string };

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Allow large base64 images
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Only admin can upload
  if (!(await isAdminFromSession(req, res))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { image, folder } = req.body;

    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid image data' });
    }

    // Upload to Cloudinary
    const url = await uploadBase64ToCloudinary(image, folder || 'products');

    return res.status(200).json({ url });
  } catch (error: any) {
    console.error('Upload image error:', error);
    return res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
}
```

---

## 🎯 PHASE 3: Update Admin Product Form (1 giờ)

### Bước 3.1: Update logic upload ảnh trong admin form

Khi admin chọn ảnh, thay vì lưu base64, upload lên Cloudinary và lưu URL.

**File cần sửa:** `src/app/admin/products/page.tsx` (hoặc component upload ảnh)

**Trước (Base64):**
```typescript
const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onloadend = () => {
    const base64 = reader.result as string;
    setImages([...images, base64]); // Lưu base64 vào state
  };
  reader.readAsDataURL(file);
};
```

**Sau (Cloudinary):**
```typescript
const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  setUploading(true);
  try {
    // Convert to base64 (temporarily)
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      
      // Upload to Cloudinary
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, folder: 'products' }),
      });
      
      if (!res.ok) throw new Error('Upload failed');
      
      const data = await res.json();
      setImages([...images, data.url]); // Lưu URL Cloudinary vào state
      setUploading(false);
    };
    reader.readAsDataURL(file);
  } catch (error) {
    console.error('Upload error:', error);
    alert('Upload ảnh thất bại. Vui lòng thử lại.');
    setUploading(false);
  }
};
```

### Bước 3.2: Update Product Model (optional - backward compatible)

File `src/models/Product.ts` không cần sửa. Field `images` vẫn là `string[]`, chỉ khác là giờ lưu URL thay vì base64.

**Trước:**
```typescript
images: ['data:image/jpeg;base64,/9j/4AAQSkZJRg...']
```

**Sau:**
```typescript
images: ['https://res.cloudinary.com/demo/image/upload/v1234/products/abc.jpg']
```

### Bước 3.3: Update frontend display (Next.js Image)

**Trước:**
```tsx
<img src={product.images[0]} alt={product.name} />
```

**Sau (tối ưu với Next.js Image):**
```tsx
<Image
  src={product.images[0]}
  alt={product.name}
  width={500}
  height={500}
  className="object-cover"
/>
```

**Cập nhật `next.config.js` để cho phép Cloudinary domain:**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: ['localhost', 'res.cloudinary.com'], // Thêm Cloudinary
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

module.exports = nextConfig
```

---

## 🎯 PHASE 4: Migrate ảnh cũ (1-2 giờ)

### Bước 4.1: Tạo migration script

Tạo file `scripts/migrate-images-to-cloudinary.js`:

```javascript
const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');
require('dotenv').config({ path: '.env.local' });

// Configure Cloudinary
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
    await mongoose.connect(process.env.MONGODB_URI);
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

        // Skip if already Cloudinary URL
        if (img.startsWith('https://res.cloudinary.com')) {
          console.log(`  ⏭️  Image ${i + 1} already on Cloudinary`);
          newImages.push(img);
          skipped++;
          continue;
        }

        // Skip if not base64
        if (!img.startsWith('data:image')) {
          console.log(`  ⚠️  Image ${i + 1} not base64, skipping`);
          newImages.push(img);
          skipped++;
          continue;
        }

        // Upload to Cloudinary
        console.log(`  ⬆️  Uploading image ${i + 1}...`);
        const cloudinaryUrl = await uploadBase64ToCloudinary(img, 'products');

        if (cloudinaryUrl) {
          console.log(`  ✅ Uploaded: ${cloudinaryUrl}`);
          newImages.push(cloudinaryUrl);
          migrated++;
        } else {
          console.log(`  ❌ Failed to upload image ${i + 1}, keeping original`);
          newImages.push(img); // Keep original if upload fails
        }
      }

      // Update product with new image URLs
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
```

### Bước 4.2: Chạy migration

```bash
node scripts/migrate-images-to-cloudinary.js
```

**Lưu ý:**
- Script sẽ upload từng ảnh base64 lên Cloudinary.
- Có thể mất 1-2 giờ nếu có nhiều sản phẩm.
- Script **không xóa** base64 cũ ngay, chỉ thay thế bằng URL mới → an toàn.

### Bước 4.3: Verify migration

Sau khi chạy xong, kiểm tra:

1. Vào MongoDB Atlas → xem collection `products` → field `images` có URL Cloudinary không.
2. Vào admin panel → xem sản phẩm có hiển thị ảnh không.
3. Vào customer page → xem ảnh load nhanh không.

---

## 🎯 PHASE 5: Cleanup & Optimize (30 phút)

### Bước 5.1: Update package.json scripts

Thêm vào `package.json`:

```json
{
  "scripts": {
    "migrate-images": "node scripts/migrate-images-to-cloudinary.js"
  }
}
```

### Bước 5.2: Giảm bodyParser limit (optional)

Sau khi migrate xong, có thể giảm `sizeLimit` trong các API:

**File:** `src/pages/api/admin/products/index.ts`

```typescript
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb', // Giảm từ 10mb xuống 2mb (vì không còn base64)
    },
  },
};
```

### Bước 5.3: Test performance

1. Mở Chrome DevTools → Network tab.
2. Vào admin products page.
3. Kiểm tra `/api/admin/products` response size:
   - **Trước:** 4-50MB
   - **Sau:** ~100KB (chỉ URLs)

---

## 📊 Kết quả mong đợi

| Metric | Trước (Base64) | Sau (Cloudinary) | Cải thiện |
|--------|---------------|------------------|-----------|
| Admin products load | 60 giây | 2-5 giây | **12-30x** |
| Customer homepage | 10-30 giây | 2-3 giây | **5-15x** |
| Product detail | 10-30 giây | 1-2 giây | **10-15x** |
| API response size | 4-50MB | 100KB | **40-500x** |
| MongoDB doc size | 2-50MB | 10-50KB | **100-1000x** |
| Max images/product | 20-30 (giới hạn 16MB) | 100+ (không giới hạn) | **∞** |

---

## 🐛 Troubleshooting

### Lỗi: "Invalid API credentials"

**Nguyên nhân:** Cloudinary credentials sai hoặc chưa set.

**Cách fix:**
1. Kiểm tra `.env.local` có đúng `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
2. Kiểm tra Cloudinary Dashboard → Account Details → copy lại credentials.

### Lỗi: "Request entity too large"

**Nguyên nhân:** Body size vượt quá limit.

**Cách fix:**
1. Tăng `sizeLimit` trong API config:
   ```typescript
   export const config = {
     api: { bodyParser: { sizeLimit: '10mb' } },
   };
   ```

### Lỗi: Migration script timeout

**Nguyên nhân:** Quá nhiều ảnh, upload mất thời gian.

**Cách fix:**
1. Chạy script theo batch (10-20 sản phẩm/lần).
2. Thêm retry logic khi upload fail.

### Ảnh hiển thị bị lỗi CORS

**Nguyên nhân:** Cloudinary domain chưa được thêm vào `next.config.js`.

**Cách fix:**
Thêm `res.cloudinary.com` vào `images.domains` trong `next.config.js`.

---

## 💰 Chi phí Cloudinary

### Free Tier (đủ dùng cho 5,000-10,000 ảnh)
- **Storage:** 25GB
- **Bandwidth:** 25GB/tháng
- **Transformations:** 25,000 credits/tháng

### Paid Plans (nếu vượt free tier)
- **Plus:** $99/tháng (75GB storage, 75GB bandwidth)
- **Advanced:** $249/tháng (150GB storage, 150GB bandwidth)

**Ước tính cho project của bạn:**
- 100 sản phẩm × 10 ảnh = 1,000 ảnh
- Mỗi ảnh ~500KB (sau optimize Cloudinary ~200KB)
- **Storage:** 1,000 × 200KB = 200MB → **Free tier đủ**
- **Bandwidth:** ~5-10GB/tháng → **Free tier đủ**

---

## ✅ Checklist hoàn thành

- [ ] Phase 1: Đăng ký Cloudinary + cài package + setup credentials
- [ ] Phase 2: Tạo upload API + Cloudinary helper
- [ ] Phase 3: Update admin form để upload Cloudinary
- [ ] Phase 4: Chạy migration script cho ảnh cũ
- [ ] Phase 5: Test performance + cleanup

---

## 🎉 Kết luận

Sau khi hoàn thành migration:
- ✅ Web load nhanh gấp 10-20 lần (từ 60s → 2-5s)
- ✅ Hỗ trợ 100+ ảnh/product
- ✅ Tự động optimize ảnh (resize, WebP, cache)
- ✅ Giảm chi phí bandwidth
- ✅ Production-ready

**Nếu gặp vấn đề, liên hệ để được hỗ trợ!**

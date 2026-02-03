# Hướng dẫn Deploy KHÔNG cần Git (khi repo quá nặng)

## 🔍 Vấn đề hiện tại
- `.git` folder: **1.4GB** (quá lớn)
- Không thể push lên GitHub/GitLab
- Cần deploy mà không qua Git

---

## ✅ Giải pháp 1: Deploy trực tiếp từ Local (Render CLI)

### Bước 1: Cài đặt Render CLI
```bash
npm install -g render-cli
# hoặc
brew install render
```

### Bước 2: Đăng nhập Render
```bash
render login
```

### Bước 3: Tạo service từ local
```bash
cd /Users/lamnhuttan/Documents/PJ-Website-Ban-Hoa
render services:create web \
  --name pj-website-ban-hoa \
  --region singapore \
  --build-command "npm install && npm run build" \
  --start-command "npm start" \
  --env NODE_ENV=production
```

### Bước 4: Thêm Environment Variables
```bash
render env:set MONGODB_URI="your-mongodb-uri"
render env:set NEXTAUTH_URL="https://hoatuoinyna.lk.com"

##openssl rand -base64 32
render env:set NEXTAUTH_SECRET="bUFwTPlFA+Tyt0jqi+JQIT+4ttiTZoG3D33DRHN03Zc="
# ... thêm các biến khác
```

### Bước 5: Deploy
```bash
render deploy
```

**Lưu ý:** Render CLI sẽ upload code trực tiếp từ local, không cần Git.

---

## ✅ Giải pháp 2: Sử dụng Docker + Deploy

### Bước 1: Tạo Dockerfile
Tạo file `Dockerfile` ở root:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### Bước 2: Cập nhật next.config.js
Thêm `output: 'standalone'`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Thêm dòng này
  images: {
    domains: ['localhost'],
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

### Bước 3: Build Docker image
```bash
docker build -t pj-website-ban-hoa .
```

### Bước 4: Deploy lên Render với Docker
1. Vào Render dashboard
2. Tạo **New Web Service**
3. Chọn **Docker** thay vì **Git**
4. Upload Dockerfile hoặc connect Docker registry

---

## ✅ Giải pháp 3: Sử dụng Railway (Hỗ trợ upload trực tiếp)

### Bước 1: Cài đặt Railway CLI
```bash
npm install -g @railway/cli
```

### Bước 2: Đăng nhập
```bash
railway login
```

### Bước 3: Tạo project và deploy
```bash
cd /Users/lamnhuttan/Documents/PJ-Website-Ban-Hoa
railway init
railway up
```

Railway sẽ tự động detect Next.js và deploy.

### Bước 4: Thêm Environment Variables
```bash
railway variables set MONGODB_URI="your-mongodb-uri"
railway variables set NEXTAUTH_URL="https://your-app.railway.app"
# ... thêm các biến khác
```

---

## ✅ Giải pháp 4: Sử dụng Vercel CLI (Khuyến nghị)

### Bước 1: Cài đặt Vercel CLI
```bash
npm install -g vercel
```

### Bước 2: Đăng nhập
```bash
vercel login
```

### Bước 3: Deploy
```bash
cd /Users/lamnhuttan/Documents/PJ-Website-Ban-Hoa
vercel
```

Vercel sẽ:
- Upload code trực tiếp từ local
- Tự động detect Next.js
- Hỏi các câu hỏi setup
- Deploy ngay lập tức

### Bước 4: Thêm Environment Variables
```bash
vercel env add MONGODB_URI
vercel env add NEXTAUTH_URL
vercel env add NEXTAUTH_SECRET
# ... thêm các biến khác
```

### Bước 5: Deploy production
```bash
vercel --prod
```

---

## ✅ Giải pháp 5: Tối ưu Git trước (Nếu muốn dùng Git sau)

### Bước 1: Cập nhật .gitignore
Thêm vào `.gitignore`:

```
# Backup files
backup_before_migration/
*.bson
*.metadata.json

# Logs
logs/
*.log

# Large files
*.zip
*.tar.gz
*.rar

# Build artifacts
dist/
build/
```

### Bước 2: Xóa các file lớn khỏi Git history
```bash
# Cài đặt git-filter-repo (nếu chưa có)
# brew install git-filter-repo

# Xóa folder backup khỏi history
git filter-repo --path backup_before_migration --invert-paths

# Xóa folder logs
git filter-repo --path logs --invert-paths

# Force push (cẩn thận!)
git push origin --force --all
```

**⚠️ Cảnh báo:** Lệnh này sẽ rewrite Git history. Chỉ làm nếu bạn chắc chắn!

### Bước 3: Push lại
```bash
git add .
git commit -m "Clean up large files"
git push origin main
```

---

## 📊 So sánh các giải pháp

| Giải pháp | Độ khó | Tốc độ | Chi phí | Khuyến nghị |
|-----------|--------|--------|---------|-------------|
| **Vercel CLI** | ⭐ Dễ | ⚡⚡⚡ Nhanh | 💰 Free | ✅ **Tốt nhất** |
| **Render CLI** | ⭐⭐ Trung bình | ⚡⚡ Nhanh | 💰 Free | ✅ Tốt |
| **Railway CLI** | ⭐ Dễ | ⚡⚡ Nhanh | 💰 Free (có giới hạn) | ✅ Tốt |
| **Docker** | ⭐⭐⭐ Khó | ⚡ Chậm hơn | 💰 Free | ⚠️ Phức tạp |
| **Tối ưu Git** | ⭐⭐⭐ Khó | ⚡⚡ Nhanh | 💰 Free | ⚠️ Rủi ro |

---

## 🎯 Khuyến nghị

### Nếu muốn deploy nhanh:
→ **Dùng Vercel CLI** (giải pháp 4)
- Đơn giản nhất
- Tự động optimize
- Free tier tốt

### Nếu muốn dùng Render:
→ **Dùng Render CLI** (giải pháp 1)
- Upload trực tiếp từ local
- Không cần Git

### Nếu muốn fix Git để dùng sau:
→ **Tối ưu Git** (giải pháp 5)
- Xóa các file lớn khỏi history
- Sau đó có thể push bình thường

---

## 🚀 Quick Start với Vercel (Khuyến nghị)

```bash
# 1. Cài đặt
npm install -g vercel

# 2. Đăng nhập
vercel login

# 3. Deploy
cd /Users/lamnhuttan/Documents/PJ-Website-Ban-Hoa
vercel

# 4. Thêm env vars
vercel env add MONGODB_URI
vercel env add NEXTAUTH_URL
vercel env add NEXTAUTH_SECRET

# 5. Deploy production
vercel --prod
```

**Xong!** Website sẽ có URL dạng: `https://your-app.vercel.app`

---

## 📝 Lưu ý quan trọng

1. **Environment Variables:** Nhớ thêm tất cả biến môi trường cần thiết
2. **MongoDB Atlas:** Đảm bảo allow IP `0.0.0.0/0` hoặc IP của hosting
3. **NEXTAUTH_URL:** Phải đúng với URL thực tế của app
4. **Images:** Nếu có nhiều images, cân nhắc dùng CDN (Cloudinary, Imgix)

---

**Chúc bạn deploy thành công! 🚀**

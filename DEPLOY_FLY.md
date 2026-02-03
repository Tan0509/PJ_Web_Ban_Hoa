# 🚀 Hướng dẫn Deploy Next.js lên Fly.io (Hong Kong Region)

## 📋 Tổng quan

Fly.io là platform deploy container-based, cho phép chọn region gần MongoDB Atlas (Hong Kong) để giảm latency. Web sẽ chạy trong container liên tục → **không có cold start**, kết nối MongoDB ổn định hơn Vercel.

---

## ✅ Bước 1: Cài đặt Fly CLI

### macOS:
```bash
curl -L https://fly.io/install.sh | sh
```

### Hoặc dùng Homebrew:
```bash
brew install flyctl
```

### Kiểm tra cài đặt:
```bash
flyctl version
```

---

## ✅ Bước 2: Đăng nhập Fly.io

```bash
flyctl auth login
```

Sẽ mở browser để đăng nhập hoặc tạo tài khoản mới (free tier có sẵn).

---

## ✅ Bước 3: Tạo Fly App (tự động tạo fly.toml)

```bash
cd /Users/lamnhuttan/Documents/PJ-Website-Ban-Hoa

flyctl launch --name pj-website-ban-hoa --region hkg
```

**Lưu ý:**
- `--name`: Tên app (phải unique, có thể thay đổi)
- `--region hkg`: Chọn Hong Kong region (gần MongoDB Atlas ap-east-1)

Fly sẽ hỏi:
- **Would you like to copy its configuration to the app?** → **N** (tạo mới)
- **Would you like to set up a Postgresql database now?** → **N** (đã có MongoDB)
- **Would you like to set up an Upstash Redis database now?** → **N** (không cần)
- **Would you like to deploy now?** → **N** (chưa, cần set env vars trước)

---

## ✅ Bước 4: Cấu hình fly.toml

File `fly.toml` đã được tạo. Mở và chỉnh sửa:

```toml
app = "pj-website-ban-hoa"
primary_region = "hkg"

[build]

[env]
  NODE_ENV = "production"
  PORT = "3000"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512
```

**Giải thích:**
- `primary_region = "hkg"`: Region Hong Kong
- `min_machines_running = 1`: Luôn có 1 machine chạy (không sleep → không cold start)
- `auto_stop_machines = false`: Không tự động tắt machine
- `memory_mb = 512`: Memory cho Next.js (có thể tăng lên 1024 nếu cần)

---

## ✅ Bước 5: Tạo Dockerfile (nếu chưa có)

Fly.io cần Dockerfile để build Next.js. Tạo file `Dockerfile`:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

**Lưu ý:** Cần cập nhật `next.config.js` để enable standalone output:

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

---

## ✅ Bước 6: Set Environment Variables

```bash
# MONGODB_URI
flyctl secrets set MONGODB_URI="mongodb+srv://tanbanhoa:050997@pj-website-ban-hoa.fdeudnd.mongodb.net/?appName=PJ-Website-Ban-Hoa"

# NEXTAUTH_SECRET (generate mới hoặc dùng secret cũ)
flyctl secrets set NEXTAUTH_SECRET="bUFwTPlFA+Tyt0jqi+JQIT+4ttiTZoG3D33DRHN03Zc="

# NEXTAUTH_URL (sẽ là https://pj-website-ban-hoa.fly.dev sau khi deploy)
flyctl secrets set NEXTAUTH_URL="https://pj-website-ban-hoa.fly.dev"

# NODE_ENV
flyctl secrets set NODE_ENV="production"
```

**Lưu ý:** 
- `flyctl secrets set` sẽ tự động encrypt và lưu vào Fly.io
- Sau khi deploy, URL sẽ là `https://pj-website-ban-hoa.fly.dev` (hoặc tên app bạn đặt)
- Có thể update `NEXTAUTH_URL` sau khi biết URL chính xác

---

## ✅ Bước 7: Deploy

```bash
flyctl deploy
```

Fly sẽ:
1. Build Docker image
2. Push lên Fly.io registry
3. Deploy container ở region Hong Kong
4. Tự động assign domain: `https://pj-website-ban-hoa.fly.dev`

**Thời gian:** ~5-10 phút lần đầu (build image), các lần sau ~2-3 phút.

---

## ✅ Bước 8: Kiểm tra và Update NEXTAUTH_URL

Sau khi deploy xong, kiểm tra URL:

```bash
flyctl status
```

Sẽ hiển thị URL của app. Sau đó update `NEXTAUTH_URL`:

```bash
flyctl secrets set NEXTAUTH_URL="https://pj-website-ban-hoa.fly.dev"
```

---

## ✅ Bước 9: Xem Logs (nếu có lỗi)

```bash
# Xem logs real-time
flyctl logs

# Xem logs của machine cụ thể
flyctl logs -a pj-website-ban-hoa
```

---

## 🔧 Các lệnh hữu ích khác

```bash
# Xem status app
flyctl status

# Xem danh sách machines
flyctl machines list

# Restart app
flyctl apps restart pj-website-ban-hoa

# Scale up/down
flyctl scale count 1
flyctl scale memory 1024

# SSH vào container (debug)
flyctl ssh console

# Xem environment variables (không hiện giá trị)
flyctl secrets list

# Xóa secret
flyctl secrets unset MONGODB_URI
```

---

## 🐛 Troubleshooting

### Lỗi: "Build failed"
- Kiểm tra `Dockerfile` có đúng không
- Kiểm tra `next.config.js` có `output: 'standalone'`
- Xem logs: `flyctl logs`

### Lỗi: "Cannot connect to MongoDB"
- Kiểm tra `MONGODB_URI` đã set chưa: `flyctl secrets list`
- Kiểm tra MongoDB Atlas Network Access đã whitelist IP của Fly.io chưa (hoặc `0.0.0.0/0`)

### Lỗi: "Port 3000 not accessible"
- Kiểm tra `fly.toml` có `internal_port = 3000`
- Kiểm tra app có chạy: `flyctl status`

### App chậm lần đầu
- Fly.io free tier có thể sleep machine sau 5 phút không dùng
- Upgrade plan hoặc set `min_machines_running = 1` trong `fly.toml`

---

## 💰 Pricing

**Free Tier:**
- 3 shared-cpu-1x VMs (256MB RAM)
- 160GB outbound data transfer/month
- Có thể upgrade để tăng RAM/CPU

**Paid Plans:**
- $1.94/month cho 1GB RAM, 1 shared CPU
- $3.88/month cho 2GB RAM, 1 shared CPU

---

## ✅ Kết quả mong đợi

- ✅ Web chạy ở Hong Kong region (gần MongoDB Atlas)
- ✅ Không có cold start (container chạy liên tục)
- ✅ Kết nối MongoDB ổn định (connection pooling)
- ✅ Load nhanh hơn Vercel (đặc biệt với DB queries)
- ✅ URL: `https://pj-website-ban-hoa.fly.dev`

---

## 📝 Lưu ý

1. **Domain tùy chỉnh:** Có thể thêm custom domain trong Fly.io dashboard
2. **SSL:** Fly.io tự động cung cấp SSL certificate
3. **Auto-deploy:** Có thể setup GitHub Actions để auto-deploy khi push code
4. **Monitoring:** Fly.io có built-in metrics và logs

---

## 🎉 Hoàn tất!

Sau khi deploy thành công, web sẽ load nhanh hơn Vercel vì:
- ✅ Không cold start
- ✅ Region gần MongoDB (Hong Kong)
- ✅ Connection pooling ổn định

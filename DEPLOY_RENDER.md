# Hướng dẫn Deploy Website lên Render từ A đến Z

## 📋 Mục lục
1. [Chuẩn bị](#1-chuẩn-bị)
2. [Tạo tài khoản Render](#2-tạo-tài-khoản-render)
3. [Chuẩn bị Code](#3-chuẩn-bị-code)
4. [Tạo Web Service trên Render](#4-tạo-web-service-trên-render)
5. [Cấu hình Environment Variables](#5-cấu-hình-environment-variables)
6. [Deploy và Kiểm tra](#6-deploy-và-kiểm-tra)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Chuẩn bị

### 1.1. Kiểm tra yêu cầu
- ✅ Code đã được commit và push lên GitHub/GitLab/Bitbucket
- ✅ MongoDB Atlas đã được setup (hoặc MongoDB database khác)
- ✅ Có tài khoản GitHub/GitLab/Bitbucket
- ✅ Đã test app chạy được ở local (`npm run build` thành công)

### 1.2. Kiểm tra build
Chạy lệnh sau để đảm bảo app có thể build:
```bash
npm run build
```

Nếu build thành công, bạn sẽ thấy:
```
✓ Compiled successfully
```

---

## 2. Tạo tài khoản Render

### Bước 1: Đăng ký tài khoản
1. Truy cập: https://render.com
2. Click **"Get Started for Free"** hoặc **"Sign Up"**
3. Chọn một trong các cách đăng ký:
   - **GitHub** (khuyến nghị - dễ nhất)
   - **GitLab**
   - **Bitbucket**
   - **Email** (nếu không dùng Git)

### Bước 2: Xác thực tài khoản
- Nếu chọn GitHub/GitLab/Bitbucket: Authorize Render truy cập repositories
- Nếu chọn Email: Check email và xác thực

---

## 3. Chuẩn bị Code

### 3.1. Đảm bảo code đã push lên Git
```bash
# Kiểm tra status
git status

# Nếu có thay đổi chưa commit
git add .
git commit -m "Prepare for deployment"

# Push lên remote
git push origin main
# hoặc
git push origin master
```

### 3.2. Kiểm tra package.json
Đảm bảo có các scripts sau:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

### 3.3. Tạo file render.yaml (Tùy chọn - để tự động setup)
Tạo file `render.yaml` ở root project:

```yaml
services:
  - type: web
    name: pj-website-ban-hoa
    env: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false
      - key: NEXTAUTH_URL
        sync: false
      - key: NEXTAUTH_SECRET
        sync: false
```

**Lưu ý:** File này là tùy chọn, bạn có thể setup thủ công trên Render dashboard.

---

## 4. Tạo Web Service trên Render

### Bước 1: Tạo New Web Service
1. Đăng nhập vào Render dashboard: https://dashboard.render.com
2. Click **"New +"** ở góc trên bên trái
3. Chọn **"Web Service"**

### Bước 2: Kết nối Repository
1. Nếu chưa kết nối Git provider:
   - Click **"Connect account"** hoặc **"Configure account"**
   - Authorize Render truy cập repositories
2. Chọn repository: `PJ-Website-Ban-Hoa` (hoặc tên repo của bạn)
3. Click **"Connect"**

### Bước 3: Cấu hình Service
Điền thông tin:

**Basic Settings:**
- **Name:** `pj-website-ban-hoa` (hoặc tên bạn muốn)
- **Region:** Chọn gần nhất (ví dụ: Singapore)
- **Branch:** `main` hoặc `master` (tùy repo của bạn)
- **Root Directory:** Để trống (nếu code ở root) hoặc điền đường dẫn nếu code ở subfolder
- **Runtime:** `Node`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

**Advanced Settings (nếu cần):**
- **Instance Type:** `Free` (hoặc upgrade nếu cần)
- **Auto-Deploy:** `Yes` (tự động deploy khi có code mới)

### Bước 4: Chọn Plan
- Chọn **"Free"** plan (hoặc upgrade nếu cần)
- Click **"Create Web Service"**

---

## 5. Cấu hình Environment Variables

### Bước 1: Mở Environment Tab
Sau khi tạo service, vào tab **"Environment"** ở sidebar trái

### Bước 2: Thêm các biến môi trường

Thêm các biến sau (click **"Add Environment Variable"**):

#### 5.2.1. Database
```
Key: MONGODB_URI
Value: mongodb+srv://username:password@cluster.mongodb.net/pj_website_ban_hoa?retryWrites=true&w=majority
```
*(Thay bằng connection string thực tế từ MongoDB Atlas)*

#### 5.2.2. NextAuth
```
Key: NEXTAUTH_URL
Value: https://your-app-name.onrender.com
```
*(Thay `your-app-name` bằng tên service bạn đã tạo)*

```
Key: NEXTAUTH_SECRET
Value: [Generate một secret key dài và random]
```
*Cách tạo secret:*
```bash
# Trên terminal
openssl rand -base64 32
```
*Hoặc dùng online tool: https://generate-secret.vercel.app/32*

#### 5.2.3. Node Environment
```
Key: NODE_ENV
Value: production
```

#### 5.2.4. Site URL (nếu có dùng)
```
Key: NEXT_PUBLIC_SITE_URL
Value: https://your-app-name.onrender.com
```

#### 5.2.5. Google OAuth (nếu có dùng)
```
Key: GOOGLE_CLIENT_ID
Value: [Your Google Client ID]

Key: GOOGLE_CLIENT_SECRET
Value: [Your Google Client Secret]
```

#### 5.2.6. SendGrid (nếu có dùng)
```
Key: SENDGRID_API_KEY
Value: [Your SendGrid API Key]

Key: SENDGRID_FROM_EMAIL
Value: [Your verified sender email]
```

#### 5.2.7. Payment Gateways (nếu có dùng)
```
Key: MOMO_ACCESS_KEY
Value: [Your MoMo Access Key]

Key: MOMO_SECRET_KEY
Value: [Your MoMo Secret Key]

Key: VNPAY_TMN_CODE
Value: [Your VNPay TMN Code]

Key: VNPAY_HASH_SECRET
Value: [Your VNPay Hash Secret]
```

### Bước 3: Save Changes
Click **"Save Changes"** sau khi thêm tất cả biến môi trường

---

## 6. Deploy và Kiểm tra

### Bước 1: Manual Deploy (lần đầu)
1. Vào tab **"Events"** hoặc **"Logs"**
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Chờ quá trình build và deploy hoàn tất (5-10 phút)

### Bước 2: Theo dõi Logs
- Vào tab **"Logs"** để xem quá trình build
- Kiểm tra xem có lỗi nào không

**Logs bình thường sẽ có:**
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
```

### Bước 3: Kiểm tra URL
Sau khi deploy xong, bạn sẽ có URL dạng:
```
https://your-app-name.onrender.com
```

**Lưu ý:** 
- Lần đầu deploy có thể mất 5-10 phút
- Free tier có thể "sleep" sau 15 phút không có traffic (wake up mất ~30 giây)

### Bước 4: Test Website
1. Truy cập URL được cung cấp
2. Kiểm tra các chức năng:
   - ✅ Trang chủ load được
   - ✅ Đăng nhập/Đăng ký
   - ✅ Xem sản phẩm
   - ✅ Thêm vào giỏ hàng
   - ✅ Checkout
   - ✅ Admin panel (nếu có)

---

## 7. Troubleshooting

### 7.1. Build Failed

**Lỗi:** `Build failed`

**Giải pháp:**
1. Kiểm tra logs để xem lỗi cụ thể
2. Đảm bảo `npm run build` chạy được ở local
3. Kiểm tra Node version (Render dùng Node 18+)
4. Kiểm tra dependencies có conflict không

**Thêm vào package.json nếu cần:**
```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

### 7.2. Environment Variables không hoạt động

**Lỗi:** `Cannot read property of undefined`

**Giải pháp:**
1. Kiểm tra tất cả biến môi trường đã được thêm chưa
2. Kiểm tra tên biến có đúng không (case-sensitive)
3. Restart service sau khi thêm biến mới

### 7.3. Database Connection Failed

**Lỗi:** `MongoServerError: connection timeout`

**Giải pháp:**
1. Kiểm tra MongoDB Atlas:
   - Network Access: Thêm IP `0.0.0.0/0` (allow all) hoặc IP của Render
   - Database User: Đảm bảo user có quyền read/write
2. Kiểm tra connection string đúng format
3. Kiểm tra firewall/security groups

### 7.4. NextAuth không hoạt động

**Lỗi:** `NEXTAUTH_URL mismatch`

**Giải pháp:**
1. Đảm bảo `NEXTAUTH_URL` đúng với URL thực tế của app
2. Format: `https://your-app-name.onrender.com` (không có trailing slash)
3. Restart service sau khi sửa

### 7.5. Images không load

**Lỗi:** `Image optimization failed`

**Giải pháp:**
1. Kiểm tra `next.config.js` có cấu hình `remotePatterns` đúng không
2. Đảm bảo image URLs là HTTPS
3. Kiểm tra CORS settings nếu dùng external images

### 7.6. App bị "Sleep" (Free tier)

**Hiện tượng:** Lần đầu truy cập sau khi sleep mất ~30 giây

**Giải pháp:**
1. Upgrade lên paid plan (không bị sleep)
2. Hoặc dùng service như UptimeRobot để ping app mỗi 5 phút (giữ app không sleep)

---

## 8. Tùy chỉnh Domain (Optional)

### 8.1. Thêm Custom Domain
1. Vào tab **"Settings"** → **"Custom Domains"**
2. Click **"Add Custom Domain"**
3. Nhập domain của bạn (ví dụ: `www.yourdomain.com`)
4. Thêm DNS records theo hướng dẫn:
   - **CNAME:** `www` → `your-app-name.onrender.com`
   - **A Record:** `@` → IP của Render (nếu cần)

### 8.2. SSL Certificate
- Render tự động cung cấp SSL certificate (Let's Encrypt)
- SSL sẽ được cấp tự động sau khi verify domain

---

## 9. Auto-Deploy

### 9.1. Bật Auto-Deploy
1. Vào tab **"Settings"**
2. Tìm **"Auto-Deploy"**
3. Bật **"Auto-Deploy"** = `Yes`
4. Chọn branch: `main` hoặc `master`

### 9.2. Khi nào Auto-Deploy chạy?
- Mỗi khi bạn push code lên branch đã chọn
- Render tự động detect và deploy

---

## 10. Monitoring & Logs

### 10.1. Xem Logs
- Tab **"Logs"**: Xem real-time logs
- Tab **"Events"**: Xem lịch sử deploy

### 10.2. Metrics
- Tab **"Metrics"**: Xem CPU, Memory, Request count
- Chỉ có trên paid plans

---

## ✅ Checklist cuối cùng

Trước khi deploy, đảm bảo:

- [ ] Code đã push lên Git
- [ ] `npm run build` chạy thành công ở local
- [ ] Đã tạo tài khoản Render
- [ ] Đã tạo Web Service
- [ ] Đã thêm tất cả Environment Variables
- [ ] MongoDB Atlas đã allow IP `0.0.0.0/0`
- [ ] `NEXTAUTH_URL` đúng với URL của Render
- [ ] Đã test app sau khi deploy

---

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra logs trên Render dashboard
2. Kiểm tra documentation: https://render.com/docs
3. Render Support: support@render.com

---

**Chúc bạn deploy thành công! 🚀**

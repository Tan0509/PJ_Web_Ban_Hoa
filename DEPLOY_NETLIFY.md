# Hướng dẫn deploy website lên Netlify

Dự án dùng **Next.js 16** và đã cấu hình sẵn `netlify.toml` + plugin `@netlify/plugin-nextjs`. Làm lần lượt các bước dưới.

---

## 1. Chuẩn bị code (Git)

- Đảm bảo code đã push lên **GitHub / GitLab / Bitbucket** (Netlify deploy qua Git).
- Nếu chưa có repo:
  ```bash
  git init
  git add .
  git commit -m "Prepare for Netlify deploy"
  git remote add origin <URL_REPO_CỦA_BẠN>
  git push -u origin main
  ```
- **Lưu ý:** Không push file `.env.local` (đã có trong `.gitignore`). Biến môi trường sẽ cấu hình trực tiếp trên Netlify (bước 4).

---

## 2. Tạo site mới trên Netlify

1. Vào [https://app.netlify.com](https://app.netlify.com) và đăng nhập (hoặc đăng ký bằng GitHub/GitLab).
2. Bấm **"Add new site"** → **"Import an existing project"**.
3. Chọn **GitHub** (hoặc GitLab/Bitbucket) và **authorize** nếu được hỏi.
4. Chọn repository chứa project **PJ-Website-Ban-Hoa**.
5. Netlify sẽ tự nhận **Next.js** và điền sẵn:
   - **Build command:** `npm run build` (hoặc từ `netlify.toml`)
   - **Publish directory:** `.next` (plugin Next.js sẽ xử lý)
   - **Base directory:** để trống (nếu repo là đúng root của project).

Nếu Netlify không đọc được `netlify.toml`, hãy điền tay:
- **Build command:** `npm run build`
- **Publish directory:** `.next`

Sau đó bấm **"Deploy site"** (có thể deploy lần đầu sẽ fail vì chưa có biến môi trường — làm tiếp bước 4 rồi redeploy).

---

## 3. Cấu hình build (netlify.toml)

Project đã có file `netlify.toml` ở root:

```toml
[build]
  command = "npm run build"
  publish = ".next"
[build.environment]
  NODE_VERSION = "20"
[[plugins]]
  package = "@netlify/plugin-nextjs"
```

- Không cần sửa gì thêm nếu bạn dùng Node 20.
- Nếu muốn dùng Node 18: đổi `NODE_VERSION = "18"`.

---

## 4. Cấu hình biến môi trường (Environment variables)

Trên Netlify: **Site settings** → **Environment variables** → **Add a variable** / **Import from .env**.

Thêm **tất cả** biến sau (giá trị lấy từ `.env.local` trên máy bạn, **không** commit file này):

| Biến | Bắt buộc | Ghi chú |
|------|----------|--------|
| `MONGODB_URI` | Có | Chuỗi kết nối MongoDB Atlas |
| `NEXTAUTH_SECRET` | Có | Chuỗi bí mật (ví dụ `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Có | **URL site Netlify**, ví dụ `https://ten-site.netlify.app` |
| `NEXT_PUBLIC_SITE_URL` | Có | Cùng với `NEXTAUTH_URL` (dùng cho link, redirect) |
| `GOOGLE_CLIENT_ID` | Nếu dùng đăng nhập Google | OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Nếu dùng đăng nhập Google | OAuth Client Secret |
| `CLOUDINARY_CLOUD_NAME` | Nếu dùng Cloudinary | Tên cloud |
| `CLOUDINARY_API_KEY` | Nếu dùng Cloudinary | API Key |
| `CLOUDINARY_API_SECRET` | Nếu dùng Cloudinary | API Secret |
| `SENDGRID_API_KEY` | Nếu gửi email | SendGrid API Key |
| `SENDGRID_FROM_EMAIL` | Nếu gửi email | Email gửi đi |
| `SENDGRID_FROM_NAME` | Không | Tên hiển thị (mặc định "Hoa Tươi NyNa") |
| `MOMO_PARTNER_CODE` | Nếu bật thanh toán MoMo | MoMo test/production |
| `MOMO_ACCESS_KEY` | Nếu bật MoMo | |
| `MOMO_SECRET_KEY` | Nếu bật MoMo | |
| `MOMO_ENDPOINT` | Nếu bật MoMo | Test: `https://test-payment.momo.vn/v2/gateway/api/create` |
| `VNPAY_TMNCODE` | Nếu bật VNPay | |
| `VNPAY_HASH_SECRET` | Nếu bật VNPay | |
| `VNPAY_URL` | Nếu bật VNPay | Sandbox hoặc production |
| `NEXT_PUBLIC_ZALO_OA_ID` | Nếu bật Zalo chat | Zalo OA ID |

**Quan trọng:**

- **NEXTAUTH_URL** và **NEXT_PUBLIC_SITE_URL**: sau khi deploy lần đầu, lấy URL thật (ví dụ `https://xxx.netlify.app`) rồi sửa lại 2 biến này và **Trigger deploy** lại.
- Trong **Google Cloud Console** (OAuth): thêm **Authorized redirect URI** là `https://ten-site.netlify.app/api/auth/callback/google` (thay đúng domain Netlify của bạn).
- **MoMo**: app tự tạo redirect/IPN từ `NEXT_PUBLIC_SITE_URL` (redirect: `/checkout/momo/return`, IPN: `/api/payments/momo/ipn`). Chỉ cần set **NEXT_PUBLIC_SITE_URL** đúng URL Netlify; không cần biến `MOMO_REDIRECT_URL` / `MOMO_IPN_URL`.
- **VNPay**: cấu hình redirect/callback trên VNPay trỏ đúng domain Netlify.

---

## 5. Deploy và redeploy

1. **Deploy lần đầu:** Sau khi thêm env, vào **Deploys** → **Trigger deploy** → **Deploy site**.
2. Đợi build xong. Nếu lỗi: xem **Deploy log** (build hoặc function logs).
3. Sau khi có URL (ví dụ `https://random-name-123.netlify.app`):
   - Cập nhật **NEXTAUTH_URL** và **NEXT_PUBLIC_SITE_URL** = URL đó.
   - Cập nhật Google OAuth redirect URI, MoMo/VNPay URL nếu dùng.
   - **Trigger deploy** lại một lần.

---

## 6. Tùy chọn: đổi tên site và custom domain

- **Đổi tên:** **Site settings** → **Site information** → **Site name** → đổi thành tên dễ nhớ (ví dụ `hoatuoi-nyna`) → URL sẽ là `https://hoatuoi-nyna.netlify.app`.
- **Custom domain:** **Domain management** → **Add custom domain** → nhập domain của bạn và làm theo hướng dẫn (DNS trỏ CNAME sang Netlify). Sau khi có domain, đổi **NEXTAUTH_URL** và **NEXT_PUBLIC_SITE_URL** thành domain mới và redeploy.

---

## 7. Một số lỗi thường gặp

| Lỗi | Cách xử lý |
|-----|------------|
| Build fail: thiếu env | Kiểm tra **Environment variables** đã thêm đủ `MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. |
| 500 khi vào trang | Xem **Functions** log trên Netlify; thường do thiếu env hoặc sai `NEXTAUTH_URL`. |
| Đăng nhập Google không hoạt động | Thêm đúng **Authorized redirect URI** `https://<domain-netlify>/api/auth/callback/google` trong Google Console. |
| MoMo/VNPay redirect sai | Đảm bảo **NEXT_PUBLIC_SITE_URL** đúng URL Netlify; cấu hình callback/redirect trên VNPay/MoMo sang domain Netlify. |

---

## 8. Tóm tắt nhanh

1. Push code lên GitHub/GitLab (không push `.env.local`).
2. Netlify → Add new site → Import từ Git → chọn repo.
3. Build command: `npm run build`, Publish: `.next` (hoặc để plugin tự nhận).
4. Thêm đủ biến môi trường trong **Environment variables**.
5. Deploy → lấy URL → cập nhật `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL`, Google/MoMo/VNPay → Trigger deploy lại.
6. (Tùy chọn) Đổi tên site, thêm custom domain.

Sau khi làm xong, site chạy tại URL dạng `https://<tên-site>.netlify.app` (hoặc custom domain nếu bạn cấu hình).

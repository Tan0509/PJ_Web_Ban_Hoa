# Website Bán Hoa 🌹

Website bán hoa tươi online được xây dựng với Next.js 14, MongoDB, và Stripe.

## 🚀 Công nghệ sử dụng

- **Next.js 14** - React framework với App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling framework
- **MongoDB** - Database (với Mongoose ODM)
- **NextAuth.js** - Authentication với email/password
- **Stripe** - Payment processing
- **bcryptjs** - Password hashing

## 📁 Cấu trúc dự án

```
PJ-Website-Ban-Hoa/
├─ .env.local
├─ .gitignore
├─ next.config.js
├─ package.json
├─ postcss.config.js
├─ tailwind.config.js
├─ tsconfig.json
├─ README.md
│
├─ public/
│  ├─ images/
│  │  ├─ products/
│  │  ├─ categories/
│  │  └─ banners/
│  └─ fonts/
│
└─ src/
   ├─ app/
   │  ├─ layout.tsx                # ROOT layout (chỉ Providers, không UI)
   │  ├─ globals.css
   │
   │  ├─ (customer)/               # NHÁNH CUSTOMER
   │  │  ├─ layout.tsx             # Header + Footer
   │  │  ├─ page.tsx               # Home
   │  │  ├─ product/
   │  │  │  └─ [slug]/page.tsx
   │  │  ├─ cart/page.tsx
   │  │  ├─ checkout/page.tsx
   │  │  └─ profile/page.tsx
   │
   │  ├─ admin/                    # NHÁNH ADMIN
   │  │  ├─ layout.tsx             # Sidebar + AdminHeader
   │  │  ├─ page.tsx               # Dashboard
   │  │  ├─ products/
   │  │  │  ├─ page.tsx
   │  │  │  └─ create/page.tsx
   │  │  ├─ categories/page.tsx
   │  │  ├─ orders/page.tsx
   │  │  ├─ users/page.tsx
   │  │  └─ settings/page.tsx
   │
   │  ├─ auth/                     # AUTH (KHÔNG CÓ HEADER)
   │  │  ├─ signin/page.tsx
   │  │  └─ signup/page.tsx
   │
   │  └─ api/                      # API ROUTE HANDLERS
   │     ├─ auth/
   │     │  └─ [...nextauth]/route.ts
   │     ├─ products/
   │     │  ├─ route.ts
   │     │  └─ [id]/route.ts
   │     ├─ categories/route.ts
   │     └─ orders/route.ts
   │
   ├─ components/
   │  ├─ customer/
   │  │  ├─ Header.tsx
   │  │  ├─ Footer.tsx
   │  │  ├─ ProductCard.tsx
   │  │  └─ CartPanel.tsx
   │  │
   │  ├─ admin/
   │  │  ├─ Sidebar.tsx
   │  │  ├─ AdminHeader.tsx
   │  │  ├─ DataTable.tsx
   │  │  └─ AdminModal.tsx
   │  │
   │  └─ shared/
   │     ├─ Button.tsx
   │     ├─ Input.tsx
   │     ├─ Modal.tsx
   │     └─ Select.tsx
   │
   ├─ contexts/
   │  ├─ CartContext.tsx
   │  └─ AuthContext.tsx
   │
   ├─ lib/
   │  ├─ mongodb.ts
   │  ├─ mongoose.ts
   │  ├─ auth.ts
   │  ├─ stripe.ts
   │  └─ utils.ts
   │
   ├─ models/
   │  ├─ Product.ts
   │  ├─ Category.ts
   │  ├─ Order.ts
   │  └─ User.ts
   │
   ├─ middleware.ts                # BẢO VỆ ADMIN ROUTE
   │
   └─ types/
      ├─ product.ts
      ├─ user.ts
      └─ order.ts


## 🛠️ Cài đặt và chạy dự án

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình biến môi trường

Tạo file `.env.local` trong thư mục gốc và thêm các biến sau:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/ban-hoa
# Hoặc MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/ban-hoa

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-generate-with-openssl-rand-base64-32

# Stripe (tùy chọn - có thể để trống để dùng mock checkout)


# Node Environment
NODE_ENV=development
```

**Lưu ý:**
- Để tạo `NEXTAUTH_SECRET`, chạy lệnh: `openssl rand -base64 32`
- Nếu chưa có Stripe key, hệ thống sẽ sử dụng mock checkout

### 3. Chạy development server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trong trình duyệt.

### 4. Build cho production

```bash
npm run build
npm start
```

## ✨ Tính năng

### Đã triển khai

- ✅ **Authentication**: Đăng ký và đăng nhập với email/password
- ✅ **Giỏ hàng**: Lưu trữ trong localStorage, có thể thêm/xóa/chỉnh sửa số lượng
- ✅ **Sản phẩm**: Hiển thị danh sách và chi tiết sản phẩm
- ✅ **Thanh toán**: Tích hợp Stripe (có mock mode nếu chưa có key)
- ✅ **Responsive Design**: Giao diện responsive với Tailwind CSS
- ✅ **MongoDB Models**: Product, User, Order với validation đầy đủ

### Cần phát triển thêm

- [ ] Quản lý đơn hàng (admin panel)
- [ ] Upload hình ảnh sản phẩm
- [ ] Tìm kiếm và lọc sản phẩm
- [ ] Đánh giá sản phẩm
- [ ] Email notifications
- [ ] Order tracking
- [ ] Payment webhook handling

## 📝 API Routes

### Authentication

- `POST /api/auth/signup` - Đăng ký tài khoản mới
- `GET/POST /api/auth/[...nextauth]` - NextAuth endpoints

### Products

- `GET /api/products` - Lấy danh sách sản phẩm
  - Query params: `category`, `search`, `page`, `limit`
- `GET /api/products/[id]` - Lấy thông tin chi tiết sản phẩm

### Checkout

- `POST /api/checkout` - Tạo Stripe checkout session

## 🗄️ Database Schema

### User
```typescript
{
  name: string
  email: string (unique)
  password: string (hashed)
  role: 'user' | 'admin'
  image?: string
}
```

### Product
```typescript
{
  name: string
  description: string
  price: number
  image?: string
  category: string
  stock: number
}
```

### Order
```typescript
{
  userId: string
  items: Array<{
    productId: string
    name: string
    price: number
    quantity: number
  }>
  total: number
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  paymentIntentId?: string
  shippingAddress?: {
    name: string
    phone: string
    address: string
    city: string
  }
}
```

## 🔐 Security

- Passwords được hash bằng bcryptjs
- NextAuth JWT sessions
- API routes có validation
- MongoDB injection protection với Mongoose

## 📦 Dependencies chính

- `next`: ^14.0.0
- `react`: ^18.2.0
- `mongodb`: ^6.0.0
- `mongoose`: ^8.0.0
- `next-auth`: ^4.24.0
- `stripe`: ^14.0.0
- `bcryptjs`: ^2.4.3
- `tailwindcss`: ^3.3.0

## 🤝 Đóng góp

1. Fork dự án
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📄 License

Dự án này được phát hành dưới MIT License.

## 📞 Liên hệ

Nếu có câu hỏi hoặc góp ý, vui lòng tạo issue trên GitHub.

---

**Lưu ý:** Đây là dự án demo. Trong môi trường production, cần:
- Cấu hình HTTPS
- Setup MongoDB Atlas hoặc production database
- Cấu hình Stripe production keys
- Thêm error monitoring (Sentry, etc.)
- Setup CI/CD pipeline
- Thêm unit tests và integration tests

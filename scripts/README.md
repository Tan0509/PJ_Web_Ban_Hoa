# Scripts

## create-admin.js

Script để tạo tài khoản admin trong MongoDB.

### Cách sử dụng:

**Cách 1: Chạy trực tiếp với Node.js**

```bash
# Đảm bảo đã có .env.local với MONGODB_URI
node scripts/create-admin.js
```

**Cách 2: Set environment variable trước khi chạy**

```bash
export MONGODB_URI="your-mongodb-connection-string"
node scripts/create-admin.js
```

**Cách 3: Chỉ định thông tin admin**

```bash
export MONGODB_URI="your-mongodb-connection-string"
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="YourSecurePassword123!"
export ADMIN_NAME="Tên Admin"
node scripts/create-admin.js
```

### Thông tin mặc định:

- **Email**: `admin@flower-shop.com`
- **Password**: `Admin123!@#`
- **Name**: `Quản trị viên`
- **Role**: `admin`
- **Status**: `active`

### Lưu ý:

- Script sẽ kiểm tra email đã tồn tại chưa
- Password sẽ được hash bằng bcrypt
- Sau khi tạo xong, bạn có thể đăng nhập tại `/auth/signin`

# USER MIGRATION - DATA ANALYSIS

## 📊 SCHEMA ANALYSIS

### 1. Collection: `admins`
**Model:** `src/models/Admin.ts`
**Fields:**
- `username`: string (required) - **KHÔNG migrate** (legacy field)
- `email`: string (required)
- `password`: string (required) - hashed bcrypt
- `role`: string (default: 'ADMIN') - **CẦN normalize** → 'admin' (lowercase)
- `name`: string
- `phone`: string
- `avatar`: string
- `active`: boolean (default: true) - **CẦN map** → status: 'active' | 'blocked'
- `createdAt`: Date

**Mapping to User:**
- `email` → `email` (unique, lowercase)
- `password` → `password` (giữ nguyên)
- `role: 'ADMIN'` → `role: 'admin'` (normalize)
- `name` → `name`
- `phone` → `phone`
- `avatar` → `avatar`
- `active: true` → `status: 'active'`
- `active: false` → `status: 'blocked'`
- `createdAt` → `createdAt`
- `provider` → `'local'` (default)
- `status: 'deleted'` → `null` (chưa có trong admins)

### 2. Collection: `customers`
**Model:** `src/models/Customer.ts`
**Fields:**
- `name`: string (required)
- `email`: string (required)
- `phone`: string (optional)
- `password`: string (optional) - hashed bcrypt (có thể null nếu OAuth)
- `provider`: string (default: 'local') - 'local' | 'google' | 'facebook'
- `googleId`: string (optional) - **CẦN preserve** cho OAuth
- `facebookId`: string (optional) - **CẦN preserve** cho OAuth
- `avatar`: string (optional)
- `address`: Array<{ label?, detail? }> - **CẦN preserve** cho customer profile
- `role`: string (enum: 'customer' | 'admin' | 'staff', default: 'customer')
- `active`: boolean (default: true) - **CẦN map** → status: 'active' | 'blocked'
- `createdAt`: Date
- `updatedAt`: Date

**Mapping to User:**
- `email` → `email` (unique, lowercase)
- `password` → `password` (có thể null nếu OAuth)
- `provider` → `provider` (giữ nguyên: 'local' | 'google' | 'facebook')
- `googleId` → **LƯU vào field tùy chỉnh** hoặc metadata (User schema chưa có, cần thêm)
- `facebookId` → **LƯU vào field tùy chỉnh** hoặc metadata (User schema chưa có, cần thêm)
- `name` → `name`
- `phone` → `phone`
- `avatar` → `avatar`
- `address[]` → **LƯU vào field tùy chỉnh** hoặc metadata (User schema chưa có)
- `role` → `role: 'customer'` (default)
- `active: true` → `status: 'active'`
- `active: false` → `status: 'blocked'`
- `createdAt` → `createdAt`
- `updatedAt` → **KHÔNG migrate** (User model không có updatedAt)

**⚠️ VẤN ĐỀ:** User schema hiện tại THIẾU:
- `googleId`, `facebookId` (cho OAuth)
- `address[]` (cho customer profile)

### 3. Collection: `users`
**Model:** `src/models/User.ts`
**Current Fields:**
- `name`: string (required)
- `email`: string (required, unique, index)
- `password`: string (optional)
- `role`: 'admin' | 'staff' | 'customer' (default: 'customer')
- `status`: 'active' | 'blocked' | 'deleted' (default: 'active')
- `phone`: string (optional)
- `avatar`: string (optional)
- `deletedAt`: Date (optional)
- `provider`: string (default: 'local')
- `createdAt`: Date (default: Date.now)

**⚠️ MISSING FIELDS:**
- `googleId`, `facebookId` (cho OAuth customers)
- `address[]` (cho customer shipping addresses)

---

## 🔄 CONFLICT RESOLUTION STRATEGY

### Email Conflicts (same email trong nhiều collections):

**Priority:**
1. `users` collection (CAO NHẤT - data mới nhất)
2. `customers` collection (TRUNG BÌNH)
3. `admins` collection (THẤP NHẤT - legacy)

**Resolution:**
- Nếu email đã tồn tại trong `users` → **SKIP migration**, log conflict
- Nếu email trong `customers` nhưng không trong `users` → **MIGRATE** với role='customer'
- Nếu email trong `admins` nhưng không trong `users`/`customers` → **MIGRATE** với role='admin'
- Nếu email trong nhiều collections → **MERGE** fields (ưu tiên data mới nhất), log conflict

---

## 📈 EXPECTED MIGRATION STATS

**Before Migration:**
- `admins`: ~1-2 records (estimation từ images)
- `customers`: ~3 records (estimation từ images)
- `users`: ~2 records (estimation từ images)

**After Migration:**
- `users`: ~6-7 records (tất cả users từ 3 collections, trừ conflicts)
- `admins`: READ-ONLY (không xóa)
- `customers`: READ-ONLY (không xóa)

---

## ⚠️ RISK ASSESSMENT

1. **Data Loss Risk:** LOW (không xóa collections gốc)
2. **Duplicate Email Risk:** MEDIUM (cần conflict resolution)
3. **OAuth Data Loss Risk:** HIGH (nếu thiếu googleId/facebookId)
4. **Address Data Loss Risk:** HIGH (nếu thiếu address field)

**Mitigation:**
- Backup collections trước migration
- Log all conflicts
- Preserve OAuth fields (googleId, facebookId)
- Preserve address data (array)

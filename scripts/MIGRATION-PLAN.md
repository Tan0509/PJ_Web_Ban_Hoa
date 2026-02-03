# USER MIGRATION PLAN - PRODUCTION READY

## 📋 TỔNG QUAN

**Mục tiêu:** Migrate tất cả users từ `admins` + `customers` collections về `users` collection (single source of truth).

**Nguyên tắc:**
- ✅ KHÔNG mất data
- ✅ KHÔNG phá chức năng hiện có
- ✅ KHÔNG xóa collections gốc
- ✅ Có rollback plan

---

## 🗂️ BƯỚC 1: PHÂN TÍCH DATA

### Schema Mapping

| Field | admins | customers | users (target) | Notes |
|-------|--------|-----------|----------------|-------|
| `name` | ✅ | ✅ | ✅ | Direct map |
| `email` | ✅ | ✅ | ✅ | Unique, lowercase |
| `password` | ✅ | ✅ (optional) | ✅ (optional) | Hashed bcrypt |
| `role` | 'ADMIN' | 'customer' | 'admin'\|'staff'\|'customer' | **CẦN normalize** |
| `status` | N/A | `active` (boolean) | 'active'\|'blocked'\|'deleted' | **CẦN map** |
| `phone` | ✅ | ✅ | ✅ | Direct map |
| `avatar` | ✅ | ✅ | ✅ | Direct map |
| `provider` | N/A | 'local'\|'google'\|'facebook' | 'local' (default) | **CẦN preserve** |
| `googleId` | N/A | ✅ | ❌ **THIẾU** | **CẦN thêm vào User schema** |
| `facebookId` | N/A | ✅ | ❌ **THIẾU** | **CẦN thêm vào User schema** |
| `address[]` | N/A | ✅ | ❌ **THIẾU** | **CẦN thêm vào User schema** |
| `createdAt` | ✅ | ✅ | ✅ | Direct map |
| `username` | ✅ | N/A | N/A | **KHÔNG migrate** (legacy) |

### Conflict Resolution

**Email duplicate priority:**
1. `users` collection (CAO NHẤT - skip nếu trùng)
2. `customers` collection (TRUNG BÌNH)
3. `admins` collection (THẤP NHẤT)

**Action:** Nếu email đã có trong `users` → **SKIP**, log conflict.

---

## 🗂️ BƯỚC 2: CẬP NHẬT USER SCHEMA

### File: `src/models/User.ts`

**CẦN THÊM các fields:**
- `googleId?: string` - OAuth Google ID
- `facebookId?: string` - OAuth Facebook ID
- `address?: IAddress[]` - Customer shipping addresses

**Lý do:**
- Customers có thể login bằng Google OAuth → cần `googleId`
- Customers có địa chỉ giao hàng → cần `address[]`
- NextAuth GoogleProvider sử dụng `googleId` để link account

---

## 🗂️ BƯỚC 3: MIGRATION SCRIPT

### File: `scripts/migrate-users.js`

**Tính năng:**
- ✅ Dry run mode (`MIGRATION_DRY_RUN=true`)
- ✅ Conflict detection & logging
- ✅ Email normalization (lowercase)
- ✅ Role normalization ('ADMIN' → 'admin')
- ✅ Status mapping (active → 'active', false → 'blocked')
- ✅ Preserve OAuth fields (googleId, facebookId)
- ✅ Preserve address array
- ✅ Log file output (`logs/migration-*.log`)
- ✅ JSON conflict report (`logs/migration-conflicts-*.json`)

**Usage:**
```bash
# Dry run (không write DB)
MIGRATION_DRY_RUN=true npm run migrate-users

# Live migration (write DB)
npm run migrate-users
```

---

## 🗂️ BƯỚC 4: VERIFY MIGRATION

### Checklist After Migration

1. **Count Records:**
   ```bash
   # MongoDB Compass hoặc mongo shell
   db.admins.countDocuments()     # Count trước migration
   db.customers.countDocuments()  # Count trước migration
   db.users.countDocuments()      # Count sau migration
   ```

2. **Email List:**
   - So sánh danh sách email từ `admins` + `customers` với `users`
   - Đảm bảo không mất email nào (trừ conflicts)

3. **Login Test:**
   - Test admin login (từ `admins` collection cũ)
   - Test customer login (từ `customers` collection cũ)
   - Verify NextAuth session có role đúng

4. **Admin Panel:**
   - Verify trang "Quản lý người dùng" hiển thị TẤT CẢ users
   - Verify search/filter hoạt động
   - Verify pagination hoạt động

5. **OAuth Test:**
   - Test Google login (customers có `googleId`)
   - Verify `googleId` được preserve trong `users`

---

## 🗂️ BƯỚC 5: CODE REFACTOR

### Files Cần Sửa:

1. **`src/models/User.ts`** - Thêm fields: `googleId`, `facebookId`, `address[]`

2. **`src/pages/api/auth/[...nextauth].ts`** - Đổi Customer model → User model
   - Dòng 54-73: Customer login logic
   - Dòng 126-161: Google OAuth customer creation
   - **Thay đổi:** Query `User.findOne({ email, role: 'customer' })` thay vì `Customer.findOne({ email })`

3. **`src/app/api/user/me/route.ts`** - Đổi Customer model → User model

4. **`src/app/api/user/update/route.ts`** - Đổi Customer model → User model

5. **`src/app/api/user/change-password/route.ts`** - Đổi Customer model → User model

6. **`src/app/api/user/address/route.ts`** - Đổi Customer model → User model

7. **`src/pages/api/auth/signup.ts`** - Đổi Customer model → User model

8. **`src/pages/api/auth/google/callback.ts`** - Đã deprecated (không cần sửa)

9. **`src/app/(customer)/profile/page.tsx`** - Có thể cần update nếu logic phụ thuộc Customer model

**⚠️ LƯU Ý:** 
- Admin APIs (`/api/admin/users/*`) đã dùng `User` model → **KHÔNG CẦN SỬA**
- Chỉ cần sửa Customer-related APIs và NextAuth customer logic

---

## 🗂️ BƯỚC 6: LEGACY STRATEGY

### Collections: `admins` và `customers`

**Status:** READ-ONLY (không xóa ngay)

**Strategy:**
1. **Immediate:** Mark as READ-ONLY, không tạo mới
2. **1-2 weeks:** Monitor migration, verify no issues
3. **1 month:** Đánh giá xóa collections (backup trước khi xóa)

**Backup Plan:**
```bash
# MongoDB backup (before deletion)
mongodump --uri="your-mongodb-uri" --collection=admins --out=./backup
mongodump --uri="your-mongodb-uri" --collection=customers --out=./backup
```

---

## 🗂️ BƯỚC 7: ROLLBACK PLAN

### Nếu Migration Fail:

1. **Revert Code:**
   - Revert User model changes
   - Revert NextAuth changes
   - Revert Customer API changes

2. **Restore Data:**
   - Collections `admins` và `customers` vẫn còn nguyên (không xóa)
   - Có thể xóa users mới được migrate (theo log file)

3. **Rollback Script:**
   - Tạo script `scripts/rollback-migration.js` để:
     - Xóa users đã migrate (theo `logs/migration-*.log`)
     - Restore từ backup (nếu có)

---

## 📄 MIGRATION CHECKLIST

### Before Migration:
- [ ] Backup MongoDB database
- [ ] Test migration script với `MIGRATION_DRY_RUN=true`
- [ ] Verify User schema đã có đủ fields (googleId, facebookId, address)
- [ ] Review conflict resolution strategy

### During Migration:
- [ ] Run migration script (live mode)
- [ ] Monitor log file (`logs/migration-*.log`)
- [ ] Check conflict reports (`logs/migration-conflicts-*.json`)

### After Migration:
- [ ] Verify count records (admins + customers = users added)
- [ ] Test admin login
- [ ] Test customer login
- [ ] Test Google OAuth login
- [ ] Verify Admin Panel hiển thị đủ users
- [ ] Verify search/filter/pagination

### Code Refactor:
- [ ] Update User model (add fields)
- [ ] Update NextAuth (Customer → User)
- [ ] Update Customer APIs (Customer → User)
- [ ] Test all Customer-related features
- [ ] Deploy to staging
- [ ] Final verification

### Legacy Cleanup (1 month later):
- [ ] Backup `admins` và `customers` collections
- [ ] Verify no usage of legacy collections
- [ ] Drop `admins` collection
- [ ] Drop `customers` collection

---

## ⚠️ RISKS & MITIGATION

| Risk | Severity | Mitigation |
|------|----------|------------|
| Data loss | HIGH | Không xóa collections gốc, backup trước migration |
| Email conflicts | MEDIUM | Skip nếu trùng, log conflicts |
| OAuth data loss | HIGH | Preserve googleId/facebookId trong migration |
| Address data loss | HIGH | Preserve address[] trong migration |
| Login failure | MEDIUM | Test login sau migration, có rollback plan |
| API breakage | MEDIUM | Refactor code cẩn thận, test đầy đủ |

---

## 📞 SUPPORT

Nếu migration gặp vấn đề:
1. Check log file: `logs/migration-*.log`
2. Check conflicts: `logs/migration-conflicts-*.json`
3. Verify collections còn nguyên
4. Run rollback script nếu cần

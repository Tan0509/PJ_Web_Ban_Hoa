# USER MIGRATION GUIDE - COMPLETE

## 📋 TỔNG QUAN

**Mục tiêu:** Migrate tất cả users từ `admins` + `customers` collections về `users` collection (single source of truth).

**Kết quả:** 
- Collection `users` là SINGLE SOURCE OF TRUTH
- Admin Panel hiển thị TẤT CẢ users
- NextAuth + APIs chỉ dùng `User` model
- `admins` và `customers` trở thành legacy/backup

---

## 🚀 BƯỚC 1: CHUẨN BỊ (TRƯỚC MIGRATION)

### 1.1. Backup MongoDB

```bash
# Backup toàn bộ database
mongodump --uri="your-mongodb-uri" --out=./backup-before-migration

# Hoặc backup từng collection
mongodump --uri="your-mongodb-uri" --collection=admins --out=./backup
mongodump --uri="your-mongodb-uri" --collection=customers --out=./backup
mongodump --uri="your-mongodb-uri" --collection=users --out=./backup
```

### 1.2. Update User Model (CẦN LÀM TRƯỚC)

**File:** `src/models/User.ts`

**CẦN THÊM fields:**
- `googleId?: string` - OAuth Google ID
- `facebookId?: string` - OAuth Facebook ID
- `address?: IAddress[]` - Customer shipping addresses

**Lý do:** Migration script cần schema có đủ fields để migrate customer data.

**Code cần thêm:**
```typescript
// Trong IUser interface:
googleId?: string;
facebookId?: string;
address?: IAddress[];

// Trong UserSchema:
googleId: { type: String },
facebookId: { type: String },
address: [{
  label: { type: String },
  detail: { type: String },
  recipient: { type: String },
  phone: { type: String },
  city: { type: String },
  district: { type: String },
  ward: { type: String },
  isDefault: { type: Boolean },
}],
```

### 1.3. Dry Run Migration (KIỂM TRA TRƯỚC)

```bash
# Dry run (không write DB, chỉ validate)
npm run migrate-users:dry-run
```

**Kiểm tra:**
- Log file: `logs/migration-*.log`
- Conflicts: `logs/migration-conflicts-*.json`
- Verify email list, role mapping

---

## 🚀 BƯỚC 2: CHẠY MIGRATION (LIVE)

### 2.1. Run Migration Script

```bash
# Live migration (write DB)
npm run migrate-users
```

**Kỳ vọng:**
- Migrate admins → users (role=admin)
- Migrate customers → users (role=customer)
- Skip nếu email trùng (conflict)
- Log conflicts ra file

### 2.2. Verify Migration

**Kiểm tra log file:**
```bash
# Xem log file
cat logs/migration-*.log

# Xem conflicts
cat logs/migration-conflicts-*.json
```

**Verify counts:**
```bash
# MongoDB Compass hoặc mongo shell
db.admins.countDocuments()     # Count trước migration
db.customers.countDocuments()  # Count trước migration  
db.users.countDocuments()      # Count sau migration

# Expected: users.count ≈ admins.count + customers.count - conflicts
```

**Verify data:**
- Check admin users có `role='admin'`
- Check customer users có `role='customer'`
- Check OAuth users có `googleId`/`facebookId`
- Check customers có `address[]`

---

## 🚀 BƯỚC 3: REFACTOR CODE (SAU MIGRATION)

### 3.1. Files Cần Sửa (8 files)

**Chi tiết:** Xem `scripts/MIGRATION-REFACTOR-CHECKLIST.md`

**Tóm tắt:**
1. ✅ `src/models/User.ts` - Đã update (trong Bước 1.2)
2. ⚠️ `src/pages/api/auth/[...nextauth].ts` - Customer → User
3. ⚠️ `src/app/api/user/me/route.ts` - Customer → User
4. ⚠️ `src/app/api/user/update/route.ts` - Customer → User
5. ⚠️ `src/app/api/user/change-password/route.ts` - Customer → User
6. ⚠️ `src/app/api/user/address/route.ts` - Customer → User
7. ⚠️ `src/pages/api/auth/signup.ts` - Customer → User
8. ⚠️ `src/app/(customer)/profile/page.tsx` - Review (nếu cần)

### 3.2. Refactor NextAuth (CRITICAL)

**File:** `src/pages/api/auth/[...nextauth].ts`

**Thay đổi:**
```typescript
// FROM: Customer.findOne({ email })
// TO: User.findOne({ email, role: 'customer' })

// FROM: Customer.create/updateOne
// TO: User.create/updateOne
```

**Lý do:** NextAuth cần query từ `users` collection.

### 3.3. Refactor Customer APIs

**Tất cả Customer APIs cần:**
```typescript
// FROM: import Customer from '@/models/Customer'
// TO: import User from '@/models/User'

// FROM: Customer.findById/save
// TO: User.findById/save (với role='customer' filter nếu cần)
```

---

## 🚀 BƯỚC 4: TEST SAU REFACTOR

### 4.1. Test Login

- [ ] Admin login (credentials)
- [ ] Customer login (credentials)
- [ ] Google OAuth login
- [ ] Verify NextAuth session có role đúng

### 4.2. Test APIs

- [ ] GET `/api/user/me` - Customer profile
- [ ] PATCH `/api/user/update` - Update profile
- [ ] POST `/api/user/change-password` - Change password
- [ ] POST `/api/user/address` - Add address
- [ ] POST `/api/auth/signup` - Signup

### 4.3. Test Admin Panel

- [ ] Admin Panel hiển thị TẤT CẢ users (từ `users` collection)
- [ ] Search/filter hoạt động
- [ ] Pagination hoạt động
- [ ] Add/Edit/Delete user hoạt động

---

## 🚀 BƯỚC 5: LEGACY COLLECTIONS (SAU 1 THÁNG)

### 5.1. Monitor (1-2 weeks)

- Verify không có code nào query `admins`/`customers`
- Verify migration stable, no issues
- Backup `admins` và `customers` collections

### 5.2. Mark as Legacy (2-4 weeks)

- Add comment: "LEGACY - Do not use, data migrated to users collection"
- Verify no dependencies

### 5.3. Drop Collections (1 month+)

```bash
# Backup trước khi xóa
mongodump --uri="your-mongodb-uri" --collection=admins --out=./backup-final
mongodump --uri="your-mongodb-uri" --collection=customers --out=./backup-final

# Drop collections
# (via MongoDB Compass hoặc mongo shell)
db.admins.drop()
db.customers.drop()
```

---

## 🔄 ROLLBACK PLAN

### Nếu Migration Fail:

1. **Revert Data:**
   ```bash
   # Run rollback script
   npm run migrate-users:rollback
   ```

2. **Revert Code:**
   ```bash
   git revert <commit-hash>
   # hoặc
   git checkout <previous-commit> -- src/models/User.ts src/pages/api/auth/[...nextauth].ts ...
   ```

3. **Restore Backup:**
   ```bash
   mongorestore --uri="your-mongodb-uri" ./backup-before-migration
   ```

---

## 📊 MIGRATION STATS (Expected)

**Before Migration:**
- `admins`: ~1-2 records
- `customers`: ~3 records
- `users`: ~2 records

**After Migration:**
- `users`: ~6-7 records (all users from 3 collections, minus conflicts)
- `admins`: READ-ONLY (backup)
- `customers`: READ-ONLY (backup)

---

## ⚠️ RISKS & MITIGATION

| Risk | Severity | Mitigation |
|------|----------|------------|
| Data loss | HIGH | Backup, không xóa collections gốc |
| Email conflicts | MEDIUM | Skip nếu trùng, log conflicts |
| OAuth data loss | HIGH | Preserve googleId/facebookId |
| Address data loss | HIGH | Preserve address[] |
| Login failure | MEDIUM | Test login, có rollback |
| API breakage | MEDIUM | Refactor cẩn thận, test đầy đủ |

---

## 📄 FILES CREATED

1. `scripts/migrate-users.js` - Migration script
2. `scripts/migrate-users-rollback.js` - Rollback script
3. `scripts/migrate-users-analysis.md` - Data analysis
4. `scripts/MIGRATION-PLAN.md` - Migration plan
5. `scripts/MIGRATION-REFACTOR-CHECKLIST.md` - Code refactor checklist
6. `scripts/MIGRATION-GUIDE.md` - This file (master guide)

---

## 📞 QUICK REFERENCE

```bash
# 1. Update User model (trước migration)
# Edit src/models/User.ts

# 2. Dry run (kiểm tra)
npm run migrate-users:dry-run

# 3. Live migration
npm run migrate-users

# 4. Verify
# Check logs/migration-*.log

# 5. Refactor code
# Follow MIGRATION-REFACTOR-CHECKLIST.md

# 6. Test
# Test login, APIs, Admin Panel

# 7. Rollback (nếu cần)
npm run migrate-users:rollback
```

---

## ✅ FINAL CHECKLIST

- [ ] Backup MongoDB
- [ ] Update User model (add fields)
- [ ] Dry run migration
- [ ] Live migration
- [ ] Verify migration (counts, data)
- [ ] Refactor code (8 files)
- [ ] Test login (admin, customer, Google)
- [ ] Test APIs (customer profile, update, password, address)
- [ ] Test Admin Panel (hiển thị đủ users)
- [ ] Monitor 1-2 weeks
- [ ] Backup legacy collections
- [ ] Drop legacy collections (1 month+)

---

**🎯 Mục tiêu cuối:** Collection `users` là SINGLE SOURCE OF TRUTH cho tất cả users (admin, staff, customer).

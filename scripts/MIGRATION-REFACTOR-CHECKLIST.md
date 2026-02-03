# USER MIGRATION - CODE REFACTOR CHECKLIST

Sau khi migration data thành công, cần refactor code để chỉ dùng `User` model thay vì `Customer` và `Admin` models.

---

## 📋 FILES CẦN SỬA (8 files)

### 1. `src/models/User.ts` ⚠️ CẦN SỬA TRƯỚC MIGRATION

**Mục đích:** Thêm fields từ Customer model (googleId, facebookId, address[])

**Thay đổi:**
```typescript
// Thêm vào IUser interface:
googleId?: string;
facebookId?: string;
address?: IAddress[];

// Thêm vào UserSchema:
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

**Lý do:** Customer data có OAuth IDs và address array cần preserve.

---

### 2. `src/pages/api/auth/[...nextauth].ts` ⚠️ CRITICAL

**Mục đích:** Đổi Customer model → User model trong NextAuth CredentialsProvider

**Thay đổi:**
- Dòng 54-73: Customer login logic
  - **FROM:** `Customer.findOne({ email })`
  - **TO:** `User.findOne({ email, role: 'customer' })`
- Dòng 126-161: Google OAuth customer creation
  - **FROM:** `Customer.findOne/create/updateOne`
  - **TO:** `User.findOne/create/updateOne`

**Lý do:** NextAuth cần query từ `users` collection thay vì `customers`.

---

### 3. `src/app/api/user/me/route.ts`

**Mục đích:** Đổi Customer model → User model

**Thay đổi:**
- **FROM:** `import Customer from '@/models/Customer'`
- **TO:** `import User from '@/models/User'`
- **FROM:** `Customer.findById(session.user.id)`
- **TO:** `User.findById(session.user.id)`

**Lý do:** Customer profile API cần query từ `users` collection.

---

### 4. `src/app/api/user/update/route.ts`

**Mục đích:** Đổi Customer model → User model

**Thay đổi:**
- **FROM:** `import Customer from '@/models/Customer'`
- **TO:** `import User from '@/models/User'`
- **FROM:** `Customer.findById/save`
- **TO:** `User.findById/save`

**Lý do:** Customer update API cần query từ `users` collection.

---

### 5. `src/app/api/user/change-password/route.ts`

**Mục đích:** Đổi Customer model → User model

**Thay đổi:**
- **FROM:** `import Customer from '@/models/Customer'`
- **TO:** `import User from '@/models/User'`
- **FROM:** `Customer.findById/save`
- **TO:** `User.findById/save`

**Lý do:** Customer change password API cần query từ `users` collection.

---

### 6. `src/app/api/user/address/route.ts`

**Mục đích:** Đổi Customer model → User model

**Thay đổi:**
- **FROM:** `import Customer from '@/models/Customer'`
- **TO:** `import User from '@/models/User'`
- **FROM:** `Customer.findById/save`
- **TO:** `User.findById/save`
- **FROM:** `user.address.push(...)`
- **TO:** `user.address.push(...)` (same, nhưng `user` là User model)

**Lý do:** Customer address API cần query từ `users` collection.

---

### 7. `src/pages/api/auth/signup.ts`

**Mục đích:** Đổi Customer model → User model

**Thay đổi:**
- **FROM:** `import Customer from '@/models/Customer'`
- **TO:** `import User from '@/models/User'`
- **FROM:** `Customer.findOne/create`
- **TO:** `User.findOne/create`
- **FROM:** `role: 'customer'` (implicit)
- **TO:** `role: 'customer'` (explicit)

**Lý do:** Signup API cần tạo user trong `users` collection.

---

### 8. `src/app/(customer)/profile/page.tsx`

**Mục đích:** Kiểm tra nếu có logic phụ thuộc Customer model

**Thay đổi:**
- Review code xem có hardcode `Customer` model không
- Nếu có → update để dùng NextAuth session (đã có sẵn)

**Lý do:** Frontend không nên phụ thuộc model, nên dùng API hoặc session.

---

## 📋 FILES KHÔNG CẦN SỬA

### ✅ Đã dùng User model (KHÔNG SỬA):
- `src/pages/api/admin/users/index.ts`
- `src/pages/api/admin/users/[id].ts`
- `src/pages/api/admin/*` (tất cả admin APIs)

### ✅ Đã deprecated (KHÔNG SỬA):
- `src/pages/api/auth/google/callback.ts` (deprecated)
- `src/pages/api/auth/google.ts` (deprecated)

---

## ✅ CHECKLIST REFACTOR

### Before Refactor:
- [ ] Migration data thành công
- [ ] Verify `users` collection có đủ data
- [ ] Backup codebase

### During Refactor:
- [ ] Update User model (add fields)
- [ ] Update NextAuth (Customer → User)
- [ ] Update Customer APIs (Customer → User)
- [ ] Update signup API (Customer → User)

### After Refactor:
- [ ] Test admin login
- [ ] Test customer login
- [ ] Test Google OAuth login
- [ ] Test customer profile API
- [ ] Test customer update API
- [ ] Test customer change password API
- [ ] Test customer address API
- [ ] Test signup API
- [ ] Verify Admin Panel hiển thị đủ users

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **User Model:** Phải update TRƯỚC khi chạy migration script (vì script cần schema có đủ fields).

2. **NextAuth:** Là CRITICAL - nếu sai sẽ break login toàn bộ. Test kỹ sau khi sửa.

3. **Customer APIs:** Tất cả phải dùng `User` model với `role: 'customer'` filter.

4. **Status Field:** 
   - Customer model dùng `active: boolean`
   - User model dùng `status: 'active' | 'blocked' | 'deleted'`
   - Migration script đã map: `active: true` → `status: 'active'`, `active: false` → `status: 'blocked'`

5. **OAuth Fields:** User model phải có `googleId`, `facebookId` để preserve OAuth data.

6. **Address Array:** User model phải có `address[]` để preserve customer addresses.

---

## 🔄 ROLLBACK REFACTOR

Nếu refactor có vấn đề:

1. **Revert Code:**
   ```bash
   git revert <commit-hash>
   # hoặc
   git checkout <previous-commit> -- src/models/User.ts src/pages/api/auth/[...nextauth].ts ...
   ```

2. **Verify:**
   - Test login vẫn hoạt động
   - Test APIs vẫn hoạt động

---

## 📞 SUPPORT

Nếu refactor gặp vấn đề:
1. Check error logs
2. Verify User model schema
3. Verify NextAuth query logic
4. Test từng API endpoint

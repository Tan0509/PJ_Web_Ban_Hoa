'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

// User Admin Detail Page
// Route: /admin/users/:id
// Allows admin to view and edit user details

type Address = {
  recipient?: string;
  phone?: string;
  city?: string;
  district?: string;
  ward?: string;
  detail?: string;
  isDefault?: boolean;
  label?: string;
};

type UserDetail = {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'customer';
  status: 'active' | 'blocked' | 'deleted';
  phone?: string;
  avatar?: string;
  provider?: string;
  googleId?: string | null;
  facebookId?: string | null;
  address?: Address[];
  createdAt?: string;
  hasOrders?: boolean;
};

const roles: { value: 'admin' | 'staff' | 'customer'; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'staff', label: 'Nhân viên' },
  { value: 'customer', label: 'Khách hàng' },
];

const statuses: { value: 'active' | 'blocked' | 'deleted'; label: string }[] = [
  { value: 'active', label: 'Hoạt động' },
  { value: 'blocked', label: 'Bị khóa' },
  { value: 'deleted', label: 'Đã xóa' },
];

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN');
}

function validatePhone(phone?: string) {
  if (!phone) return true; // Optional
  return /^0\d{9,10}$/.test(phone);
}

// Helper: Convert File to Data URL
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Avatar Upload Component (single image, similar to ImageDrop in Product Admin)
type AvatarUploadProps = {
  value: string;
  onChange: (url: string) => void;
};

function AvatarUpload({ value, onChange }: AvatarUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const url = await fileToDataUrl(file);
    onChange(url);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await handleFile(files[0]); // Only take first file for avatar
  };

  return (
    <div className="border border-dashed border-gray-300 rounded-md p-3 bg-gray-50">
      <div
        className={`flex flex-col items-center justify-center gap-2 text-sm text-gray-600 rounded-md border border-dashed ${
          isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-white'
        } py-6 cursor-pointer`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
          }
        }}
      >
        <div className="font-semibold">Chọn / kéo thả ảnh chính</div>
        <div className="text-xs text-gray-500">Hỗ trợ nhiều ảnh (drag & drop)</div>
        <label className="px-3 py-2 bg-white border border-gray-300 rounded-md text-xs font-semibold text-gray-700 hover:border-emerald-500 cursor-pointer">
          Chọn ảnh
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>

      {value ? (
        <div className="mt-3 relative group">
          <img src={value} alt="Avatar preview" className="h-32 w-full object-cover rounded-md border border-gray-200" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded-full px-2 py-0.5 opacity-0 group-hover:opacity-100 transition"
          >
            X
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  const userId = (params?.id as string) || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserDetail | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'customer' as 'admin' | 'staff' | 'customer',
    status: 'active' as 'active' | 'blocked' | 'deleted',
    phone: '',
    avatar: '',
    password: '', // New password (empty = don't change)
  });

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState<Address>({
    recipient: '',
    phone: '',
    city: '',
    district: '',
    ward: '',
    detail: '',
    isDefault: false,
  });

  // Check if form has changes
  const hasChanges = user && (
    form.name !== user.name ||
    form.role !== user.role ||
    form.status !== user.status ||
    form.phone !== (user.phone || '') ||
    form.avatar !== (user.avatar || '') ||
    form.password.trim() !== '' || // Password change counts as change
    JSON.stringify(addresses) !== JSON.stringify(user.address || [])
  );

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Không tìm thấy người dùng');
        }
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Lỗi tải thông tin');
      }
      const data: UserDetail = await res.json();
      setUser(data);
      setForm({
        name: data.name || '',
        email: data.email || '',
        role: data.role || 'customer',
        status: data.status || 'active',
        phone: data.phone || '',
        avatar: data.avatar || '',
        password: '', // Don't show existing password
      });
      setAddresses(data.address || []);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải thông tin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const handleSave = async () => {
    // Validation
    if (!form.name.trim()) {
      addToast('Họ và tên không được để trống', 'error');
      return;
    }

    if (form.phone && !validatePhone(form.phone)) {
      addToast('Số điện thoại không hợp lệ (phải là 10-11 chữ số bắt đầu bằng 0)', 'error');
      return;
    }

    // Password validation (if provided)
    if (form.password.trim()) {
      if (form.password.length < 8) {
        addToast('Mật khẩu phải có ít nhất 8 ký tự', 'error');
        return;
      }
    }

    // Confirm if changing role or status to blocked
    if (user) {
      if (form.role !== user.role) {
        const ok = window.confirm(`Bạn có chắc chắn muốn đổi vai trò từ "${user.role}" sang "${form.role}"?`);
        if (!ok) return;
      }
      if (form.status === 'blocked' && user.status !== 'blocked') {
        const ok = window.confirm('Bạn có chắc chắn muốn khóa tài khoản này?');
        if (!ok) return;
      }
    }

    try {
      setSaving(true);
      // Prepare payload - only send password if provided
      const payload: any = {
        name: form.name,
        role: form.role,
        status: form.status,
        phone: form.phone,
        avatar: form.avatar,
        address: addresses,
      };
      
      // Only include password if admin wants to change it
      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Cập nhật thất bại');
      }

      const updated: UserDetail = await res.json();
      setUser(updated);
      // Clear password field after successful save
      setForm({ ...form, password: '' });
      addToast('Cập nhật thành công', 'success');
      // Refetch to sync
      await fetchUser();
    } catch (err: any) {
      addToast(err.message || 'Cập nhật thất bại', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAddress = () => {
    setEditingAddressIndex(null);
    setShowAddressForm(true);
    setAddressForm({
      recipient: '',
      phone: '',
      city: '',
      district: '',
      ward: '',
      detail: '',
      isDefault: false,
    });
  };

  const handleEditAddress = (index: number) => {
    setEditingAddressIndex(index);
    setShowAddressForm(true);
    setAddressForm({ ...addresses[index] });
  };

  const handleSaveAddress = () => {
    if (!addressForm.recipient || !addressForm.phone || !addressForm.city || !addressForm.district || !addressForm.ward || !addressForm.detail) {
      addToast('Vui lòng điền đầy đủ thông tin địa chỉ', 'error');
      return;
    }

    if (!validatePhone(addressForm.phone)) {
      addToast('Số điện thoại không hợp lệ', 'error');
      return;
    }

    const newAddresses = [...addresses];
    
    // If setting as default, unset others
    if (addressForm.isDefault) {
      newAddresses.forEach((a, i) => {
        if (i !== editingAddressIndex) a.isDefault = false;
      });
    }

    if (editingAddressIndex !== null) {
      // Edit existing
      newAddresses[editingAddressIndex] = { ...addressForm };
    } else {
      // Add new
      newAddresses.push({ ...addressForm });
    }

    setAddresses(newAddresses);
    setEditingAddressIndex(null);
    setShowAddressForm(false);
    setAddressForm({
      recipient: '',
      phone: '',
      city: '',
      district: '',
      ward: '',
      detail: '',
      isDefault: false,
    });
  };

  const handleDeleteAddress = (index: number) => {
    const ok = window.confirm('Bạn có chắc chắn muốn xóa địa chỉ này?');
    if (!ok) return;
    setAddresses(addresses.filter((_, i) => i !== index));
  };

  const handleCancelAddress = () => {
    setEditingAddressIndex(null);
    setShowAddressForm(false);
    setAddressForm({
      recipient: '',
      phone: '',
      city: '',
      district: '',
      ward: '',
      detail: '',
      isDefault: false,
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="py-8 text-center text-gray-500">Đang tải...</div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="py-8 text-center text-red-600">{error || 'Không tìm thấy người dùng'}</div>
          <div className="text-center mt-4">
            <button
              onClick={() => router.push('/admin/users')}
              className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Quay lại danh sách
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Chi tiết người dùng</h1>
          <p className="text-sm text-gray-500">Xem và chỉnh sửa thông tin người dùng</p>
        </div>
        <div className="space-x-2">
          <button
            onClick={() => router.push('/admin/users')}
            className="px-4 py-2 rounded-md border border-gray-200 text-sm hover:bg-gray-50"
          >
            ⬅️ Quay lại
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Đang lưu...' : '💾 Lưu thay đổi'}
          </button>
        </div>
      </div>

      {/* Basic Info Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin cơ bản</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Họ và tên *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Email {user.hasOrders ? '(Đã có đơn hàng - không thể đổi)' : ''}</label>
            <input
              type="email"
              value={form.email}
              readOnly={user.hasOrders}
              className={`border border-gray-200 rounded-md px-3 h-11 text-sm ${user.hasOrders ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Số điện thoại</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="0373457243"
              className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Vai trò</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as any })}
              className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Trạng thái</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as any })}
              className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs text-gray-500">Avatar</label>
            <AvatarUpload
              value={form.avatar}
              onChange={(url) => setForm({ ...form, avatar: url })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">
              Mật khẩu mới {form.password.trim() ? '(sẽ được đổi khi lưu)' : '(để trống nếu không đổi)'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
              className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
            />
            {user.provider !== 'local' && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ User đăng nhập qua {user.provider === 'google' ? 'Google' : 'Facebook'}, chỉ nên đặt mật khẩu nếu muốn cho phép đăng nhập bằng email/password
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Ngày tạo</label>
            <input
              type="text"
              value={formatDate(user.createdAt)}
              readOnly
              className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-gray-100 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Login Info Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin đăng nhập</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-700">Email / Password</span>
            <span className={`text-xs font-semibold ${user.provider === 'local' ? 'text-emerald-600' : 'text-gray-400'}`}>
              {user.provider === 'local' ? '✅ Đã liên kết' : '❌ Chưa liên kết'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-700">Google</span>
            <span className={`text-xs font-semibold ${user.googleId ? 'text-emerald-600' : 'text-gray-400'}`}>
              {user.googleId ? '✅ Đã liên kết' : '❌ Chưa liên kết'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700">Facebook</span>
            <span className={`text-xs font-semibold ${user.facebookId ? 'text-emerald-600' : 'text-gray-400'}`}>
              {user.facebookId ? '✅ Đã liên kết' : '❌ Chưa liên kết'}
            </span>
          </div>
        </div>
      </div>

      {/* Address Section (only for customers) */}
      {form.role === 'customer' && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Địa chỉ giao hàng</h2>
            {editingAddressIndex === null && (
              <button
                onClick={handleAddAddress}
                className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
              >
                ➕ Thêm địa chỉ
              </button>
            )}
          </div>

          {/* Address Form (Add/Edit) */}
          {showAddressForm ? (
            <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
              <div className="grid gap-3 md:grid-cols-2 mb-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Tên người nhận *</label>
                  <input
                    type="text"
                    value={addressForm.recipient || ''}
                    onChange={(e) => setAddressForm({ ...addressForm, recipient: e.target.value })}
                    className="border border-gray-200 rounded-md px-3 h-10 text-sm bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Số điện thoại *</label>
                  <input
                    type="tel"
                    value={addressForm.phone || ''}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    className="border border-gray-200 rounded-md px-3 h-10 text-sm bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Tỉnh/Thành phố *</label>
                  <input
                    type="text"
                    value={addressForm.city || ''}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="border border-gray-200 rounded-md px-3 h-10 text-sm bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Quận/Huyện *</label>
                  <input
                    type="text"
                    value={addressForm.district || ''}
                    onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
                    className="border border-gray-200 rounded-md px-3 h-10 text-sm bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Phường/Xã *</label>
                  <input
                    type="text"
                    value={addressForm.ward || ''}
                    onChange={(e) => setAddressForm({ ...addressForm, ward: e.target.value })}
                    className="border border-gray-200 rounded-md px-3 h-10 text-sm bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Địa chỉ chi tiết *</label>
                  <input
                    type="text"
                    value={addressForm.detail || ''}
                    onChange={(e) => setAddressForm({ ...addressForm, detail: e.target.value })}
                    className="border border-gray-200 rounded-md px-3 h-10 text-sm bg-white"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={addressForm.isDefault || false}
                    onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                    className="accent-emerald-600"
                  />
                  <span>Địa chỉ mặc định</span>
                </label>
                <div className="space-x-2">
                  <button
                    onClick={handleCancelAddress}
                    className="px-3 py-1.5 rounded-md border border-gray-200 text-sm hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSaveAddress}
                    className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                  >
                    {editingAddressIndex !== null ? 'Lưu' : 'Thêm'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Address List */}
          {addresses.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">Chưa có địa chỉ nào</div>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">{addr.recipient}</span>
                        {addr.isDefault && (
                          <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Mặc định
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>📞 {addr.phone}</div>
                        <div>
                          📍 {[addr.detail, addr.ward, addr.district, addr.city].filter(Boolean).join(', ')}
                        </div>
                      </div>
                    </div>
                    <div className="space-x-2 ml-4">
                      <button
                        onClick={() => handleEditAddress(index)}
                        className="px-2 py-1 rounded text-xs border border-gray-200 hover:bg-gray-50"
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(index)}
                        className="px-2 py-1 rounded text-xs border border-rose-200 text-rose-700 hover:bg-rose-50"
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

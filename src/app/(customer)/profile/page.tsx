'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useToast } from '@/components/ToastProvider';
import { useStore } from '@/components/customer/StoreProvider';
import Link from 'next/link';

type Address = {
  id?: string;
  label?: string;
  detail?: string;
  recipient?: string;
  phone?: string;
  city?: string;
  district?: string;
  ward?: string;
  isDefault?: boolean;
};

type Profile = {
  name: string;
  email: string;
  phone?: string;
  role?: string;
  provider?: string;
  avatar?: string;
  address?: Address[];
};

type OrderLite = {
  _id: string;
  orderCode?: string;
  totalAmount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus?: string;
  createdAt?: string;
  expiresAt?: string;
};

// Helper function to convert file to data URL
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Avatar Upload Component
type AvatarUploadProps = {
  value: string;
  onChange: (url: string) => void;
};

function AvatarUpload({ value, onChange }: AvatarUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      onChange(dataUrl);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch (err) {
      alert('Không thể đọc file ảnh');
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await handleFile(files[0]);
  };

  return (
    <div className="space-y-2">
      <div
        className={`flex flex-col items-center justify-center gap-2 text-sm text-gray-600 rounded-md border border-dashed ${
          isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-gray-50'
        } py-6 cursor-pointer transition`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="font-semibold">Chọn / kéo thả ảnh đại diện</div>
        <div className="text-xs text-gray-500">Chỉ chọn 1 ảnh</div>
        <label className="px-3 py-2 bg-white border border-gray-300 rounded-md text-xs font-semibold text-gray-700 hover:border-emerald-500 cursor-pointer transition">
          Chọn ảnh
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>
      {value && (
        <div className="relative inline-block">
          <img src={value} alt="Avatar preview" className="h-24 w-24 object-cover rounded-md border border-gray-200" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded-full px-2 py-1 hover:bg-black/80 transition"
          >
            X
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const { addToast } = useToast();
  const { favorites, hydrated: favoritesHydrated } = useStore();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Forms state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', avatar: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [phoneError, setPhoneError] = useState<string>('');
  const [addressPhoneError, setAddressPhoneError] = useState<string>('');

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    recipient: '',
    phone: '',
    city: '',
    district: '',
    ward: '',
    detail: '',
    isDefault: false,
  });
  const [savingAddress, setSavingAddress] = useState(false);

  const isLocal = useMemo(() => (profile?.provider || (session?.user as any)?.provider || 'local') === 'local', [profile, session]);

  const orderSummary = useMemo(() => {
    const now = nowTick;
    // Pending = created but not paid yet (include COD orders without expiresAt)
    const pending = orders.filter((o) => o.orderStatus === 'PENDING' && o.paymentStatus === 'UNPAID');

    const cancelled = orders.filter((o) => o.orderStatus === 'CANCELLED' || o.paymentStatus === 'EXPIRED');

    const paid = orders.filter((o) => {
      if (o.orderStatus === 'CANCELLED' || o.paymentStatus === 'EXPIRED') return false;
      return o.paymentStatus && o.paymentStatus !== 'UNPAID';
    });

    // Countdown label only applies to pending orders that have expiresAt (online payments)
    const soonestExpiring = pending
      .filter((o) => !!o.expiresAt)
      .map((o) => ({ o, exp: new Date(o.expiresAt as string).getTime() }))
      .filter((x) => !Number.isNaN(x.exp) && x.exp > now)
      .sort((a, b) => a.exp - b.exp)[0];

    const timeLeftMs = soonestExpiring ? Math.max(0, soonestExpiring.exp - now) : 0;
    const mm = Math.floor(timeLeftMs / 60000);
    const ss = Math.floor((timeLeftMs % 60000) / 1000);
    const timeLeftLabel = soonestExpiring ? `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : '';

    return { pending, paid, cancelled, timeLeftLabel };
  }, [orders, nowTick]);

  const loadProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await fetch('/api/user/me', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setProfile(null);
          return;
        }
        throw new Error(data?.error || 'Không tải được thông tin');
      }
      const user = data?.data || {};
      setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'customer',
        provider: user.provider || 'local',
        avatar: user.avatar || '',
        address: user.address || [],
      });
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
      });
    } catch (err: any) {
      addToast(err.message || 'Không tải được thông tin', 'error');
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      loadProfile();
    }
    if (status === 'unauthenticated') {
      setProfile(null);
    }
  }, [status]);

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          setOrders([]);
          return;
        }
        throw new Error(data?.message || data?.error || 'Không tải được đơn hàng');
      }
      setOrders(Array.isArray(data?.data) ? data.data : []);
    } catch (err: any) {
      addToast(err?.message || 'Không tải được đơn hàng', 'error');
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      loadOrders();
    } else if (status === 'unauthenticated') {
      setOrders([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Countdown tick for pending payment orders
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const onChangeProfile = (field: keyof typeof profileForm, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
    // Validate phone in real-time
    if (field === 'phone') {
      const validation = validatePhone(value);
      setPhoneError(validation.error);
    }
  };

  const validateEmail = (v: string) => /\S+@\S+\.\S+/.test(v);
  
  // Validate phone: must be exactly 10 digits
  const validatePhone = (v: string): { valid: boolean; error: string } => {
    if (!v.trim()) {
      return { valid: true, error: '' }; // Empty is allowed (optional field)
    }
    const digits = v.replace(/\D/g, '');
    if (digits.length < 10) {
      return { valid: false, error: 'Thiếu số điện thoại' };
    }
    if (digits.length > 10) {
      return { valid: false, error: 'Dư số điện thoại' };
    }
    return { valid: true, error: '' };
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) return addToast('Họ tên không được để trống', 'error');
    if (!validateEmail(profileForm.email)) return addToast('Email không hợp lệ', 'error');
    const phoneValidation = validatePhone(profileForm.phone);
    if (!phoneValidation.valid) {
      setPhoneError(phoneValidation.error);
      return addToast(phoneValidation.error, 'error');
    }
    setSavingProfile(true);
    try {
      const res = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Cập nhật thất bại');
      const updated = data?.data || profileForm;
      setProfile((prev) =>
        prev
          ? { ...prev, name: updated.name || profileForm.name, phone: updated.phone ?? profileForm.phone, avatar: updated.avatar ?? profileForm.avatar }
          : null
      );
      setIsEditingProfile(false);
      addToast('Cập nhật thông tin thành công', 'success');
    } catch (err: any) {
      addToast(err.message || 'Cập nhật thất bại', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) return addToast('Vui lòng nhập đủ thông tin', 'error');
    if (passwordForm.next.length < 8) return addToast('Mật khẩu mới tối thiểu 8 ký tự', 'error');
    if (passwordForm.next === passwordForm.current) return addToast('Mật khẩu mới phải khác mật khẩu cũ', 'error');
    if (passwordForm.next !== passwordForm.confirm) return addToast('Xác nhận mật khẩu không khớp', 'error');
    setSavingPassword(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.next,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Đổi mật khẩu thất bại');
      setIsChangingPassword(false);
      setPasswordForm({ current: '', next: '', confirm: '' });
      addToast('Đổi mật khẩu thành công', 'success');
    } catch (err: any) {
      addToast(err.message || 'Đổi mật khẩu thất bại', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAddAddress = async () => {
    const { recipient, phone, city, district, ward, detail } = addressForm;
    if (!recipient.trim() || !phone.trim() || !city.trim() || !district.trim() || !ward.trim() || !detail.trim()) {
      return addToast('Vui lòng nhập đầy đủ thông tin địa chỉ', 'error');
    }
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      setAddressPhoneError(phoneValidation.error);
      return addToast(phoneValidation.error, 'error');
    }
    setSavingAddress(true);
    try {
      const res = await fetch('/api/user/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Thêm địa chỉ thất bại');
      setIsAddingAddress(false);
      setAddressForm({ recipient: '', phone: '', city: '', district: '', ward: '', detail: '', isDefault: false });
      await loadProfile();
      addToast('Thêm địa chỉ thành công', 'success');
    } catch (err: any) {
      addToast(err.message || 'Thêm địa chỉ thất bại', 'error');
    } finally {
      setSavingAddress(false);
    }
  };

  const addresses = profile?.address || [];

  return (
    <div className="container-section my-10 md:my-12 lg:my-16 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Thông tin cá nhân</h1>
        <p className="text-gray-600 text-sm md:text-base">Quản lý thông tin tài khoản, địa chỉ và đơn hàng của bạn.</p>
      </div>

      {/* Row 1: Thông tin tài khoản + Bảo mật (2 cột) */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* A. Thông tin tài khoản */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-800">Thông tin tài khoản</div>
              <div className="text-xs text-gray-500">Hiển thị họ tên, email, phương thức đăng nhập</div>
            </div>
            {!isEditingProfile ? (
              <button className="text-sm font-semibold text-[#0f5c5c] hover:underline" onClick={() => setIsEditingProfile(true)}>
                Cập nhật thông tin
              </button>
            ) : null}
          </div>

          {!isEditingProfile ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Họ tên</span>
                <span className="font-semibold text-gray-900">{profile?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email</span>
                <span className="font-semibold text-gray-900">{profile?.email || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Số điện thoại</span>
                <span className="font-semibold text-gray-900">{profile?.phone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Vai trò</span>
                <span className="font-semibold text-gray-900 capitalize">{profile?.role || 'customer'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phương thức đăng nhập</span>
                <span className="font-semibold text-gray-900">{profile?.provider || 'local'}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <label className="text-gray-600">Họ tên *</label>
                <input
                  className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
                  value={profileForm.name}
                  onChange={(e) => onChangeProfile('name', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-gray-600">Email {profile?.provider === 'google' && '(đăng nhập Google - chỉ đọc)'}</label>
                <input
                  className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
                  value={profileForm.email}
                  onChange={(e) => onChangeProfile('email', e.target.value)}
                  readOnly={profile?.provider === 'google'}
                />
              </div>
              <div className="space-y-1">
                <label className="text-gray-600">Số điện thoại</label>
                <input
                  className={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 ${
                    phoneError ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-[#0f5c5c]'
                  }`}
                  value={profileForm.phone}
                  onChange={(e) => onChangeProfile('phone', e.target.value)}
                />
                {phoneError && <div className="text-xs text-red-500 mt-1">{phoneError}</div>}
              </div>
              <div className="space-y-1">
                <label className="text-gray-600">Ảnh đại diện</label>
                <AvatarUpload value={profileForm.avatar} onChange={(url) => onChangeProfile('avatar', url)} />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={savingProfile}
                  onClick={handleSaveProfile}
                  className="rounded-md bg-[#0f5c5c] px-4 py-2 text-white font-semibold shadow hover:bg-[#0c4d4d] transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {savingProfile ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(false);
                    setProfileForm({
                      name: profile?.name || '',
                      email: profile?.email || '',
                      phone: profile?.phone || '',
                      avatar: profile?.avatar || '',
                    });
                    setPhoneError('');
                  }}
                  className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>

        {/* E. Bảo mật & phiên đăng nhập */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-800">Bảo mật & phiên đăng nhập</div>
              <div className="text-xs text-gray-500">Quản lý đăng nhập và mật khẩu</div>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Trạng thái</span>
              <span className="font-semibold text-[#0f5c5c]">{profile ? 'Đã đăng nhập' : 'Chưa đăng nhập'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Đổi mật khẩu (local)</span>
              <button
                disabled={!isLocal}
                title={!isLocal ? 'Tài khoản Google không sử dụng mật khẩu' : undefined}
                onClick={() => isLocal && setIsChangingPassword((v) => !v)}
                className={`text-sm font-semibold ${isLocal ? 'text-[#0f5c5c] hover:underline' : 'text-gray-400 cursor-not-allowed'}`}
              >
                Đổi mật khẩu
              </button>
            </div>
            {isChangingPassword && (
              <div className="space-y-2">
                <input
                  className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
                  type="password"
                  placeholder="Mật khẩu hiện tại"
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, current: e.target.value }))}
                />
                <input
                  className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
                  type="password"
                  placeholder="Mật khẩu mới"
                  value={passwordForm.next}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, next: e.target.value }))}
                />
                <input
                  className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm: e.target.value }))}
                />
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    disabled={savingPassword}
                    onClick={handleChangePassword}
                    className="rounded-md bg-[#0f5c5c] px-3 py-2 text-white font-semibold shadow hover:bg-[#0c4d4d] transition disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {savingPassword ? 'Đang lưu...' : 'Lưu'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordForm({ current: '', next: '', confirm: '' });
                    }}
                    className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Đăng xuất</span>
              <button className="text-sm font-semibold text-[#0f5c5c] hover:underline" onClick={() => signOut({ callbackUrl: '/' })}>
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Sản phẩm yêu thích (full width) */}
      <div>
        {/* D. Sản phẩm yêu thích */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-800">Sản phẩm yêu thích</div>
              <div className="text-xs text-gray-500">Danh sách sản phẩm bạn đã lưu</div>
            </div>
            <a className="text-sm font-semibold text-[#0f5c5c] hover:underline" href="/favorites">
              Xem tất cả
            </a>
          </div>
          
          {!favoritesHydrated ? (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 text-center">
              Đang tải...
            </div>
          ) : favorites.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 text-center">
              Bạn chưa có sản phẩm yêu thích.
            </div>
          ) : (
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
              {favorites.slice(0, 12).map((product) => {
                const slugClean = (product.slug || product._id || '').toString().replace(/"/g, '');
                const href = `/product/${slugClean}`;
                const img = product.images?.[0];
                return (
                  <Link
                    key={product._id || product.slug || product.name}
                    href={href}
                    className="group relative aspect-square overflow-hidden rounded-md border border-gray-200 bg-gray-100 hover:border-[#0f5c5c] transition"
                    title={product.name}
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">Không có ảnh</div>
                    )}
                  </Link>
                );
              })}
              {favorites.length > 12 && (
                <div className="col-span-full text-center pt-2">
                  <a href="/favorites" className="text-sm font-semibold text-[#0f5c5c] hover:underline">
                    Xem thêm {favorites.length - 12} sản phẩm khác →
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Địa chỉ giao hàng (full width) */}
      <div>
        {/* B. Địa chỉ giao hàng */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-800">Địa chỉ giao hàng</div>
              <div className="text-xs text-gray-500">Quản lý địa chỉ nhận hàng, đánh dấu mặc định</div>
            </div>
            {!isAddingAddress ? (
              <button className="text-sm font-semibold text-[#0f5c5c] hover:underline" onClick={() => setIsAddingAddress(true)}>
                Thêm địa chỉ
              </button>
            ) : null}
          </div>

          {isAddingAddress && (
            <div className="space-y-2 text-sm">
              <input
                className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
                placeholder="Tên người nhận"
                value={addressForm.recipient}
                onChange={(e) => setAddressForm((prev) => ({ ...prev, recipient: e.target.value }))}
              />
              <div>
                <input
                  className={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 ${
                    addressPhoneError ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-[#0f5c5c]'
                  }`}
                  placeholder="Số điện thoại"
                  value={addressForm.phone}
                  onChange={(e) => {
                    setAddressForm((prev) => ({ ...prev, phone: e.target.value }));
                    const validation = validatePhone(e.target.value);
                    setAddressPhoneError(validation.error);
                  }}
                />
                {addressPhoneError && <div className="text-xs text-red-500 mt-1">{addressPhoneError}</div>}
              </div>
              <input
                className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
                placeholder="Tỉnh/Thành"
                value={addressForm.city}
                onChange={(e) => setAddressForm((prev) => ({ ...prev, city: e.target.value }))}
              />
              <input
                className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
                placeholder="Quận/Huyện"
                value={addressForm.district}
                onChange={(e) => setAddressForm((prev) => ({ ...prev, district: e.target.value }))}
              />
              <input
                className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
                placeholder="Phường/Xã"
                value={addressForm.ward}
                onChange={(e) => setAddressForm((prev) => ({ ...prev, ward: e.target.value }))}
              />
              <input
                className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
                placeholder="Địa chỉ chi tiết"
                value={addressForm.detail}
                onChange={(e) => setAddressForm((prev) => ({ ...prev, detail: e.target.value }))}
              />
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-[#0f5c5c] focus:ring-[#0f5c5c]"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
                />
                Đặt làm địa chỉ mặc định
              </label>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  disabled={savingAddress}
                  onClick={handleAddAddress}
                  className="rounded-md bg-[#0f5c5c] px-4 py-2 text-white font-semibold shadow hover:bg-[#0c4d4d] transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {savingAddress ? 'Đang lưu...' : 'Lưu địa chỉ'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingAddress(false);
                    setAddressForm({ recipient: '', phone: '', city: '', district: '', ward: '', detail: '', isDefault: false });
                    setAddressPhoneError('');
                  }}
                  className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          {!addresses.length && !isAddingAddress && (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 text-center">
              Chưa có địa chỉ. Vui lòng thêm địa chỉ giao hàng.
            </div>
          )}

          {addresses.length > 0 && (
            <div className="space-y-3 text-sm">
              {addresses.map((addr, idx) => (
                <div key={addr.id || idx} className="rounded-md border border-gray-200 p-3 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{addr.label || 'Địa chỉ'}</span>
                      {addr.isDefault && <span className="text-xs text-white bg-[#0f5c5c] px-2 py-[2px] rounded-full">Mặc định</span>}
                    </div>
                    <div className="text-gray-700">{addr.detail}</div>
                    <div className="text-gray-600">{[addr.ward, addr.district, addr.city].filter(Boolean).join(', ')}</div>
                    <div className="text-gray-600">{addr.recipient}</div>
                    <div className="text-gray-600">{addr.phone}</div>
                  </div>
                  <div className="flex flex-col gap-2 text-xs font-semibold text-[#0f5c5c]">
                    <button className="hover:underline">Sửa</button>
                    <button className="hover:underline">Xóa</button>
                    {!addr.isDefault && <button className="hover:underline">Đặt mặc định</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Đơn hàng của tôi (full width) */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-800">Đơn hàng của tôi</div>
            <div className="text-xs text-gray-500">Theo dõi trạng thái đơn hàng</div>
          </div>
          <a className="text-sm font-semibold text-[#0f5c5c] hover:underline" href="/orders">
            Xem tất cả
          </a>
        </div>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 space-y-1">
            <div className="font-semibold text-gray-900">Chờ thanh toán</div>
            {loadingOrders ? (
              <div className="text-gray-600">Đang tải...</div>
            ) : (
              <>
                <div className="text-gray-600">{orderSummary.pending.length} đơn</div>
                {orderSummary.timeLeftLabel ? (
                  <div className="text-xs text-gray-500">Còn lại: {orderSummary.timeLeftLabel}</div>
                ) : null}
              </>
            )}
          </div>
          <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 space-y-1">
            <div className="font-semibold text-gray-900">Đã thanh toán</div>
            {loadingOrders ? <div className="text-gray-600">Đang tải...</div> : <div className="text-gray-600">{orderSummary.paid.length} đơn</div>}
          </div>
          <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 space-y-1">
            <div className="font-semibold text-gray-900">Đã huỷ / hết hạn</div>
            {loadingOrders ? (
              <div className="text-gray-600">Đang tải...</div>
            ) : (
              <div className="text-gray-600">{orderSummary.cancelled.length} đơn</div>
            )}
          </div>
        </div>
        {loadingOrders ? (
          <div className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-600 text-center">
            Đang tải đơn hàng...
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-600 text-center">
            Chưa có đơn hàng. Khi đặt hàng, bạn sẽ thấy mã đơn, ngày tạo, tổng tiền và trạng thái tại đây.
          </div>
        ) : (
          <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-700 space-y-2">
            {orders.slice(0, 3).map((o) => {
              const isExpired = o.orderStatus === 'CANCELLED' || o.paymentStatus === 'EXPIRED';
              const isPending = !isExpired && o.orderStatus === 'PENDING' && o.paymentStatus === 'UNPAID' && o.expiresAt;
              const isPaid = !isExpired && o.paymentStatus && o.paymentStatus !== 'UNPAID';
              const expMs = isPending ? new Date(o.expiresAt as string).getTime() : 0;
              const left = isPending && !Number.isNaN(expMs) ? Math.max(0, expMs - nowTick) : 0;
              const mm = Math.floor(left / 60000);
              const ss = Math.floor((left % 60000) / 1000);
              const leftLabel = isPending ? `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : '';

              const statusLabel = isExpired ? 'Đã huỷ / hết hạn' : isPaid ? 'Đã thanh toán' : 'Chờ thanh toán';

              return (
                <div key={o._id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{o.orderCode || `#${o._id.slice(-6)}`}</div>
                    <div className="text-xs text-gray-500">
                      {o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : ''}
                      {isPending && leftLabel ? ` • Còn lại: ${leftLabel}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{(o.totalAmount || 0).toLocaleString('vi-VN')} VNĐ</div>
                    <div className="text-xs text-gray-600">{statusLabel}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

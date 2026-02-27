'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useToast } from '@/components/ToastProvider';
import { useStore } from '@/components/customer/StoreProvider';
import Link from 'next/link';

type Profile = {
  name: string;
  email: string;
  phone?: string;
  role?: string;
  provider?: string;
  avatar?: string;
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type AvatarUploadProps = {
  value: string;
  onChange: (url: string) => void;
};

function AvatarUpload({ value, onChange }: AvatarUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;
    const dataUrl = await fileToDataUrl(file);
    onChange(dataUrl);
    if (inputRef.current) inputRef.current.value = '';
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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', avatar: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  const isLocal = useMemo(
    () => (profile?.provider || (session?.user as any)?.provider || 'local') === 'local',
    [profile, session]
  );

  const validateEmail = (v: string) => /\S+@\S+\.\S+/.test(v);
  const validatePhone = (v: string): { valid: boolean; error: string } => {
    if (!v.trim()) return { valid: true, error: '' };
    const digits = v.replace(/\D/g, '');
    if (digits.length < 10) return { valid: false, error: 'Thiếu số điện thoại' };
    if (digits.length > 10) return { valid: false, error: 'Dư số điện thoại' };
    return { valid: true, error: '' };
  };

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/user/me', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Không tải được thông tin');
      const user = data?.data || {};
      setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'customer',
        provider: user.provider || 'local',
        avatar: user.avatar || '',
      });
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
      });
    } catch (err: any) {
      addToast(err.message || 'Không tải được thông tin', 'error');
    }
  };

  useEffect(() => {
    if (status === 'authenticated') loadProfile();
  }, [status]);

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) return addToast('Họ tên không được để trống', 'error');
    if (!validateEmail(profileForm.email)) return addToast('Email không hợp lệ', 'error');
    const phoneValidation = validatePhone(profileForm.phone);
    if (!phoneValidation.valid) return addToast(phoneValidation.error, 'error');

    setSavingProfile(true);
    try {
      const res = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Cập nhật thất bại');
      setProfile((prev) => (prev ? { ...prev, ...profileForm } : prev));
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

  return (
    <div className="container-section my-10 md:my-12 lg:my-16 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Thông tin cá nhân</h1>
        <p className="text-gray-600 text-sm md:text-base">Quản lý thông tin tài khoản và bảo mật.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-800">Thông tin tài khoản</div>
            </div>
            {!isEditingProfile ? (
              <button className="text-sm font-semibold text-[#0f5c5c] hover:underline" onClick={() => setIsEditingProfile(true)}>
                Cập nhật thông tin
              </button>
            ) : null}
          </div>

          {!isEditingProfile ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Họ tên</span><span className="font-semibold text-gray-900">{profile?.name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Email</span><span className="font-semibold text-gray-900">{profile?.email || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Số điện thoại</span><span className="font-semibold text-gray-900">{profile?.phone || '—'}</span></div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <label className="text-gray-600">Họ tên *</label>
                <input className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]" value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-gray-600">Email</label>
                <input className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]" value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-gray-600">Số điện thoại</label>
                <input
                  className={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 ${phoneError ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-[#0f5c5c]'}`}
                  value={profileForm.phone}
                  onChange={(e) => {
                    setProfileForm((p) => ({ ...p, phone: e.target.value }));
                    setPhoneError(validatePhone(e.target.value).error);
                  }}
                />
                {phoneError && <div className="text-xs text-red-500 mt-1">{phoneError}</div>}
              </div>
              <div className="space-y-1">
                <label className="text-gray-600">Ảnh đại diện</label>
                <AvatarUpload value={profileForm.avatar} onChange={(url) => setProfileForm((p) => ({ ...p, avatar: url }))} />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="button" disabled={savingProfile} onClick={handleSaveProfile} className="rounded-md bg-[#0f5c5c] px-4 py-2 text-white font-semibold shadow hover:bg-[#0c4d4d] transition disabled:opacity-70">
                  {savingProfile ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button type="button" onClick={() => setIsEditingProfile(false)} className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div className="text-sm font-semibold text-gray-800">Bảo mật & phiên đăng nhập</div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Đổi mật khẩu (local)</span>
              <button
                disabled={!isLocal}
                onClick={() => isLocal && setIsChangingPassword((v) => !v)}
                className={`text-sm font-semibold ${isLocal ? 'text-[#0f5c5c] hover:underline' : 'text-gray-400 cursor-not-allowed'}`}
              >
                Đổi mật khẩu
              </button>
            </div>
            {isChangingPassword && (
              <div className="space-y-2">
                <input className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]" type="password" placeholder="Mật khẩu hiện tại" value={passwordForm.current} onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))} />
                <input className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]" type="password" placeholder="Mật khẩu mới" value={passwordForm.next} onChange={(e) => setPasswordForm((p) => ({ ...p, next: e.target.value }))} />
                <input className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]" type="password" placeholder="Nhập lại mật khẩu mới" value={passwordForm.confirm} onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))} />
                <div className="flex items-center gap-3 pt-1">
                  <button type="button" disabled={savingPassword} onClick={handleChangePassword} className="rounded-md bg-[#0f5c5c] px-3 py-2 text-white font-semibold shadow hover:bg-[#0c4d4d] transition disabled:opacity-70">
                    {savingPassword ? 'Đang lưu...' : 'Lưu'}
                  </button>
                  <button type="button" onClick={() => setIsChangingPassword(false)} className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
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
          <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 text-center">Đang tải...</div>
        ) : favorites.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 text-center">Bạn chưa có sản phẩm yêu thích.</div>
        ) : (
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {favorites.slice(0, 12).map((product) => {
              const slugClean = (product.slug || product._id || '').toString().replace(/"/g, '');
              const href = `/product/${slugClean}`;
              const img = product.images?.[0];
              return (
                <Link key={product._id || product.slug || product.name} href={href} className="group relative aspect-square overflow-hidden rounded-md border border-gray-200 bg-gray-100 hover:border-[#0f5c5c] transition" title={product.name}>
                  {img ? <img src={img} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" /> : <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">Không có ảnh</div>}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


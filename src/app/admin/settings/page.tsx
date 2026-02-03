'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useToast } from '@/components/ToastProvider';
import Link from 'next/link';

// Admin Settings Page
// Scope: Admin panel only
// Do NOT affect customer or auth core

type MeResponse = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

export default function AdminSettings() {
  const { addToast } = useToast();
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);

  const [notificationToggle, setNotificationToggle] = useState(false);
  const [notificationVolume, setNotificationVolume] = useState(70);

  // Order notification emails (admin)
  const [orderEmails, setOrderEmails] = useState<string[]>(['']);
  const [savingEmails, setSavingEmails] = useState(false);

  // Favicon
  const [favicon, setFavicon] = useState<string>('');
  const [savingFavicon, setSavingFavicon] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const loadOrderEmails = async () => {
    try {
      const res = await fetch('/api/admin/settings/order-notify-emails');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Không tải được email thông báo');
      const list = Array.isArray(data?.emails) ? data.emails : [];
      setOrderEmails(list.length ? list : ['']);
    } catch (err: any) {
      // keep silent in settings page; user can still input manually
      setOrderEmails((prev) => (prev.length ? prev : ['']));
    }
  };

  const NOTIFICATION_SOUND_KEY = 'admin_notification_sound_enabled';
  const NOTIFICATION_VOLUME_KEY = 'admin_notification_sound_volume';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(NOTIFICATION_SOUND_KEY);
      setNotificationToggle(saved === 'true');
      const vol = localStorage.getItem(NOTIFICATION_VOLUME_KEY);
      if (vol !== null) {
        const n = parseInt(vol, 10);
        if (!Number.isNaN(n) && n >= 0 && n <= 100) setNotificationVolume(n);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleNotificationToggle = (checked: boolean) => {
    setNotificationToggle(checked);
    try {
      localStorage.setItem(NOTIFICATION_SOUND_KEY, String(checked));
    } catch {
      // ignore
    }
  };

  const handleNotificationVolume = (value: number) => {
    const v = Math.max(0, Math.min(100, value));
    setNotificationVolume(v);
    try {
      localStorage.setItem(NOTIFICATION_VOLUME_KEY, String(v));
    } catch {
      // ignore
    }
  };

  const loadFavicon = async () => {
    try {
      const res = await fetch('/api/admin/settings/favicon');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Không tải được favicon');
      setFavicon(data?.favicon || '');
    } catch (err: any) {
      // keep silent
      setFavicon('');
    }
  };

  const handleFaviconFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Vui lòng chọn file ảnh', 'error');
      return;
    }
    try {
      setUploadingFavicon(true);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, folder: 'favicon' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Tải ảnh lên thất bại');
      if (data?.url) {
        setFavicon(data.url);
        if (faviconInputRef.current) faviconInputRef.current.value = '';
      }
    } catch (err: any) {
      addToast(err?.message || 'Tải ảnh lên thất bại', 'error');
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleSaveFavicon = async () => {
    try {
      setSavingFavicon(true);
      const res = await fetch('/api/admin/settings/favicon', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favicon }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Lưu favicon thất bại');
      addToast('Đã lưu favicon', 'success');
      // Force reload to update favicon
      if (typeof window !== 'undefined') {
        const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (link && favicon) {
          link.href = favicon;
        } else if (favicon) {
          const newLink = document.createElement('link');
          newLink.rel = 'icon';
          newLink.href = favicon;
          document.head.appendChild(newLink);
        }
      }
    } catch (err: any) {
      addToast(err?.message || 'Lưu favicon thất bại', 'error');
    } finally {
      setSavingFavicon(false);
    }
  };

  const fetchMe = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/me');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Không tải được thông tin');
      }
      const data = await res.json();
      setMe(data);
    } catch (err: any) {
      setError(err?.message || 'Lỗi tải thông tin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
    loadOrderEmails();
    loadFavicon();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      addToast('Mật khẩu mới phải từ 8 ký tự', 'error');
      return;
    }
    if (newPassword === oldPassword) {
      addToast('Mật khẩu mới phải khác mật khẩu cũ', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('Mật khẩu mới không khớp', 'error');
      return;
    }
    try {
      setChanging(true);
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Đổi mật khẩu thất bại');
      }
      addToast('Đổi mật khẩu thành công', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      addToast(err?.message || 'Đổi mật khẩu thất bại', 'error');
    } finally {
      setChanging(false);
    }
  };

  const handleLogout = async () => {
    const ok = window.confirm('Bạn có chắc chắn muốn đăng xuất không?');
    if (!ok) return;
    try {
      // FIX: Use NextAuth signOut() to properly clear NextAuth session
      // This will clear NextAuth JWT token that middleware checks
      await signOut({ 
        redirect: false, // Don't auto redirect, we'll handle it
        callbackUrl: '/' // Redirect to home after logout
      });
      
      // Also clear legacy cookies (if any)
      await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {
        // Ignore errors if API doesn't exist
      });
      
      addToast('Đăng xuất thành công', 'success');
      // Redirect to home page
      router.push('/');
    } catch (err: any) {
      addToast(err?.message || 'Đăng xuất thất bại', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="mb-3">
          <h1 className="text-xl font-semibold text-gray-900">Cài đặt</h1>
          <p className="text-sm text-gray-500">Thông tin và bảo mật tài khoản admin</p>
        </div>

        <div className="grid gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-lg font-semibold text-gray-900 mb-2">Thông tin Admin</div>
            {loading ? (
              <div className="text-sm text-gray-500">Đang tải...</div>
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : me ? (
              <div className="space-y-2 text-sm text-gray-700">
                <div>
                  <span className="font-semibold">Tên:</span> {me.name}
                </div>
                <div>
                  <span className="font-semibold">Email:</span> {me.email}
                </div>
                <div>
                  <span className="font-semibold">Role:</span> {me.role}
                </div>
                <div>
                  <span className="font-semibold">Trạng thái:</span> {me.status || 'active'}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Không có dữ liệu.</div>
            )}
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-lg font-semibold text-gray-900 mb-2">Bảo mật</div>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Mật khẩu cũ</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Mật khẩu mới</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                  required
                  minLength={8}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                  required
                  minLength={8}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={changing}
                  className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {changing ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                </button>
              </div>
            </form>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 space-y-2">
            <div className="text-lg font-semibold text-gray-900 mb-2">Đăng xuất</div>
            <p className="text-sm text-gray-600">Thoát phiên đăng nhập admin hiện tại.</p>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-md bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700"
            >
              Đăng xuất Admin
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">Email nhận đơn hàng mới</div>
                <div className="text-sm text-gray-500">Gửi thông báo tới các email này khi có đơn mới (COD/Banking/Online).</div>
              </div>
              <Link
                href="/admin/settings/banking"
                className="text-sm font-semibold text-[#0f5c5c] hover:underline"
              >
                Cài đặt Banking →
              </Link>
            </div>

            <div className="space-y-2">
              {orderEmails.map((v, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={v}
                    onChange={(e) => {
                      const next = [...orderEmails];
                      next[idx] = e.target.value;
                      setOrderEmails(next);
                    }}
                    placeholder="VD: admin@gmail.com"
                    className="flex-1 border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setOrderEmails((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : ['']))}
                    className="px-3 py-2 rounded-md border border-gray-200 text-sm hover:bg-gray-50"
                  >
                    Xoá
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setOrderEmails((prev) => [...prev, ''])}
                  className="px-3 py-2 rounded-md border border-gray-200 text-sm hover:bg-gray-50"
                >
                  + Thêm email
                </button>
                <button
                  type="button"
                  disabled={savingEmails}
                  onClick={async () => {
                    try {
                      setSavingEmails(true);
                      const cleaned = orderEmails.map((e) => e.trim()).filter(Boolean);
                      const res = await fetch('/api/admin/settings/order-notify-emails', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ emails: cleaned }),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(data?.message || 'Lưu thất bại');
                      setOrderEmails((data?.emails || []).length ? data.emails : ['']);
                      addToast('Đã lưu email thông báo', 'success');
                    } catch (err: any) {
                      addToast(err?.message || 'Lưu thất bại', 'error');
                    } finally {
                      setSavingEmails(false);
                    }
                  }}
                  className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {savingEmails ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
              <div className="text-xs text-gray-500">
                Lưu ý: cần cấu hình SendGrid (SENDGRID_API_KEY, SENDGRID_FROM_EMAIL) để hệ thống gửi mail.
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="text-lg font-semibold text-gray-900">Favicon Website</div>
            <div className="text-sm text-gray-500 mb-3">Thay đổi icon hiển thị trên tab trình duyệt (favicon).</div>
            
            <div className="space-y-3">
              <div
                className={`flex flex-col items-center justify-center gap-2 text-sm rounded-md border border-dashed py-6 transition ${uploadingFavicon ? 'border-gray-200 bg-gray-100 cursor-wait' : 'text-gray-600 border-gray-300 bg-gray-50 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50'}`}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (uploadingFavicon) return;
                  const files = e.dataTransfer.files;
                  if (files.length > 0) handleFaviconFile(files[0]);
                }}
              >
                <div className="font-semibold">{uploadingFavicon ? 'Đang tải lên Cloudinary...' : 'Chọn / kéo thả ảnh favicon'}</div>
                <div className="text-xs text-gray-500">Chỉ chọn 1 ảnh (khuyến nghị: 32x32px hoặc 64x64px). Ảnh lưu trên Cloudinary.</div>
                <label className={`px-3 py-2 border rounded-md text-xs font-semibold transition ${uploadingFavicon ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-300 text-gray-700 hover:border-emerald-500 cursor-pointer'}`}>
                  Chọn ảnh
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingFavicon}
                    onChange={(e) => {
                      if (uploadingFavicon) return;
                      if (e.target.files && e.target.files.length > 0) handleFaviconFile(e.target.files[0]);
                    }}
                  />
                </label>
              </div>

              {favicon && (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={favicon} alt="Favicon preview" className="h-16 w-16 object-cover rounded-md border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => setFavicon('')}
                      className="absolute -top-1 -right-1 bg-black/60 text-white text-xs rounded-full px-2 py-1 hover:bg-black/80 transition"
                    >
                      X
                    </button>
                  </div>
                  <div className="flex-1 text-xs text-gray-500">
                    Favicon đã chọn. Nhấn "Lưu" để áp dụng.
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={savingFavicon}
                  onClick={handleSaveFavicon}
                  className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {savingFavicon ? 'Đang lưu...' : 'Lưu favicon'}
                </button>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <div className="text-lg font-semibold text-gray-900">Tuỳ chọn</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-gray-700">
                <span>Bật thông báo hệ thống</span>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationToggle}
                    onChange={(e) => handleNotificationToggle(e.target.checked)}
                    className="accent-emerald-600"
                  />
                  <span>{notificationToggle ? 'Bật' : 'Tắt'}</span>
                </label>
              </div>
              {notificationToggle && (
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="shrink-0">Âm lượng thông báo</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={notificationVolume}
                    onChange={(e) => handleNotificationVolume(parseInt(e.target.value, 10))}
                    className="flex-1 h-2 rounded-full accent-emerald-600"
                  />
                  <span className="shrink-0 w-10 text-right">{notificationVolume}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

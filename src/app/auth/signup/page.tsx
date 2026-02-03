'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { signIn, getSession } from 'next-auth/react';

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const router = useRouter();

  const getErrorMessage = (error: string | null | undefined, context: 'signup' | 'login' = 'signup'): string => {
    if (!error) {
      return context === 'signup' ? 'Đăng ký thất bại. Vui lòng thử lại' : 'Đăng nhập thất bại. Vui lòng thử lại';
    }
    const errLower = String(error).toLowerCase();
    if (errLower.includes('email đã tồn tại') || errLower.includes('email already') || errLower.includes('existing')) {
      return 'Email đã tồn tại';
    }
    if (errLower.includes('missing fields') || errLower.includes('thiếu')) {
      return 'Vui lòng nhập đầy đủ thông tin';
    }
    if (errLower.includes('credentialsignin') || errLower.includes('credentials')) {
      return context === 'signup'
        ? 'Đăng ký thành công nhưng đăng nhập thất bại. Vui lòng đăng nhập lại'
        : 'Email hoặc mật khẩu không đúng';
    }
    if (errLower.includes('not found') || errLower.includes('không tồn tại')) {
      return 'Tài khoản không tồn tại';
    }
    if (errLower.includes('blocked') || errLower.includes('inactive') || errLower.includes('khóa')) {
      return 'Tài khoản đã bị khóa';
    }
    return context === 'signup' ? 'Đăng ký thất bại. Vui lòng thử lại' : 'Đăng nhập thất bại. Vui lòng thử lại';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      addToast('Mật khẩu nhập lại không khớp', 'error');
      return;
    }
    if (!name.trim() || !email.trim() || !password.trim()) {
      addToast('Vui lòng nhập đầy đủ thông tin', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Đăng ký thất bại');
      addToast('Đăng ký thành công', 'success');
      // Đăng nhập luôn bằng credentials
      const loginRes = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });
      if (loginRes?.error) throw new Error(loginRes.error);
      const session = await getSession();
      const role = (session?.user as any)?.role;
      router.replace(role === 'admin' ? '/admin' : '/');
    } catch (err: any) {
      const isLoginError = err?.message?.toLowerCase().includes('credentialsignin') || err?.message?.toLowerCase().includes('credentials');
      addToast(getErrorMessage(err?.message || err?.error, isLoginError ? 'login' : 'signup'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Đăng ký</h1>
        <p className="text-gray-600 text-sm">Tạo tài khoản để lưu đơn hàng và quản lý dễ dàng.</p>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-800">Họ và tên</label>
          <input
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
            placeholder="Nguyễn Văn A"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-800">Email</label>
          <input
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-800">Mật khẩu</label>
          <input
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-800">Nhập lại mật khẩu</label>
          <input
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            type="password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-[#0f5c5c] px-4 py-2 text-white font-semibold shadow hover:bg-[#0c4d4d] transition disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? 'Đang xử lý...' : 'Đăng ký'}
        </button>
      </form>

      <div className="text-center text-sm text-gray-600">
        Đã có tài khoản?{' '}
        <a href="/auth/signin" className="text-[#0f5c5c] font-semibold hover:underline">
          Đăng nhập
        </a>
      </div>
    </div>
  );
}

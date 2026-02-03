'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { signIn, getSession } from 'next-auth/react';

function SignInPageContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect') || '';

  const getErrorMessage = (error: string | null | undefined): string => {
    if (!error) return 'Đăng nhập thất bại. Vui lòng thử lại';
    const errLower = String(error).toLowerCase();
    if (errLower.includes('credentialsignin') || errLower.includes('credentials')) {
      return 'Email hoặc mật khẩu không đúng';
    }
    if (errLower.includes('not found') || errLower.includes('không tồn tại')) {
      return 'Tài khoản không tồn tại';
    }
    if (errLower.includes('blocked') || errLower.includes('inactive') || errLower.includes('khóa')) {
      return 'Tài khoản đã bị khóa';
    }
    return 'Đăng nhập thất bại. Vui lòng thử lại';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      addToast('Vui lòng nhập email và mật khẩu', 'error');
      return;
    }
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });
      if (result?.error) throw new Error(result.error);
      const session = await getSession();
      const role = (session?.user as any)?.role;
      addToast('Đăng nhập thành công', 'success');
      if (role === 'admin') router.replace('/admin');
      else router.replace(redirect || '/');
    } catch (err: any) {
      addToast(getErrorMessage(err?.message || err?.error), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Đăng nhập</h1>
        <p className="text-gray-600 text-sm">Chào mừng quay lại. Vui lòng đăng nhập để tiếp tục.</p>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
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

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-[#0f5c5c] px-4 py-2 text-white font-semibold shadow hover:bg-[#0c4d4d] transition disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? 'Đang xử lý...' : 'Đăng nhập'}
        </button>
      </form>

      <div className="text-center text-sm text-gray-600">Hoặc</div>

      <button
        type="button"
        onClick={() =>
          signIn('google', {
            callbackUrl: redirect || '/',
          })
        }
        className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-5 w-5" />
        Đăng nhập bằng Google
      </button>

      <div className="text-center text-sm text-gray-600">
        Chưa có tài khoản?{' '}
        <a href="/auth/signup" className="text-[#0f5c5c] font-semibold hover:underline">
          Đăng ký
        </a>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="max-w-md mx-auto px-4 py-12 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Đăng nhập</h1>
          <p className="text-gray-600 text-sm">Đang tải...</p>
        </div>
      </div>
    }>
      <SignInPageContent />
    </Suspense>
  );
}

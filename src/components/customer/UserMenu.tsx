'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

interface Props {
  variant?: 'desktop' | 'mobile';
}

export default function UserMenu({ variant = 'desktop' }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hasPendingPayment, setHasPendingPayment] = useState(false);

  const isAuthed = status === 'authenticated' && !!session?.user;
  const displayName = session?.user?.name || session?.user?.email || 'Người dùng';

  const shouldShowPendingBadge = useMemo(() => {
    // Show "1" indicator (not a count) when there is at least 1 pending payment order
    return isAuthed && hasPendingPayment;
  }, [isAuthed, hasPendingPayment]);

  // Lazy load: only fetch pending state when user opens the menu (avoids heavy /api/orders on every page load)
  useEffect(() => {
    if (!isAuthed) {
      setHasPendingPayment(false);
      return;
    }
    if (!open) return;

    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/orders/pending', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        if (mounted) setHasPendingPayment(!!data?.hasPendingPayment);
      } catch {
        // ignore
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [isAuthed, open]);

  const handleClick = () => {
    if (!isAuthed) {
      router.push('/auth/signin');
      return;
    }
    setOpen((v) => !v);
  };

  const handleLogout = async () => {
    try {
      setOpen(false);
      await signOut({ callbackUrl: '/' });
    } catch (e) {
      console.error(e);
    }
  };

  if (variant === 'mobile') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-2"
      >
        <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M4.5 20.25a8.25 8.25 0 0115 0" />
          </svg>
          {shouldShowPendingBadge ? (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#f6c142] text-[#0f5c5c] text-[11px] leading-[18px] text-center px-1 font-bold">
              1
            </span>
          ) : null}
        </span>
        <span>{isAuthed ? displayName : 'Đăng nhập'}</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        className="relative flex flex-col items-center gap-1 text-sm text-gray-700 hover:text-[#0f5c5c]"
      >
        <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M4.5 20.25a8.25 8.25 0 0115 0" />
          </svg>
          {shouldShowPendingBadge ? (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#0f5c5c] text-white text-[11px] leading-[18px] text-center px-1 font-bold">
              1
            </span>
          ) : null}
        </span>
        <span className="leading-none">{isAuthed ? displayName : 'Đăng nhập'}</span>
      </button>

      {isAuthed && open && (
        <div className="absolute top-12 right-0 w-44 rounded-lg border border-gray-200 bg-white shadow-lg py-2 z-20">
          <button
            type="button"
            onClick={() => router.push('/profile')}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
          >
            Thông tin cá nhân
          </button>
          <button
            type="button"
            onClick={() => router.push('/orders')}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between gap-2"
          >
            <span>Đơn hàng của tôi</span>
            {shouldShowPendingBadge ? (
              <span className="min-w-[18px] h-[18px] rounded-full bg-[#0f5c5c] text-white text-[11px] leading-[18px] text-center px-1 font-bold">
                1
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
          >
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<string>('guest');

  useEffect(() => {
    const cookie = document.cookie || '';
    const rMatch = cookie.match(/(?:^|;)\s*role_client=([^;]+)/);
    const nMatch = cookie.match(/(?:^|;)\s*username_client=([^;]+)/);
    setRole(rMatch?.[1] || 'guest');
    setUsername(nMatch?.[1] ? decodeURIComponent(nMatch[1]) : null);
  }, []);

  const handleUserClick = () => {
    if (role === 'admin' || role === 'staff') return router.push('/admin');
    if (role === 'customer') return router.push('/profile');
    router.push('/auth/signin');
  };

  return (
    <header className="bg-white">
      <div className="container-section py-4 flex flex-col gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="shrink-0">
            <Image
              src="/images/logo.png"
              alt="Tiệm hoa tươi Mỹ Na"
              width={200}
              height={80}
              className="h-16 w-auto object-contain"
              priority
            />
          </Link>

          <div className="flex-1 flex items-stretch max-w-3xl">
            <input
              type="text"
              placeholder="Nhập từ khóa để tìm kiếm tại đây"
              className="flex-1 rounded-l-md border border-gray-300 px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
            />
            <button
              type="button"
              className="bg-[#0f5c5c] text-white px-5 py-2 font-semibold rounded-r-md"
            >
              TÌM KIẾM
            </button>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            <button
              type="button"
              onClick={handleUserClick}
              className="flex flex-col items-center gap-1 text-sm text-gray-700 hover:text-[#0f5c5c]"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M4.5 20.25a8.25 8.25 0 0115 0" />
                </svg>
              </span>
              <span className="leading-none">{username || 'Tài khoản'}</span>
            </button>

            <Link
              href="/favorites"
              className="flex flex-col items-center gap-1 text-sm text-gray-700 hover:text-[#0f5c5c]"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M12 21s-6.75-4.35-6.75-10.05S8.25 3 12 7.35 18.75 3 18.75 10.95 12 21 12 21z" />
                </svg>
              </span>
              <span className="leading-none">Yêu thích</span>
            </Link>

            <Link
              href="/cart"
              className="flex flex-col items-center gap-1 text-sm text-gray-700 hover:text-[#0f5c5c]"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M3 5h2l1.2 9h11.6L19 8H7" />
                  <circle cx="9" cy="19" r="1.25" />
                  <circle cx="16" cy="19" r="1.25" />
                </svg>
              </span>
              <span className="leading-none">Giỏ hàng</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

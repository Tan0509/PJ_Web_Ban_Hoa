'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import UserMenu from './UserMenu';
import CategoryMenu from './CategoryMenu';
import CustomerDarkModeToggle from './CustomerDarkModeToggle';
import { useStore } from './StoreProvider';

interface Props {
  categories?: any[];
}

export default function CustomerHeader({ categories }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState('');
  const { favoritesCount, cartCount } = useStore();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleSearch = () => {
    const keyword = q.trim();
    if (!keyword) return;
    router.push(`/search?q=${encodeURIComponent(keyword)}`);
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="container-section py-3 sm:py-4 flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 md:gap-5">
          <Link href="/" className="shrink-0 w-full flex justify-center sm:w-auto sm:justify-start">
            <Image
              src="/images/logo.png"
              alt="Tiệm hoa tươi Mỹ Na"
              width={260}
              height={90}
              className="h-12 sm:h-16 md:h-24 w-auto object-contain"
              priority
            />
          </Link>

          <div className="w-full md:flex-1 md:max-w-[620px] flex flex-col sm:flex-row items-stretch gap-2 sm:gap-0">
            <input
              type="text"
              placeholder="Nhập từ khóa để tìm kiếm tại đây"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className="flex-1 rounded-md sm:rounded-r-none sm:rounded-l-md border border-gray-300 px-3 py-2 text-sm sm:text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="bg-[#0f5c5c] text-white px-4 md:px-5 py-2 text-sm sm:text-base font-semibold rounded-md sm:rounded-l-none sm:rounded-r-md whitespace-nowrap"
            >
              TÌM KIẾM
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-5 shrink-0">
            <CustomerDarkModeToggle />
            <UserMenu />

            <Link
              href="/favorites"
              className="flex flex-col items-center gap-1 text-sm text-gray-700 hover:text-[#0f5c5c]"
            >
              <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 8.25c0-2.485-2.046-4.5-4.571-4.5-1.63 0-3.058.936-3.8 2.292-.742-1.356-2.17-2.292-3.8-2.292C6.304 3.75 4.25 5.765 4.25 8.25c0 4.28 7.371 9.189 8.371 9.939.25.189.58.189.83 0 1-0.75 8.371-5.659 8.371-9.939Z"
                  />
                </svg>
                {favoritesCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#0f5c5c] text-white text-[11px] leading-[18px] text-center px-1">
                    {favoritesCount}
                  </span>
                )}
              </span>
              <span className="leading-none">Yêu thích</span>
            </Link>

            <Link
              href="/cart"
              className="flex flex-col items-center gap-1 text-sm text-gray-700 hover:text-[#0f5c5c]"
            >
              <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M3 5h2l1.2 9h11.6L19 8H7" />
                  <circle cx="9" cy="19" r="1.25" />
                  <circle cx="16" cy="19" r="1.25" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#0f5c5c] text-white text-[11px] leading-[18px] text-center px-1">
                    {cartCount}
                  </span>
                )}
              </span>
              <span className="leading-none">Giỏ hàng</span>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="sm:hidden inline-flex items-center justify-center h-10 w-10 rounded-md border border-gray-300 text-gray-700 mb-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div className="hidden sm:block bg-[#0f5c5c] text-white rounded-md overflow-visible">
          <nav className="flex items-center justify-center gap-6 px-6 py-3 text-sm font-semibold uppercase tracking-wide">
            <CategoryMenu variant="desktop" categories={categories} />
          </nav>
        </div>
      </div>

      {mobileOpen && (
        <div className="sm:hidden bg-[#0f5c5c] text-white">
          <div className="container-section py-5 px-4 flex flex-col gap-4">
            <div className="px-2 mt-6 mb-1">
              <div className="rounded-xl bg-white/15 border border-white/15 divide-y divide-white/10 overflow-hidden shadow-sm">
                <CategoryMenu variant="mobile" categories={categories} />
              </div>
            </div>
            <div className="px-2 mt-0.5 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm rounded-lg bg-white/10 border border-white/10 px-3 py-2">
                <div className="flex items-center gap-3">
                  <CustomerDarkModeToggle hideLabelOnMobile />
                  <UserMenu variant="mobile" />
                </div>
                <div className="flex items-center gap-4">
                  <Link href="/favorites" className="underline">
                    Yêu thích
                  </Link>
                  <Link href="/cart" className="underline">
                    Giỏ hàng
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

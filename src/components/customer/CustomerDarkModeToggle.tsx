'use client';

import { useEffect, useState } from 'react';

const THEME_KEY = 'theme';

function getStoredTheme(): 'dark' | 'light' | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(THEME_KEY);
  if (v === 'dark' || v === 'light') return v;
  return null;
}

function applyTheme(dark: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (dark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export default function CustomerDarkModeToggle({ hideLabelOnMobile = false }: { hideLabelOnMobile?: boolean }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = getStoredTheme();
    const dark =
      stored === 'dark' ||
      (stored !== 'light' &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(dark);
    applyTheme(dark);
    if (stored === null && typeof window !== 'undefined') {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    }
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
  };

  const iconSvg = isDark ? (
    <svg className="h-5 w-5" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ) : (
    <svg className="h-5 w-5" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  if (!mounted) {
    return (
      <div className="flex flex-col items-center gap-1 text-sm text-gray-700">
        <span className="customer-theme-circle inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 shrink-0" aria-hidden>
          <span className="h-5 w-5" />
        </span>
        <span className={`leading-none ${hideLabelOnMobile ? 'hidden sm:inline' : ''}`}>Dark</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex flex-col items-center gap-1 text-sm text-gray-700 hover:text-[#0f5c5c] bg-transparent border-0 p-0 cursor-pointer"
      aria-label={isDark ? 'Bật sáng' : 'Bật tối'}
      title={isDark ? 'Bật chế độ sáng' : 'Bật chế độ tối'}
    >
      <span className="customer-theme-circle relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white shrink-0 transition-colors hover:border-[#0f5c5c]">
        {iconSvg}
      </span>
      <span className={`leading-none ${hideLabelOnMobile ? 'hidden sm:inline' : ''}`}>
        {isDark ? 'Dark' : 'Light'}
      </span>
    </button>
  );
}

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

export default function AdminDarkModeToggle() {
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

  if (!mounted) {
    return (
      <button
        type="button"
        className="admin-theme-toggle"
        aria-label="Chế độ tối"
        title="Chế độ tối"
      >
        <span className="admin-theme-icon" aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="admin-theme-toggle"
      onClick={toggle}
      aria-label={isDark ? 'Bật sáng' : 'Bật tối'}
      title={isDark ? 'Bật chế độ sáng' : 'Bật chế độ tối'}
    >
      {isDark ? (
        <svg className="admin-theme-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg className="admin-theme-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}

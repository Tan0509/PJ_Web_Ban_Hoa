'use client';

import { useEffect } from 'react';

const THEME_KEY = 'theme';
const LEGACY_KEY = 'admin-theme';

function getStoredTheme(): 'dark' | 'light' | null {
  if (typeof window === 'undefined') return null;
  let v = localStorage.getItem(THEME_KEY);
  if (v === 'dark' || v === 'light') return v;
  v = localStorage.getItem(LEGACY_KEY);
  if (v === 'dark' || v === 'light') {
    localStorage.setItem(THEME_KEY, v);
    return v;
  }
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

export default function ThemeInit() {
  useEffect(() => {
    const stored = getStoredTheme();
    const dark =
      stored === 'dark' ||
      (stored !== 'light' &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    applyTheme(dark);
    if (stored === null && typeof window !== 'undefined') {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    }
  }, []);
  return null;
}

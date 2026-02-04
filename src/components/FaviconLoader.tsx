'use client';

import { useEffect } from 'react';

const FAVICON_CACHE_KEY = 'app_favicon_url';

function applyFavicon(url: string) {
  const existingLinks = document.querySelectorAll("link[rel~='icon']");
  existingLinks.forEach((link) => link.remove());
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = url;
  document.head.appendChild(link);
}

export default function FaviconLoader() {
  useEffect(() => {
    // 1) Use cached favicon if present (avoids DB call on every page load)
    try {
      const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(FAVICON_CACHE_KEY) : null;
      if (cached) {
        applyFavicon(cached);
        return;
      }
    } catch {
      // ignore
    }

    // 2) Defer fetch so it doesn't block initial paint; call API at most once per session
    const id = setTimeout(async () => {
      try {
        const res = await fetch('/api/favicon');
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.favicon) {
          applyFavicon(data.favicon);
          try {
            sessionStorage.setItem(FAVICON_CACHE_KEY, data.favicon);
          } catch {
            // ignore
          }
        }
      } catch {
        // Silent fail - keep default favicon
      }
    }, 0);

    return () => clearTimeout(id);
  }, []);

  return null;
}

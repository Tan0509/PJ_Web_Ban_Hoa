'use client';

import { useEffect } from 'react';

export default function FaviconLoader() {
  useEffect(() => {
    const loadFavicon = async () => {
      try {
        const res = await fetch('/api/favicon');
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.favicon) {
          // Remove existing favicon links
          const existingLinks = document.querySelectorAll("link[rel~='icon']");
          existingLinks.forEach((link) => link.remove());

          // Add new favicon
          const link = document.createElement('link');
          link.rel = 'icon';
          link.href = data.favicon;
          document.head.appendChild(link);
        }
      } catch (err) {
        // Silent fail - keep default favicon
      }
    };

    loadFavicon();
  }, []);

  return null;
}

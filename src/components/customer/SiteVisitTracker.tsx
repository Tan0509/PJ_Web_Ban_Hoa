'use client';

import { useEffect } from 'react';

const STORAGE_VISITOR_KEY = 'site_visitor_fingerprint_v1';
const STORAGE_SENT_DAY_KEY = 'site_visit_sent_day_v1';

function getVietnamDateKey(now = new Date()) {
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const vn = new Date(utc + 7 * 60 * 60000);
  const y = vn.getFullYear();
  const m = String(vn.getMonth() + 1).padStart(2, '0');
  const d = String(vn.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getOrCreateFingerprint() {
  const existing = localStorage.getItem(STORAGE_VISITOR_KEY);
  if (existing) return existing;
  const seed = `${Date.now()}-${Math.random()}-${navigator.userAgent || ''}`;
  const value = `v-${btoa(seed).replace(/=+$/g, '').slice(0, 48)}`;
  localStorage.setItem(STORAGE_VISITOR_KEY, value);
  return value;
}

export default function SiteVisitTracker() {
  useEffect(() => {
    const dateKey = getVietnamDateKey();
    const sent = localStorage.getItem(STORAGE_SENT_DAY_KEY);
    if (sent === dateKey) return;

    const fingerprint = getOrCreateFingerprint();
    fetch('/api/visit/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint }),
      keepalive: true,
    })
      .then((res) => {
        if (res.ok) localStorage.setItem(STORAGE_SENT_DAY_KEY, dateKey);
      })
      .catch(() => {
        // silent fail: tracking must not affect UX
      });
  }, []);

  return null;
}

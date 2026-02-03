'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const NOTIFICATION_SOUND_KEY = 'admin_notification_sound_enabled';
const NOTIFICATION_VOLUME_KEY = 'admin_notification_sound_volume';

function playDing() {
  if (typeof window === 'undefined') return;
  try {
    const enabled = localStorage.getItem(NOTIFICATION_SOUND_KEY);
    if (enabled !== 'true') return;
    const volStr = localStorage.getItem(NOTIFICATION_VOLUME_KEY);
    const vol = volStr !== null ? Math.max(0, Math.min(1, parseInt(volStr, 10) / 100)) : 0.7;
    if (vol <= 0) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
      osc.start(start);
      osc.stop(start + duration);
    };
    playTone(800, 0, 0.08);
    playTone(1000, 0.1, 0.12);
  } catch {
    // ignore
  }
}

type AdminNotif = {
  _id: string;
  type: string;
  title: string;
  body?: string;
  orderId?: string;
  orderCode?: string;
  createdAt?: string;
  readBy?: string[];
};

function formatTime(v?: string) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('vi-VN');
}

export default function AdminNotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminNotif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const didMarkAllRef = useRef(false);
  const prevUnreadRef = useRef<number | null>(null);

  const hasUnread = unreadCount > 0;

  const load = async (silent?: boolean) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/admin/notifications?limit=15', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || 'Không tải được thông báo');
      setItems(Array.isArray(data?.data?.items) ? data.data.items : []);
      const newCount = Number(data?.data?.unreadCount || 0);
      const prev = prevUnreadRef.current;
      prevUnreadRef.current = newCount;
      if (prev !== null && newCount > prev) playDing();
      setUnreadCount(newCount);
    } catch {
      // ignore to avoid breaking admin UI
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const markReadAll = async () => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
    } catch {
      // ignore
    }
  };

  const markReadIds = async (ids: string[]) => {
    if (!ids.length) return;
    try {
      await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    load(true);
    const t = setInterval(() => load(true), 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open) return;
      const el = panelRef.current;
      if (!el) return;
      if (el.contains(e.target as any)) return;
      setOpen(false);
      didMarkAllRef.current = false;
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Mark all as read once when opened
    if (hasUnread && !didMarkAllRef.current) {
      didMarkAllRef.current = true;
      markReadAll().finally(() => load(true));
    }
  }, [open, hasUnread]);

  const displayItems = useMemo(() => items.slice(0, 10), [items]);

  const goToOrder = async (n: AdminNotif) => {
    setOpen(false);
    didMarkAllRef.current = false;
    // best-effort mark read
    await markReadIds([n._id]);
    // deep-link to orders page with auto-open modal
    const target = n.orderId ? `/admin/orders?open=${encodeURIComponent(n.orderId)}` : '/admin/orders';
    router.push(target);
  };

  return (
    <div className="admin-bell" ref={panelRef}>
      <button
        type="button"
        className={`admin-bell-btn ${hasUnread ? 'is-unread' : ''} ${hasUnread && !open ? 'is-ringing' : ''}`}
        onClick={() => {
          setOpen((v) => !v);
          // refresh immediately on open
          if (!open) load(true);
        }}
        aria-label="Thông báo"
        title="Thông báo"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5"
          />
          <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M9 17v1a3 3 0 0 0 6 0v-1" />
        </svg>
        {unreadCount > 0 ? <span className="admin-bell-badge">{Math.min(99, unreadCount)}</span> : null}
      </button>

      {open ? (
        <div className="admin-bell-panel">
          <div className="admin-bell-panel-head">
            <div className="admin-bell-panel-title">Thông báo</div>
            <div className="admin-bell-panel-sub">{loading ? 'Đang tải…' : hasUnread ? 'Chưa đọc' : 'Đã đọc'}</div>
          </div>
          <div className="admin-bell-panel-body">
            {displayItems.length === 0 ? (
              <div className="admin-bell-empty">Chưa có thông báo.</div>
            ) : (
              displayItems.map((n) => (
                <button key={n._id} type="button" className="admin-bell-item" onClick={() => goToOrder(n)}>
                  <div className="admin-bell-item-title">{n.title}</div>
                  {n.body ? <div className="admin-bell-item-body">{n.body}</div> : null}
                  <div className="admin-bell-item-time">{formatTime(n.createdAt)}</div>
                </button>
              ))
            )}
          </div>
          <div className="admin-bell-panel-foot">
            <button type="button" className="admin-bell-link" onClick={() => router.push('/admin/orders')}>
              Xem trang đơn hàng
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}


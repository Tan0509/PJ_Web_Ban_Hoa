'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import './admin.css';
import AdminDarkModeToggle from '@/components/admin/AdminDarkModeToggle';
import AdminNotificationBell from '@/components/admin/AdminNotificationBell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed');
    if (saved === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('admin-sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
  };

  return (
    <div className={`admin-shell ${isCollapsed ? 'admin-shell-collapsed' : ''}`}>
      <aside className={`admin-sidebar ${isCollapsed ? 'admin-sidebar-collapsed' : ''}`}>
        <div className="admin-logo-wrapper">
          {!isCollapsed ? (
            <>
              <div className="admin-logo">Admin Panel</div>
              <button
                type="button"
                onClick={toggleSidebar}
                className="admin-sidebar-toggle"
                aria-label="Thu sidebar"
                title="Thu sidebar"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={toggleSidebar}
              className="admin-sidebar-toggle"
              aria-label="Mở sidebar"
              title="Mở sidebar"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
        {!isCollapsed && (
          <nav className="admin-nav">
              <Link href="/admin" className="admin-nav-item">
                <svg className="admin-nav-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 2H8V8H2V2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 2H16V8H10V2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 10H8V16H2V10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 10H16V16H10V10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Dashboard</span>
              </Link>
              <Link href="/admin/posters" className="admin-nav-item">
                <svg className="admin-nav-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 3H16V15H2V3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 8H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>Poster</span>
              </Link>
              <Link href="/admin/products" className="admin-nav-item">
                <svg className="admin-nav-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 3H15L14 15H4L3 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 3L2 1H1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 7.5C6 8.32843 6.67157 9 7.5 9C8.32843 9 9 8.32843 9 7.5C9 6.67157 8.32843 6 7.5 6C6.67157 6 6 6.67157 6 7.5Z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <span>Sản phẩm</span>
              </Link>
              <Link href="/admin/categories" className="admin-nav-item">
                <svg className="admin-nav-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 5H15M3 9H15M3 13H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>Danh mục</span>
              </Link>
              <Link href="/admin/orders" className="admin-nav-item">
                <svg className="admin-nav-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 2H4L5.5 11.5H13.5L15 5H5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="7" cy="15" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="13" cy="15" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <span>Đơn hàng</span>
              </Link>
              <Link href="/admin/users" className="admin-nav-item">
                <svg className="admin-nav-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 9C11.0711 9 12.75 7.32107 12.75 5.25C12.75 3.17893 11.0711 1.5 9 1.5C6.92893 1.5 5.25 3.17893 5.25 5.25C5.25 7.32107 6.92893 9 9 9Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M3.75 16.5C3.75 13.6005 6.10051 11.25 9 11.25C11.8995 11.25 14.25 13.6005 14.25 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>Người dùng</span>
              </Link>

              {/* Settings group (expand to show Banking) */}
              <details className="admin-nav-group">
                <summary className="admin-nav-item admin-nav-summary">
                  <svg className="admin-nav-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 11.25C10.2426 11.25 11.25 10.2426 11.25 9C11.25 7.75736 10.2426 6.75 9 6.75C7.75736 6.75 6.75 7.75736 6.75 9C6.75 10.2426 7.75736 11.25 9 11.25Z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M14.0625 9.5625C14.0625 9.5625 13.5 10.6875 12.375 11.25C13.5 11.8125 14.0625 12.9375 14.0625 12.9375C14.0625 12.9375 15.1875 12.375 15.75 11.25C15.1875 10.125 14.0625 9.5625 14.0625 9.5625Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3.9375 9.5625C3.9375 9.5625 4.5 10.6875 5.625 11.25C4.5 11.8125 3.9375 12.9375 3.9375 12.9375C3.9375 12.9375 2.8125 12.375 2.25 11.25C2.8125 10.125 3.9375 9.5625 3.9375 9.5625Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9.5625 14.0625C9.5625 14.0625 10.6875 13.5 11.25 12.375C11.8125 13.5 12.9375 14.0625 12.9375 14.0625C12.9375 14.0625 12.375 15.1875 11.25 15.75C10.125 15.1875 9.5625 14.0625 9.5625 14.0625Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9.5625 3.9375C9.5625 3.9375 10.6875 4.5 11.25 5.625C11.8125 4.5 12.9375 3.9375 12.9375 3.9375C12.9375 3.9375 12.375 2.8125 11.25 2.25C10.125 2.8125 9.5625 3.9375 9.5625 3.9375Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Cài đặt</span>
                </summary>
                <div className="admin-nav-children">
                  <Link href="/admin/settings" className="admin-nav-subitem">
                    Chung
                  </Link>
                  <Link href="/admin/settings/product-filters" className="admin-nav-subitem">
                    Bộ lọc sản phẩm
                  </Link>
                  <Link href="/admin/settings/banking" className="admin-nav-subitem">
                    Banking
                  </Link>
                </div>
              </details>
          </nav>
        )}
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-top-title">Quản trị</div>
          <div className="admin-top-actions">
            <AdminDarkModeToggle />
            <AdminNotificationBell />
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}

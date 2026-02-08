'use client';

import { useState } from 'react';

type ResultState = {
  open: boolean;
  ok: boolean;
  message: string;
  count?: number;
  slugs?: string[];
};

export default function AdminRebuildHomeCacheButton() {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<ResultState>({ open: false, ok: true, message: '' });

  const handleRebuild = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/home-cache/rebuild', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || 'Không thể rebuild cache';
        setResult({ open: true, ok: false, message: msg });
        return;
      }
      const count = data?.data?.count ?? 0;
      const slugs = Array.isArray(data?.data?.slugs) ? data.data.slugs : [];
      setResult({
        open: true,
        ok: true,
        message: `Đã rebuild cache thành công.`,
        count,
        slugs,
      });
    } catch {
      setResult({ open: true, ok: false, message: 'Không thể rebuild cache' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className={`admin-bell-btn ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
        title="Rebuild Home Cache"
        aria-label="Rebuild Home Cache"
      >
        {loading ? (
          <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="9" strokeWidth="2" opacity="0.25" />
            <path d="M21 12a9 9 0 0 1-9 9" strokeWidth="2" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 1 1-2.343-5.657" />
            <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M20 4v6h-6" />
          </svg>
        )}
      </button>

      {confirmOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <div className="text-lg font-semibold text-gray-900">Xác nhận rebuild</div>
            </div>
            <div className="px-5 py-4 space-y-2 text-sm text-gray-700">
              <p>Bạn hãy rebuild nếu đã thêm đầy đủ các sản phẩm, danh mục hoặc poster mới.</p>
              <p>Rebuild sẽ làm nội dung trang người dùng được load lại.</p>
              <p className="font-semibold text-gray-900">Bạn chắc chắn xác nhận rebuild chứ?</p>
            </div>
            <div className="px-5 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-md border border-gray-200 text-sm hover:bg-gray-50"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  handleRebuild();
                }}
                className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {result.open && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <div className={`text-lg font-semibold ${result.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                {result.ok ? 'Rebuild thành công' : 'Rebuild thất bại'}
              </div>
            </div>
            <div className="px-5 py-4 space-y-2 text-sm text-gray-700">
              <p>{result.message}</p>
              {result.ok && typeof result.count === 'number' && (
                <p>Đã rebuild: <strong>{result.count}</strong> danh mục.</p>
              )}
              {result.ok && result.slugs && result.slugs.length > 0 && (
                <div className="text-xs text-gray-500">
                  Slugs: {result.slugs.join(', ')}
                </div>
              )}
            </div>
            <div className="px-5 py-4 flex items-center justify-end border-t border-gray-200">
              <button
                type="button"
                onClick={() => setResult({ open: false, ok: true, message: '' })}
                className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

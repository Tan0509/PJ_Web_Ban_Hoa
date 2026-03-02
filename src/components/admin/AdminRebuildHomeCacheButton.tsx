'use client';

import { useState } from 'react';

type ResultState = {
  open: boolean;
  ok: boolean;
  message: string;
  count?: number;
  slugs?: string[];
  report?: any;
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
      const report = data?.data?.report;
      setResult({
        open: true,
        ok: true,
        message: `Đã rebuild cache thành công.`,
        count,
        slugs,
        report,
      });
    } catch {
      setResult({ open: true, ok: false, message: 'Không thể rebuild cache' });
    } finally {
      setLoading(false);
    }
  };

  const categoryRows = (() => {
    const added = Array.isArray(result.report?.categoriesAdded) ? result.report.categoriesAdded : [];
    const removed = Array.isArray(result.report?.categoriesRemoved) ? result.report.categoriesRemoved : [];
    return [
      ...added.map((c: any) => ({ name: c?.name || '—', action: 'Thêm mới' })),
      ...removed.map((c: any) => ({ name: c?.name || '—', action: 'Ẩn/Xoá' })),
    ];
  })();

  const posterRows = (() => {
    const added = Array.isArray(result.report?.postersAdded) ? result.report.postersAdded : [];
    const removed = Array.isArray(result.report?.postersRemoved) ? result.report.postersRemoved : [];
    return [
      ...added.map((p: any) => ({ name: p?.name || 'Poster không tên', action: 'Thêm mới' })),
      ...removed.map((p: any) => ({ name: p?.name || 'Poster không tên', action: 'Ẩn/Xoá' })),
    ];
  })();

  const productRows = (() => {
    const added = Array.isArray(result.report?.productsAddedByCategory) ? result.report.productsAddedByCategory : [];
    const removed = Array.isArray(result.report?.productsRemovedByCategory) ? result.report.productsRemovedByCategory : [];
    const map = new Map<string, { categoryName: string; added: string[]; removed: string[] }>();

    added.forEach((g: any) => {
      const key = String(g?.slug || g?.categoryName || '');
      if (!key) return;
      const curr = map.get(key) || { categoryName: g?.categoryName || 'Danh mục', added: [], removed: [] };
      curr.categoryName = g?.categoryName || curr.categoryName;
      curr.added = (g?.products || []).map((p: any) => p?.name).filter(Boolean);
      map.set(key, curr);
    });
    removed.forEach((g: any) => {
      const key = String(g?.slug || g?.categoryName || '');
      if (!key) return;
      const curr = map.get(key) || { categoryName: g?.categoryName || 'Danh mục', added: [], removed: [] };
      curr.categoryName = g?.categoryName || curr.categoryName;
      curr.removed = (g?.products || []).map((p: any) => p?.name).filter(Boolean);
      map.set(key, curr);
    });

    return Array.from(map.values());
  })();

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
          <div className="w-full max-w-5xl rounded-xl bg-white shadow-xl border border-gray-200 max-h-[90vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <div className={`text-lg font-semibold ${result.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                {result.ok ? 'Rebuild thành công' : 'Rebuild thất bại'}
              </div>
            </div>
            <div className="px-5 py-4 space-y-4 text-sm text-gray-700 overflow-y-auto max-h-[70vh]">
              <p>{result.message}</p>
              {result.ok && typeof result.count === 'number' && (
                <p>Đã rebuild: <strong>{result.count}</strong> danh mục.</p>
              )}
              {result.ok && result.report && (
                <div className="space-y-4">
                  <div>
                    <div className="font-semibold text-gray-900 mb-2">Danh mục thay đổi</div>
                    <div className="overflow-x-auto border border-gray-200 rounded-md">
                      <table className="min-w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2">Tên danh mục</th>
                            <th className="text-left px-3 py-2">Hành động</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryRows.length === 0 ? (
                            <tr><td className="px-3 py-2 text-gray-500" colSpan={2}>Không có thay đổi</td></tr>
                          ) : categoryRows.map((row, idx) => (
                            <tr key={`cat-${idx}`} className="border-t border-gray-100">
                              <td className="px-3 py-2">{row.name}</td>
                              <td className="px-3 py-2">{row.action}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-900 mb-2">Poster thay đổi</div>
                    <div className="overflow-x-auto border border-gray-200 rounded-md">
                      <table className="min-w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2">Tên poster</th>
                            <th className="text-left px-3 py-2">Hành động</th>
                          </tr>
                        </thead>
                        <tbody>
                          {posterRows.length === 0 ? (
                            <tr><td className="px-3 py-2 text-gray-500" colSpan={2}>Không có thay đổi</td></tr>
                          ) : posterRows.map((row, idx) => (
                            <tr key={`poster-${idx}`} className="border-t border-gray-100">
                              <td className="px-3 py-2">{row.name}</td>
                              <td className="px-3 py-2">{row.action}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-900 mb-2">Sản phẩm thay đổi theo danh mục</div>
                    <div className="overflow-x-auto border border-gray-200 rounded-md">
                      <table className="min-w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2">Danh mục</th>
                            <th className="text-left px-3 py-2">Sản phẩm thêm vào cache</th>
                            <th className="text-left px-3 py-2">Sản phẩm bị ẩn/xoá khỏi cache</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productRows.length === 0 ? (
                            <tr><td className="px-3 py-2 text-gray-500" colSpan={3}>Không có thay đổi</td></tr>
                          ) : productRows.map((row, idx) => (
                            <tr key={`product-${idx}`} className="border-t border-gray-100 align-top">
                              <td className="px-3 py-2">{row.categoryName}</td>
                              <td className="px-3 py-2">{row.added.length ? row.added.join(', ') : '—'}</td>
                              <td className="px-3 py-2">{row.removed.length ? row.removed.join(', ') : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {result.report.note ? <div className="text-xs text-gray-500">{result.report.note}</div> : null}
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

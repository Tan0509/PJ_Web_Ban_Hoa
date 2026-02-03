'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ToastProvider';

type Item = { id: string; label: string; enabled: boolean };
type Group = { enabled: boolean; items: Item[] };
type Filters = { types: Group; colors: Group };

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeFilters(input: any): Filters {
  const fallback: Filters = {
    types: {
      enabled: true,
      items: [
        { id: 'type-bo-hoa', label: 'Bó hoa', enabled: true },
        { id: 'type-gio-hoa', label: 'Giỏ hoa', enabled: true },
        { id: 'type-hop-hoa', label: 'Hộp hoa', enabled: true },
        { id: 'type-hoa-cuoi', label: 'Hoa cưới', enabled: true },
        { id: 'type-hoa-chuc-mung', label: 'Hoa chúc mừng', enabled: true },
      ],
    },
    colors: {
      enabled: true,
      items: [
        { id: 'color-do', label: 'Đỏ', enabled: true },
        { id: 'color-hong', label: 'Hồng', enabled: true },
        { id: 'color-trang', label: 'Trắng', enabled: true },
        { id: 'color-vang', label: 'Vàng', enabled: true },
        { id: 'color-xanh', label: 'Xanh', enabled: true },
        { id: 'color-tim', label: 'Tím', enabled: true },
      ],
    },
  };

  const safeGroup = (g: any, fb: Group): Group => {
    const enabled = typeof g?.enabled === 'boolean' ? g.enabled : fb.enabled;
    const itemsRaw = Array.isArray(g?.items) ? g.items : fb.items;
    const items = itemsRaw
      .map((x: any, idx: number) => {
        const id = String(x?.id || fb.items?.[idx]?.id || '').trim();
        const label = String(x?.label || '').trim();
        const itemEnabled = typeof x?.enabled === 'boolean' ? x.enabled : true;
        if (!id || !label) return null;
        return { id, label, enabled: itemEnabled };
      })
      .filter(Boolean) as Item[];
    return { enabled, items };
  };

  return {
    types: safeGroup(input?.types, fallback.types),
    colors: safeGroup(input?.colors, fallback.colors),
  };
}

export default function AdminProductFiltersSettingsPage() {
  const { addToast } = useToast();
  const [filters, setFilters] = useState<Filters>(() => normalizeFilters(null));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings/product-filters');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Không tải được bộ lọc');
      setFilters(normalizeFilters(data?.filters));
    } catch (err: any) {
      addToast(err?.message || 'Không tải được bộ lọc', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSave = useMemo(() => {
    const hasTypes = filters.types.items.some((x) => x.label.trim());
    const hasColors = filters.colors.items.some((x) => x.label.trim());
    return hasTypes && hasColors;
  }, [filters]);

  const save = async () => {
    try {
      if (!canSave) {
        addToast('Vui lòng nhập ít nhất 1 mục cho Loại và Màu sắc', 'error');
        return;
      }
      setSaving(true);
      const res = await fetch('/api/admin/settings/product-filters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Lưu thất bại');
      setFilters(normalizeFilters(data?.filters));
      addToast('Đã lưu bộ lọc sản phẩm', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Lưu thất bại', 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderGroup = (key: keyof Filters, title: string) => {
    const group = filters[key];
    return (
      <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-gray-900">{title}</div>
            <div className="text-sm text-gray-500">Thêm / sửa / xoá và ẩn/hiện các mục con.</div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={!!group.enabled}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  [key]: { ...prev[key], enabled: e.target.checked },
                }))
              }
              className="accent-emerald-600"
            />
            Hiển thị bộ lọc
          </label>
        </div>

        <div className="space-y-2">
          {group.items.map((it, idx) => (
            <div key={it.id} className="flex items-center gap-2">
              <input
                value={it.label}
                onChange={(e) =>
                  setFilters((prev) => {
                    const items = [...prev[key].items];
                    items[idx] = { ...items[idx], label: e.target.value };
                    return { ...prev, [key]: { ...prev[key], items } };
                  })
                }
                className="flex-1 border border-gray-200 rounded-md px-3 h-10 text-sm bg-white"
                placeholder="Tên mục (VD: Đỏ / Bó hoa)"
              />
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={!!it.enabled}
                  onChange={(e) =>
                    setFilters((prev) => {
                      const items = [...prev[key].items];
                      items[idx] = { ...items[idx], enabled: e.target.checked };
                      return { ...prev, [key]: { ...prev[key], items } };
                    })
                  }
                  className="accent-emerald-600"
                />
                Hiện
              </label>
              <button
                type="button"
                onClick={() =>
                  setFilters((prev) => {
                    const items = prev[key].items.filter((_, i) => i !== idx);
                    return { ...prev, [key]: { ...prev[key], items } };
                  })
                }
                className="px-3 h-10 rounded-md border border-gray-200 text-sm hover:bg-gray-50"
              >
                Xoá
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                [key]: {
                  ...prev[key],
                  items: [...prev[key].items, { id: uid(String(key)), label: '', enabled: true }],
                },
              }))
            }
            className="px-3 py-2 rounded-md border border-gray-200 text-sm hover:bg-gray-50"
          >
            + Thêm mục
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Bộ lọc sản phẩm</h1>
            <p className="text-sm text-gray-500">Cấu hình bộ lọc hiển thị ở trang danh mục và form sản phẩm.</p>
          </div>
          <button
            type="button"
            disabled={saving || loading}
            onClick={save}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Đang tải...</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {renderGroup('types', 'Loại hoa')}
          {renderGroup('colors', 'Màu sắc')}
        </div>
      )}
    </div>
  );
}


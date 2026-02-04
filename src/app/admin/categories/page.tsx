'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/components/ToastProvider';
import { slugify } from '@/lib/helpers/string';

// This module is cloned 100% from Product Admin
// Keep logic and structure consistent with Product Admin

type CategoryItem = {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  order?: number;
  menuOrder?: number;
  description?: string;
  active: boolean;
  createdAt?: string;
};

type FetchResponse = {
  items: CategoryItem[];
  total: number;
  page: number;
  limit: number;
};

const pageSize = 10;

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN');
}

export default function AdminCategories() {
  const { addToast } = useToast();
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    icon: '',
    order: 0,
    menuOrder: 0,
    active: true,
  });
  const [iconUploading, setIconUploading] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      if (search) params.set('search', search);
      if (status !== 'all') params.set('status', status);

      const res = await fetch(`/api/admin/categories?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Fetch error');
      }
      const data: FetchResponse = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status]);

  const resetForm = () => {
    setEditing(null);
    setForm({
      name: '',
      slug: '',
      icon: '',
      order: 0,
      menuOrder: 0,
      active: true,
    });
  };

  const handleIconFile = async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      addToast('Vui lòng chọn file ảnh', 'error');
      return;
    }
    setIconUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ image: base64, folder: 'categories' }),
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      if (data?.url) setForm((prev) => ({ ...prev, icon: data.url }));
    } catch (err) {
      console.error(err);
      addToast('Upload ảnh thất bại. Vui lòng thử lại.', 'error');
    } finally {
      setIconUploading(false);
      if (iconInputRef.current) iconInputRef.current.value = '';
    }
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (item: CategoryItem) => {
    setEditing(item);
    setForm({
      name: item.name || '',
      slug: item.slug || '',
      icon: item.icon || '',
      order: item.order ?? 0,
      menuOrder: item.menuOrder ?? 0,
      active: item.active ?? true,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      icon: form.icon.trim() || undefined,
      order: Number(form.order),
      menuOrder: Number(form.menuOrder),
      active: form.active,
    };

    if (!payload.name) {
      addToast('Vui lòng nhập tên danh mục', 'error');
      return;
    }
    if (!payload.slug) {
      addToast('Vui lòng nhập slug (hoặc để tự sinh từ tên)', 'error');
      return;
    }

    if (!editing) {
      if (!payload.icon) {
        addToast('Vui lòng thêm ảnh danh mục', 'error');
        return;
      }
      if (Number.isNaN(payload.order) || payload.order < 0) {
        addToast('Vui lòng nhập thứ tự hiển thị (section) hợp lệ', 'error');
        return;
      }
      if (Number.isNaN(payload.menuOrder) || payload.menuOrder < 0) {
        addToast('Vui lòng nhập thứ tự menu hợp lệ', 'error');
        return;
      }
    }

    try {
      const method = editing ? 'PUT' : 'POST';
      const endpoint = editing ? `/api/admin/categories/${editing._id}` : '/api/admin/categories';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Lỗi lưu danh mục');
      }
      addToast(editing ? 'Cập nhật danh mục thành công' : 'Thêm danh mục thành công', 'success');
      closeForm();
      fetchCategories();
    } catch (err: any) {
      addToast(err?.message || 'Lỗi lưu danh mục', 'error');
    }
  };

  const handleHide = async (item: CategoryItem) => {
    const action = item.active ? 'hide' : 'unhide';
    const confirmed = window.confirm(
      item.active
        ? `Ẩn danh mục "${item.name}"? (Danh mục sẽ không hiển thị cho khách hàng nhưng vẫn còn trong hệ thống)`
        : `Hiển thị lại danh mục "${item.name}"?`
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/categories/${item._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Lỗi ẩn/hiển thị danh mục');
      }
      addToast(item.active ? 'Đã ẩn danh mục' : 'Đã hiển thị danh mục', 'success');
      fetchCategories();
    } catch (err: any) {
      addToast(err?.message || 'Lỗi ẩn/hiển thị danh mục', 'error');
    }
  };

  const handleDelete = async (item: CategoryItem) => {
    const confirmed = window.confirm(
      `⚠️ CẢNH BÁO: Bạn có chắc muốn XÓA VĨNH VIỄN danh mục "${item.name}"?\n\n` +
      `Hành động này KHÔNG THỂ hoàn tác. Danh mục sẽ bị xóa hoàn toàn khỏi database.\n\n` +
      `Nếu chỉ muốn ẩn khỏi khách hàng, hãy sử dụng nút "Ẩn" thay vì "Xóa".`
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/categories/${item._id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Lỗi xóa danh mục');
      }
      addToast('Đã xóa danh mục vĩnh viễn', 'success');
      fetchCategories();
    } catch (err: any) {
      addToast(err?.message || 'Lỗi xóa danh mục', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Quản lý danh mục</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
        >
          Thêm danh mục
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3 mb-4">
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Tìm theo tên..."
            className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
          />
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as any);
            }}
            className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hiển thị</option>
            <option value="inactive">Đã ẩn</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-200 text-gray-600">
                <th className="py-3 px-2">Ảnh</th>
                <th className="py-3 px-2">Tên</th>
                <th className="py-3 px-2">Slug</th>
                <th className="py-3 px-2">Thứ tự (section)</th>
                <th className="py-3 px-2">Thứ tự (menu)</th>
                <th className="py-3 px-2">Trạng thái</th>
                <th className="py-3 px-2">Ngày tạo</th>
                <th className="py-3 px-2">
                  <div className="flex items-center justify-end gap-2">
                    <span className="min-w-[60px] px-3 text-center">Hành động</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-gray-500">
                    Không có danh mục.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id} className="border-b border-gray-100">
                    <td className="py-3 px-2">
                      {item.icon ? (
                        <img src={item.icon} alt="" className="h-12 w-12 object-cover rounded-md border border-gray-200" />
                      ) : (
                        <div className="h-12 w-12 rounded-md bg-gray-100 border border-gray-200" />
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-medium text-gray-900">{item.name}</div>
                    </td>
                    <td className="py-3 px-2 text-gray-700">{item.slug}</td>
                    <td className="py-3 px-2 text-gray-600">{item.order ?? 0}</td>
                    <td className="py-3 px-2 text-gray-600">{item.menuOrder ?? 0}</td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          item.active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {item.active ? 'Hiển thị' : 'Đã ẩn'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-600">{formatDate(item.createdAt)}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="min-w-[60px] px-3 py-1 rounded-md border border-gray-200 text-sm hover:bg-gray-50 text-center"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleHide(item)}
                          className={`min-w-[60px] px-3 py-1 rounded-md border text-sm text-center ${
                            item.active
                              ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {item.active ? 'Ẩn' : 'Hiện'}
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="min-w-[60px] px-3 py-1 rounded-md border border-rose-200 text-sm text-rose-700 hover:bg-rose-50 text-center"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-4 text-sm text-gray-600">
          <div>
            Trang {page} / {totalPages}
          </div>
          <div className="space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 rounded-md border border-gray-200 disabled:opacity-50"
            >
              Trước
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-2 rounded-md border border-gray-200 disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {showForm && mounted
        ? createPortal(
            // FIX: Ensure modal overlay covers entire viewport
            // IMPORTANT: Do not move modal back into admin layout
            <div className="fixed top-0 left-0 w-[100vw] h-[100vh] bg-[rgba(0,0,0,0.45)] backdrop-blur-sm flex items-center justify-center z-[999]">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto z-[1000]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {editing ? 'Sửa danh mục' : 'Thêm danh mục'}
                    </div>
                    <div className="text-sm text-gray-500">This module is cloned 100% from Product Admin</div>
                  </div>
                  <button onClick={closeForm} className="text-gray-500 hover:text-gray-700 text-sm">
                    Đóng
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Ảnh danh mục</label>
                    <div className="border border-dashed border-gray-300 rounded-md p-3 bg-gray-50">
                      <div
                        className={`flex flex-col items-center justify-center gap-2 text-sm text-gray-600 rounded-md border border-dashed py-6 cursor-pointer ${iconUploading ? 'border-gray-200 bg-gray-100 cursor-wait' : 'border-gray-300 bg-white hover:border-emerald-500 hover:bg-emerald-50'}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (!iconUploading) handleIconFile(e.dataTransfer.files);
                        }}
                      >
                        {iconUploading ? (
                          <span className="text-gray-500">Đang tải lên Cloudinary...</span>
                        ) : (
                          <>
                            <span className="font-semibold">Chọn / kéo thả ảnh danh mục</span>
                            <label className="px-3 py-2 bg-white border border-gray-300 rounded-md text-xs font-semibold text-gray-700 hover:border-emerald-500 cursor-pointer">
                              Chọn ảnh
                              <input
                                ref={iconInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={iconUploading}
                                onChange={(e) => handleIconFile(e.target.files)}
                              />
                            </label>
                          </>
                        )}
                      </div>
                      {form.icon ? (
                        <div className="mt-3 flex items-center gap-2">
                          <img src={form.icon} alt="Preview" className="h-20 w-20 object-cover rounded-md border border-gray-200" />
                          <button
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, icon: '' }))}
                            className="text-xs text-rose-600 hover:underline"
                          >
                            Xóa ảnh
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Tên danh mục</label>
                      <input
                        value={form.name}
                        onChange={(e) => {
                          const nameVal = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            name: nameVal,
                            slug: slugify(nameVal), // Tự hiển thị slug từ tên (như sản phẩm)
                          }));
                        }}
                        className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Slug</label>
                      <input
                        value={form.slug}
                        onChange={(e) => setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
                        className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Thứ tự hiển thị (section trang chủ)</label>
                      <input
                        type="number"
                        min={0}
                        value={form.order}
                        onChange={(e) => setForm((prev) => ({ ...prev, order: Number(e.target.value) || 0 }))}
                        className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Thứ tự trên menu</label>
                      <input
                        type="number"
                        min={0}
                        value={form.menuOrder}
                        onChange={(e) => setForm((prev) => ({ ...prev, menuOrder: Number(e.target.value) || 0 }))}
                        className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-800">
                      <input
                        type="checkbox"
                        checked={form.active}
                        onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                        className="accent-emerald-600"
                      />
                      Hiển thị (active)
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeForm}
                      className="px-4 py-2 rounded-md border border-gray-200 text-sm hover:bg-gray-50"
                    >
                      Huỷ
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                    >
                      {editing ? 'Lưu thay đổi' : 'Thêm mới'}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/components/ToastProvider';
import { slugify } from '@/lib/helpers/string';

type CategoryItem = {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  parentId?: string;
  order?: number;
  menuOrder?: number;
  active: boolean;
  createdAt?: string;
};

type FetchResponse = {
  items: CategoryItem[];
  total: number;
  page: number;
  limit: number;
};

type ProductLite = {
  _id: string;
  name: string;
  slug: string;
};

const pageSize = 200;

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
  const [mounted, setMounted] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
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

  const [showChildModal, setShowChildModal] = useState(false);
  const [childParent, setChildParent] = useState<CategoryItem | null>(null);
  const [childEditing, setChildEditing] = useState<CategoryItem | null>(null);
  const [childForm, setChildForm] = useState({ name: '', slug: '', active: true });
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    source: CategoryItem | null;
    targetCategoryId: string;
    loading: boolean;
    products: ProductLite[];
    selectedProductIds: string[];
  }>({
    open: false,
    source: null,
    targetCategoryId: '',
    loading: false,
    products: [],
    selectedProductIds: [],
  });

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  useEffect(() => setMounted(true), []);

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

  const allParents = useMemo(
    () =>
      items
        .filter((x) => !x.parentId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)),
    [items]
  );

  const childMap = useMemo(() => {
    const map = new Map<string, CategoryItem[]>();
    for (const item of items) {
      if (!item.parentId) continue;
      const key = String(item.parentId);
      const current = map.get(key) || [];
      current.push(item);
      map.set(key, current);
    }
    for (const [key, list] of map.entries()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
      map.set(key, list);
    }
    return map;
  }, [items]);

  const parents = useMemo(() => {
    if (!search) return allParents;
    const q = search.toLowerCase();
    return allParents.filter((p) => {
      if (p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)) return true;
      const children = childMap.get(p._id) || [];
      return children.some((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
    });
  }, [allParents, childMap, search]);

  const childItemsForModal = useMemo(
    () => (childParent ? childMap.get(childParent._id) || [] : []),
    [childMap, childParent]
  );

  const resetForm = () => {
    setEditing(null);
    setForm({ name: '', slug: '', icon: '', order: 0, menuOrder: 0, active: true });
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
    } catch {
      addToast('Upload ảnh thất bại. Vui lòng thử lại.', 'error');
    } finally {
      setIconUploading(false);
      if (iconInputRef.current) iconInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      icon: form.icon.trim() || undefined,
      parentId: editing?.parentId || undefined,
      order: Number(form.order),
      menuOrder: Number(form.menuOrder),
      active: form.active,
    };

    if (!payload.name || !payload.slug) {
      addToast('Vui lòng nhập tên và slug', 'error');
      return;
    }
    if (!editing && !payload.icon) {
      addToast('Vui lòng thêm ảnh danh mục', 'error');
      return;
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
    const confirmed = window.confirm(item.active ? `Ẩn danh mục "${item.name}"?` : `Hiển thị lại danh mục "${item.name}"?`);
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/categories/${item._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('Lỗi ẩn/hiển thị danh mục');
      addToast(item.active ? 'Đã ẩn danh mục' : 'Đã hiển thị danh mục', 'success');
      fetchCategories();
    } catch (err: any) {
      addToast(err?.message || 'Lỗi ẩn/hiển thị danh mục', 'error');
    }
  };

  const openDeleteModal = async (item: CategoryItem) => {
    setDeleteModal({
      open: true,
      source: item,
      targetCategoryId: '',
      loading: true,
      products: [],
      selectedProductIds: [],
    });
    try {
      const res = await fetch(`/api/admin/categories/${item._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_products' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Không tải được sản phẩm trong danh mục');
      const products: ProductLite[] = Array.isArray(data?.products) ? data.products : [];
      setDeleteModal((prev) => ({
        ...prev,
        loading: false,
        products,
        selectedProductIds: products.map((p) => p._id),
      }));
    } catch (err: any) {
      addToast(err?.message || 'Không tải được sản phẩm trong danh mục', 'error');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      open: false,
      source: null,
      targetCategoryId: '',
      loading: false,
      products: [],
      selectedProductIds: [],
    });
  };

  const confirmDeleteWithTransfer = async () => {
    const source = deleteModal.source;
    if (!source) return;
    try {
      if (deleteModal.products.length > 0) {
        if (!deleteModal.targetCategoryId) {
          addToast('Vui lòng chọn danh mục đích để chuyển sản phẩm', 'error');
          return;
        }
        if (!deleteModal.selectedProductIds.length) {
          addToast('Vui lòng chọn ít nhất 1 sản phẩm để chuyển', 'error');
          return;
        }

        const res = await fetch(`/api/admin/categories/${source._id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'transfer_delete',
            targetCategoryId: deleteModal.targetCategoryId,
            productIds: deleteModal.selectedProductIds,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.message || 'Lỗi chuyển sản phẩm và xóa danh mục');
        addToast(`Đã chuyển ${body?.movedCount || 0} sản phẩm và xóa danh mục`, 'success');
      } else {
        const res = await fetch(`/api/admin/categories/${source._id}`, { method: 'DELETE' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.message || 'Lỗi xóa danh mục');
        addToast('Đã xóa danh mục', 'success');
      }
      closeDeleteModal();
      fetchCategories();
    } catch (err: any) {
      addToast(err?.message || 'Lỗi xóa danh mục', 'error');
    }
  };

  const openChildModal = (parent: CategoryItem) => {
    setChildParent(parent);
    setChildEditing(null);
    setChildForm({ name: '', slug: '', active: true });
    setShowChildModal(true);
  };

  const closeChildModal = () => {
    setShowChildModal(false);
    setChildParent(null);
    setChildEditing(null);
    setChildForm({ name: '', slug: '', active: true });
  };

  const editChildInModal = (item: CategoryItem) => {
    setChildEditing(item);
    setChildForm({
      name: item.name || '',
      slug: item.slug || '',
      active: item.active ?? true,
    });
  };

  const saveChildFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childParent) return;
    const payload = {
      name: childForm.name.trim(),
      slug: childForm.slug.trim() || slugify(childForm.name),
      parentId: childParent._id,
      order: 0,
      menuOrder: 0,
      active: childForm.active,
    };

    if (!payload.name || !payload.slug) {
      addToast('Vui lòng nhập tên và slug cho danh mục con', 'error');
      return;
    }

    try {
      const endpoint = childEditing ? `/api/admin/categories/${childEditing._id}` : '/api/admin/categories';
      const method = childEditing ? 'PUT' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Lỗi lưu danh mục con');
      }
      addToast(childEditing ? 'Đã cập nhật danh mục con' : 'Đã thêm danh mục con', 'success');
      setChildEditing(null);
      setChildForm({ name: '', slug: '', active: true });
      fetchCategories();
    } catch (err: any) {
      addToast(err?.message || 'Lỗi lưu danh mục con', 'error');
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
          <table className="min-w-[1150px] w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-200 text-gray-600">
                <th className="sticky top-0 z-10 bg-white py-3 px-2 whitespace-nowrap">Ảnh</th>
                <th className="sticky top-0 z-10 bg-white py-3 px-2 whitespace-nowrap">Tên</th>
                <th className="sticky top-0 z-10 bg-white py-3 px-2 whitespace-nowrap">Slug</th>
                <th className="sticky top-0 z-10 bg-white py-3 px-2 whitespace-nowrap">Thứ tự (section)</th>
                <th className="sticky top-0 z-10 bg-white py-3 px-2 whitespace-nowrap">Thứ tự (menu)</th>
                <th className="sticky top-0 z-10 bg-white py-3 px-2 whitespace-nowrap">Danh mục con</th>
                <th className="sticky top-0 z-10 bg-white py-3 px-2 whitespace-nowrap">Trạng thái</th>
                <th className="sticky top-0 z-10 bg-white py-3 px-2 whitespace-nowrap">Ngày tạo</th>
                <th className="sticky top-0 z-10 bg-white py-3 px-2 whitespace-nowrap">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-6 text-center text-gray-500">Đang tải...</td></tr>
              ) : error ? (
                <tr><td colSpan={9} className="py-6 text-center text-red-600">{error}</td></tr>
              ) : parents.length === 0 ? (
                <tr><td colSpan={9} className="py-6 text-center text-gray-500">Không có danh mục.</td></tr>
              ) : (
                parents.map((parent) => {
                  const childCount = (childMap.get(parent._id) || []).length;
                  return (
                    <tr key={parent._id} className="border-b border-gray-100">
                      <td className="py-3 px-2 whitespace-nowrap">
                        {parent.icon ? (
                          <img src={parent.icon} alt="" className="h-12 w-12 object-cover rounded-md border border-gray-200" />
                        ) : (
                          <div className="h-12 w-12 rounded-md bg-gray-100 border border-gray-200" />
                        )}
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap">
                        <button onClick={() => openChildModal(parent)} className="font-medium text-emerald-700 hover:underline">
                          {parent.name}
                        </button>
                      </td>
                      <td className="py-3 px-2 text-gray-700 whitespace-nowrap">{parent.slug}</td>
                      <td className="py-3 px-2 text-gray-600 whitespace-nowrap">{parent.order ?? 0}</td>
                      <td className="py-3 px-2 text-gray-600 whitespace-nowrap">{parent.menuOrder ?? 0}</td>
                      <td className="py-3 px-2 whitespace-nowrap">
                        <button
                          onClick={() => openChildModal(parent)}
                          className="rounded-md border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          {childCount} danh mục con
                        </button>
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${parent.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                          {parent.active ? 'Hiển thị' : 'Đã ẩn'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-600 whitespace-nowrap">{formatDate(parent.createdAt)}</td>
                      <td className="py-3 px-2 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(parent)} className="min-w-[60px] px-3 py-1 rounded-md border border-gray-200 text-sm hover:bg-gray-50">Sửa</button>
                          <button onClick={() => handleHide(parent)} className={`min-w-[60px] px-3 py-1 rounded-md border text-sm ${parent.active ? 'border-amber-200 text-amber-700 hover:bg-amber-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>{parent.active ? 'Ẩn' : 'Hiện'}</button>
                          <button onClick={() => openDeleteModal(parent)} className="min-w-[60px] px-3 py-1 rounded-md border border-rose-200 text-sm text-rose-700 hover:bg-rose-50">Xóa</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-4 text-sm text-gray-600">
          <div>Trang {page} / {totalPages}</div>
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
            <div className="fixed top-0 left-0 w-[100vw] h-[100vh] bg-[rgba(0,0,0,0.45)] backdrop-blur-sm flex items-center justify-center z-[999]">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto z-[1000]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                  <div className="text-lg font-semibold text-gray-900">{editing ? 'Sửa danh mục' : 'Thêm danh mục'}</div>
                  <button onClick={closeForm} className="text-gray-500 hover:text-gray-700 text-sm">Đóng</button>
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
                              <input ref={iconInputRef} type="file" accept="image/*" className="hidden" disabled={iconUploading} onChange={(e) => handleIconFile(e.target.files)} />
                            </label>
                          </>
                        )}
                      </div>
                      {form.icon ? (
                        <div className="mt-3 flex items-center gap-2">
                          <img src={form.icon} alt="Preview" className="h-20 w-20 object-cover rounded-md border border-gray-200" />
                          <button type="button" onClick={() => setForm((prev) => ({ ...prev, icon: '' }))} className="text-xs text-rose-600 hover:underline">Xóa ảnh</button>
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
                          setForm((prev) => ({ ...prev, name: nameVal, slug: slugify(nameVal) }));
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
                      <input type="checkbox" checked={form.active} onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))} className="accent-emerald-600" />
                      Hiển thị (active)
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button type="button" onClick={closeForm} className="px-4 py-2 rounded-md border border-gray-200 text-sm hover:bg-gray-50">Huỷ</button>
                    <button type="submit" className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
                      {editing ? 'Lưu thay đổi' : 'Thêm mới'}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}

      {showChildModal && childParent && mounted
        ? createPortal(
            <div className="fixed top-0 left-0 w-[100vw] h-[100vh] bg-[rgba(0,0,0,0.45)] backdrop-blur-sm flex items-center justify-center z-[1001]">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">Danh mục con: {childParent.name}</div>
                    <div className="text-sm text-gray-500">Quản lý danh mục con cho danh mục cha này</div>
                  </div>
                  <button onClick={closeChildModal} className="text-gray-500 hover:text-gray-700 text-sm">Đóng</button>
                </div>

                <div className="p-5 space-y-4">
                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <table className="min-w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-600">
                          <th className="py-2 px-3">Tên</th>
                          <th className="py-2 px-3">Slug</th>
                          <th className="py-2 px-3">Trạng thái</th>
                          <th className="py-2 px-3">Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {childItemsForModal.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 px-3 text-gray-500 text-center">Chưa có danh mục con</td>
                          </tr>
                        ) : (
                          childItemsForModal.map((child) => (
                            <tr key={child._id} className="border-b border-gray-100 last:border-b-0">
                              <td className="py-2 px-3 font-medium">{child.name}</td>
                              <td className="py-2 px-3 text-gray-700">{child.slug}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${child.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                                  {child.active ? 'Hiển thị' : 'Đã ẩn'}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <button onClick={() => editChildInModal(child)} className="px-2 py-1 rounded border border-gray-200 text-xs hover:bg-gray-50">Sửa</button>
                                  <button onClick={() => handleHide(child)} className="px-2 py-1 rounded border border-gray-200 text-xs hover:bg-gray-50">{child.active ? 'Ẩn' : 'Hiện'}</button>
                                  <button onClick={() => openDeleteModal(child)} className="px-2 py-1 rounded border border-rose-200 text-xs text-rose-700 hover:bg-rose-50">Xóa</button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <form onSubmit={saveChildFromModal} className="border border-gray-200 rounded-md p-4 space-y-3">
                    <div className="text-sm font-semibold text-gray-900">
                      {childEditing ? `Sửa danh mục con: ${childEditing.name}` : 'Thêm danh mục con mới'}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        value={childForm.name}
                        onChange={(e) => {
                          const nameVal = e.target.value;
                          setChildForm((prev) => ({ ...prev, name: nameVal, slug: slugify(nameVal) }));
                        }}
                        placeholder="Tên danh mục con"
                        className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                        required
                      />
                      <input
                        value={childForm.slug}
                        onChange={(e) => setChildForm((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
                        placeholder="Slug"
                        className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                        required
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-800">
                      <input type="checkbox" checked={childForm.active} onChange={(e) => setChildForm((prev) => ({ ...prev, active: e.target.checked }))} className="accent-emerald-600" />
                      Hiển thị (active)
                    </label>
                    <div className="flex items-center justify-end gap-2">
                      {childEditing ? (
                        <button
                          type="button"
                          onClick={() => {
                            setChildEditing(null);
                            setChildForm({ name: '', slug: '', active: true });
                          }}
                          className="px-3 py-2 rounded-md border border-gray-200 text-sm hover:bg-gray-50"
                        >
                          Huỷ sửa
                        </button>
                      ) : null}
                      <button type="submit" className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
                        {childEditing ? 'Lưu danh mục con' : 'Thêm danh mục con'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {deleteModal.open && deleteModal.source && mounted
        ? createPortal(
            <div className="fixed top-0 left-0 w-[100vw] h-[100vh] bg-[rgba(0,0,0,0.45)] backdrop-blur-sm flex items-center justify-center z-[1002]">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">Xóa danh mục: {deleteModal.source.name}</div>
                    <div className="text-sm text-gray-500">
                      {deleteModal.products.length
                        ? 'Danh mục này đang có sản phẩm. Chọn sản phẩm cần chuyển và danh mục đích.'
                        : 'Danh mục này chưa có sản phẩm. Bạn có thể xóa ngay.'}
                    </div>
                  </div>
                  <button onClick={closeDeleteModal} className="text-gray-500 hover:text-gray-700 text-sm">
                    Đóng
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  {deleteModal.loading ? (
                    <div className="text-sm text-gray-500">Đang tải danh sách sản phẩm...</div>
                  ) : deleteModal.products.length > 0 ? (
                    <>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-gray-500">Chuyển sang danh mục</label>
                          <select
                            value={deleteModal.targetCategoryId}
                            onChange={(e) => setDeleteModal((prev) => ({ ...prev, targetCategoryId: e.target.value }))}
                            className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                          >
                            <option value="">— Chọn danh mục đích —</option>
                            {allParents
                              .filter((x) => x._id !== deleteModal.source?._id)
                              .map((x) => (
                                <option key={x._id} value={x._id}>
                                  {x.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={deleteModal.products.length > 0 && deleteModal.selectedProductIds.length === deleteModal.products.length}
                              onChange={(e) =>
                                setDeleteModal((prev) => ({
                                  ...prev,
                                  selectedProductIds: e.target.checked ? prev.products.map((p) => p._id) : [],
                                }))
                              }
                              className="accent-emerald-600"
                            />
                            Chọn tất cả sản phẩm
                          </label>
                        </div>
                      </div>

                      <div className="border border-gray-200 rounded-md max-h-72 overflow-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                              <th className="py-2 px-3 w-10" />
                              <th className="py-2 px-3">Sản phẩm</th>
                              <th className="py-2 px-3">Slug</th>
                            </tr>
                          </thead>
                          <tbody>
                            {deleteModal.products.map((p) => (
                              <tr key={p._id} className="border-b border-gray-100 last:border-b-0">
                                <td className="py-2 px-3">
                                  <input
                                    type="checkbox"
                                    checked={deleteModal.selectedProductIds.includes(p._id)}
                                    onChange={(e) =>
                                      setDeleteModal((prev) => ({
                                        ...prev,
                                        selectedProductIds: e.target.checked
                                          ? [...prev.selectedProductIds, p._id]
                                          : prev.selectedProductIds.filter((id) => id !== p._id),
                                      }))
                                    }
                                    className="accent-emerald-600"
                                  />
                                </td>
                                <td className="py-2 px-3">{p.name}</td>
                                <td className="py-2 px-3 text-gray-600">{p.slug}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-600">Không có sản phẩm trong danh mục này.</div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeDeleteModal}
                      className="px-4 py-2 rounded-md border border-gray-200 text-sm hover:bg-gray-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={confirmDeleteWithTransfer}
                      className="px-4 py-2 rounded-md bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700"
                    >
                      {deleteModal.products.length ? 'Chuyển & Xóa danh mục' : 'Xóa danh mục'}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/components/ToastProvider';
import { slugify } from '@/lib/helpers/string';

type ProductItem = {
  _id: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  saleInputType?: 'amount' | 'percent';
  saleInputValue?: number;
  images: string[];
  categoryId?: string;
  categoryIds?: string[];
  colors?: string[];
  flowerTypes?: string[];
  active: boolean;
  createdAt: string;
  metaDescription?: string;
  description?: string;
  note?: string; // Lưu ý sản phẩm
  specialOffers?: string; // Ưu đãi đặc biệt
};

type CategoryLite = { _id: string; name: string; slug?: string };

type FetchResponse = {
  items: ProductItem[];
  total: number;
  page: number;
  limit: number;
  categories: CategoryLite[];
};

const pageSize = 8;

async function filesToDataUrls(files: FileList | null): Promise<string[]> {
  if (!files || files.length === 0) return [];
  const readers = Array.from(files).map(
    (file) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      })
  );
  return Promise.all(readers);
}

type ImageDropProps = {
  value: string[];
  onChange: (urls: string[]) => void;
  single?: boolean;
};

function ImageDrop({ value, onChange, single }: ImageDropProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const dataUrls = await filesToDataUrls(files);
      if (dataUrls.length === 0) return;
      const uploadedUrls: string[] = [];
      for (const dataUrl of dataUrls) {
        const res = await fetch('/api/upload/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ image: dataUrl, folder: 'products' }),
        });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        if (data?.url) uploadedUrls.push(data.url);
      }
      if (uploadedUrls.length > 0) {
        if (single) onChange([uploadedUrls[0]]);
        else onChange([...(value || []), ...uploadedUrls]);
      }
    } catch (err) {
      console.error('Upload error:', err);
      addToast('Upload ảnh thất bại. Vui lòng thử lại.', 'error');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (idx: number) => {
    const next = [...value];
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div className="border border-dashed border-gray-300 rounded-md p-3 bg-gray-50">
      <div
        className={`flex flex-col items-center justify-center gap-2 text-sm text-gray-600 rounded-md border border-dashed ${
          uploading ? 'border-gray-200 bg-gray-100 cursor-wait' : isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-white'
        } py-6 ${uploading ? '' : 'cursor-pointer'}`}
        onDragOver={(e) => {
          if (uploading) return;
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!uploading) handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="font-semibold">
          {uploading ? 'Đang tải lên Cloudinary...' : single ? 'Chọn / kéo thả ảnh chính' : 'Chọn / kéo thả ảnh'}
        </div>
        <div className="text-xs text-gray-500">{single ? 'Chỉ chọn 1 ảnh' : 'Hỗ trợ nhiều ảnh (drag & drop)'}</div>
        <label className={`px-3 py-2 border rounded-md text-xs font-semibold ${uploading ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-300 text-gray-700 hover:border-emerald-500 cursor-pointer'}`}>
          Chọn ảnh
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple={!single}
            disabled={uploading}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>

      {value?.length ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {value.map((url, idx) => (
            <div key={idx} className="relative group">
              <img src={url} alt="preview" className="h-20 w-full object-cover rounded-md border border-gray-200" />
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded-full px-2 py-0.5 opacity-0 group-hover:opacity-100 transition"
              >
                X
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function formatWithDots(value: string) {
  const digits = value.replace(/\D+/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseNumber(value: string) {
  const digits = value.replace(/\D+/g, '');
  const num = Number(digits || 0);
  return Number.isNaN(num) ? 0 : num;
}

export default function AdminProducts() {
  const { addToast } = useToast();
  const [items, setItems] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryLite[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [categoryId, setCategoryId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterOptions, setFilterOptions] = useState<{ types: string[]; colors: string[] }>({ types: [], colors: [] });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProductItem | null>(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    price: '',
    saleType: 'amount' as 'amount' | 'percent',
    saleValue: '',
    metaDescription: '',
    description: '',
    mainImage: '',
    galleryUrls: [] as string[],
    categoryIds: [] as string[], // Changed from categoryId to categoryIds (array)
    colors: [] as string[],
    flowerTypes: [] as string[],
    active: true,
    note: '', // Lưu ý sản phẩm
    specialOffers: '', // Ưu đãi đặc biệt
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      params.set('lite', '1');
      if (search) params.set('search', search);
      if (status !== 'all') params.set('status', status);
      if (categoryId) params.set('categoryId', categoryId);
      const res = await fetch(`/api/admin/products?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Fetch error');
      }
      const data: FetchResponse = await res.json();
      setItems(data.items || []);
      setCategories(data.categories || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status, categoryId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const res = await fetch('/api/admin/settings/product-filters');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const filters = data?.filters || {};
        const types = Array.isArray(filters?.types?.items)
          ? filters.types.items.filter((x: any) => x?.enabled !== false).map((x: any) => String(x.label || '').trim()).filter(Boolean)
          : [];
        const colors = Array.isArray(filters?.colors?.items)
          ? filters.colors.items.filter((x: any) => x?.enabled !== false).map((x: any) => String(x.label || '').trim()).filter(Boolean)
          : [];
        setFilterOptions({ types, colors });
      } catch {
        // ignore
      }
    };
    loadFilters();
  }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({
      name: '',
      slug: '',
      price: '',
      saleType: 'amount',
      saleValue: '',
      metaDescription: '',
      description: '',
      mainImage: '',
      galleryUrls: [],
      categoryIds: [],
      colors: [],
      flowerTypes: [],
      active: true,
      note: '',
      specialOffers: '',
    });
    setFieldErrors({});
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (item: ProductItem) => {
    const loadAndOpen = async () => {
      let full = item;
      const missingDetails =
        item.metaDescription === undefined ||
        item.description === undefined ||
        item.note === undefined ||
        item.specialOffers === undefined ||
        item.colors === undefined ||
        item.flowerTypes === undefined;
      if (missingDetails) {
        try {
          const res = await fetch(`/api/admin/products/${item._id}`, { credentials: 'include' });
          if (res.ok) {
            const detail = await res.json().catch(() => null);
            if (detail && typeof detail === 'object') {
              full = { ...item, ...detail } as ProductItem;
            }
          } else {
            const body = await res.json().catch(() => ({}));
            addToast(body?.message || 'Không tải được chi tiết sản phẩm', 'error');
          }
        } catch {
          addToast('Không tải được chi tiết sản phẩm', 'error');
        }
      }

      setEditing(full);
      const priceNum = full.price ?? 0;
      const salePriceNum = full.salePrice ?? 0;
      const hasStoredInput = full.saleInputType && (full.saleInputValue !== undefined && full.saleInputValue !== null);
      let saleType: 'amount' | 'percent' = 'amount';
      let saleValue = '';
      if (hasStoredInput && (full.saleInputType === 'amount' || full.saleInputType === 'percent')) {
        saleType = full.saleInputType;
        saleValue = full.saleInputValue != null ? formatWithDots(String(full.saleInputValue)) : '';
      } else if (priceNum > 0 && salePriceNum >= 0 && priceNum > salePriceNum) {
        saleType = 'amount';
        saleValue = formatWithDots(String(priceNum - salePriceNum));
      }
      setForm({
        name: full.name || '',
        slug: full.slug || '',
        price: priceNum ? formatWithDots(String(priceNum)) : '',
        saleType,
        saleValue,
        metaDescription: full.metaDescription || '',
        description: full.description || '',
        mainImage: full.images?.[0] || '',
        galleryUrls: full.images?.slice(1) || [],
        categoryIds: full.categoryIds || (full.categoryId ? [full.categoryId] : []),
        colors: (full.colors || []).map(String),
        flowerTypes: (full.flowerTypes || []).map(String),
        active: full.active ?? true,
        note: (full as any).note || '',
        specialOffers: (full as any).specialOffers || '',
      });
      setFieldErrors({});
      setShowForm(true);
    };
    loadAndOpen();
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({}); // Clear previous errors
    
    const payloadImages = [form.mainImage, ...(form.galleryUrls || [])].filter(Boolean);
    const priceNum = parseNumber(form.price);
    let salePriceNum: number | undefined;
    let saleInputType: 'amount' | 'percent' | undefined;
    let saleInputValue: number | undefined;
    if (form.saleValue) {
      if (form.saleType === 'amount') {
        const discountAmount = parseNumber(form.saleValue);
        salePriceNum = Math.max(0, priceNum - discountAmount);
        saleInputType = 'amount';
        saleInputValue = discountAmount;
      } else {
        const percent = parseNumber(form.saleValue);
        salePriceNum = Math.max(0, priceNum - (priceNum * percent) / 100);
        saleInputType = 'percent';
        saleInputValue = percent;
      }
    }
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      price: priceNum || 0,
      salePrice: salePriceNum,
      saleInputType,
      saleInputValue,
      metaDescription: form.metaDescription.trim(),
      description: form.description.trim(),
      images: payloadImages,
      categoryIds: form.categoryIds, // FIX: Always send array (empty or with IDs), never undefined
      colors: form.colors,
      flowerTypes: form.flowerTypes,
      active: form.active,
      note: form.note.trim() || undefined,
      specialOffers: form.specialOffers.trim() || undefined,
    };

    try {
      const method = editing ? 'PATCH' : 'POST';
      const endpoint = editing ? `/api/admin/products/${editing._id}` : '/api/admin/products';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        
        // Parse field errors from backend
        if (body.errors && Array.isArray(body.errors)) {
          const errMap: Record<string, string> = {};
          body.errors.forEach((err: any) => {
            if (err.field && err.message) {
              errMap[err.field] = err.message;
            }
          });
          setFieldErrors(errMap);
        }
        
        throw new Error(body?.message || 'Lỗi lưu sản phẩm');
      }
      addToast(editing ? 'Cập nhật sản phẩm thành công' : 'Thêm sản phẩm thành công', 'success');
      closeForm();
      fetchProducts();
    } catch (err: any) {
      addToast(err?.message || 'Lỗi lưu sản phẩm', 'error');
    }
  };

  const handleHide = async (item: ProductItem) => {
    const action = item.active ? 'hide' : 'unhide';
    const confirmed = window.confirm(
      item.active
        ? `Ẩn sản phẩm "${item.name}"? (Sản phẩm sẽ không hiển thị cho khách hàng nhưng vẫn còn trong hệ thống)`
        : `Hiển thị lại sản phẩm "${item.name}"?`
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/products/${item._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Lỗi ẩn/hiển thị sản phẩm');
      }
      addToast(item.active ? 'Đã ẩn sản phẩm' : 'Đã hiển thị sản phẩm', 'success');
      fetchProducts();
    } catch (err: any) {
      addToast(err?.message || 'Lỗi ẩn/hiển thị sản phẩm', 'error');
    }
  };

  const handleDelete = async (item: ProductItem) => {
    const confirmed = window.confirm(
      `⚠️ CẢNH BÁO: Bạn có chắc muốn XÓA VĨNH VIỄN sản phẩm "${item.name}"?\n\n` +
      `Hành động này KHÔNG THỂ hoàn tác. Sản phẩm sẽ bị xóa hoàn toàn khỏi database.\n\n` +
      `Nếu chỉ muốn ẩn khỏi khách hàng, hãy sử dụng nút "Ẩn" thay vì "Xóa".`
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/products/${item._id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Lỗi xóa sản phẩm');
      }
      addToast('Đã xóa sản phẩm vĩnh viễn', 'success');
      fetchProducts();
    } catch (err: any) {
      addToast(err?.message || 'Lỗi xóa sản phẩm', 'error');
    }
  };

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c._id, c.name])),
    [categories]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Quản lý sản phẩm</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
        >
          Thêm sản phẩm
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4 mb-4">
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
          <select
            value={categoryId}
            onChange={(e) => {
              setPage(1);
              setCategoryId(e.target.value);
            }}
            className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-200 text-gray-600">
                <th className="py-3 px-2">Ảnh</th>
                <th className="py-3 px-2">Tên</th>
                <th className="py-3 px-2">Giá</th>
                <th className="py-3 px-2">Danh mục</th>
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
                  <td colSpan={7} className="py-6 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500">
                    Không có sản phẩm.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id} className="border-b border-gray-100">
                    <td className="py-3 px-2">
                      {item.images?.[0] ? (
                        <img
                          src={item.images[0]}
                          alt={item.name}
                          className="h-12 w-12 object-cover rounded-md border border-gray-200"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-md bg-gray-100 border border-gray-200" />
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.slug}</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="text-gray-900 font-semibold">{formatCurrency(item.price)}</div>
                      {item.salePrice ? (
                        <div className="text-xs text-amber-600">{formatCurrency(item.salePrice)}</div>
                      ) : null}
                    </td>
                    <td className="py-3 px-2 text-gray-700">
                      {categoryMap[item.categoryId || item.categoryIds?.[0] || ''] || '—'}
                    </td>
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
                    <td className="py-3 px-2 text-gray-600">
                      {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                    </td>
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
                      {editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
                    </div>
                    <div className="text-sm text-gray-500">Product admin CRUD – do not affect other admin modules</div>
                  </div>
                  <button onClick={closeForm} className="text-gray-500 hover:text-gray-700 text-sm">
                    Đóng
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Tên sản phẩm</label>
                      <input
                        value={form.name}
                        onChange={(e) => {
                          const nameVal = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            name: nameVal,
                            slug: slugify(nameVal), // Always auto-generate slug from name
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
                        placeholder="Tự động sinh từ tên (có thể sửa thủ công)"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Giá</label>
                      <input
                        inputMode="numeric"
                        value={form.price}
                        onChange={(e) => setForm((prev) => ({ ...prev, price: formatWithDots(e.target.value) }))}
                        className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-gray-500">Giá khuyến mãi</label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={form.saleType}
                          onChange={(e) => setForm((prev) => ({ ...prev, saleType: e.target.value as any, saleValue: '' }))}
                          className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                        >
                          <option value="amount">Giảm theo số tiền</option>
                          <option value="percent">Giảm theo %</option>
                        </select>
                        <input
                          inputMode="numeric"
                          value={form.saleValue}
                          onChange={(e) => setForm((prev) => ({ ...prev, saleValue: formatWithDots(e.target.value) }))}
                          className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                          placeholder={form.saleType === 'amount' ? 'VD: 20.000' : 'VD: 5'}
                        />
                      </div>
                      {form.saleValue && form.price ? (
                        <div className="text-xs text-gray-600">
                          Giá sau giảm:{' '}
                          <span className="font-semibold">
                            {formatCurrency(
                              form.saleType === 'amount'
                                ? Math.max(0, parseNumber(form.price) - parseNumber(form.saleValue))
                                : Math.max(
                                    0,
                                    parseNumber(form.price) -
                                      (parseNumber(form.price) * parseNumber(form.saleValue)) / 100
                                  )
                            )}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">Tuỳ chọn</div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">
                      Mô tả ngắn <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.metaDescription}
                      onChange={(e) => setForm((prev) => ({ ...prev, metaDescription: e.target.value }))}
                      className={`border rounded-md px-3 h-11 text-sm bg-white ${
                        fieldErrors.metaDescription ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Hiển thị ngắn gọn"
                      required
                    />
                    {fieldErrors.metaDescription && (
                      <div className="text-xs text-red-600">{fieldErrors.metaDescription}</div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Mô tả chi tiết</label>
                    <textarea
                      rows={4}
                      value={form.description}
                      onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                      placeholder="Thông tin chi tiết"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Ảnh chính</label>
                      <ImageDrop
                        single
                        value={form.mainImage ? [form.mainImage] : []}
                        onChange={(urls) => setForm((prev) => ({ ...prev, mainImage: urls[0] || '' }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Ảnh phụ (kéo thả hoặc chọn nhiều)</label>
                      <ImageDrop
                        value={form.galleryUrls}
                        onChange={(urls) => setForm((prev) => ({ ...prev, galleryUrls: urls }))}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Lưu ý</label>
                      <textarea
                        rows={3}
                        value={form.note}
                        onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                        className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                        placeholder="Nhập lưu ý cho sản phẩm (hiển thị nổi bật trên trang chi tiết)"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Ưu đãi đặc biệt</label>
                      <textarea
                        rows={4}
                        value={form.specialOffers}
                        onChange={(e) => setForm((prev) => ({ ...prev, specialOffers: e.target.value }))}
                        className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                        placeholder="Nhập ưu đãi đặc biệt (mỗi ưu đãi một dòng, hiển thị dạng danh sách)"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">
                        Danh mục <span className="text-red-500">*</span>
                      </label>
                      <div className={`border rounded-md px-3 py-2 text-sm bg-white max-h-32 overflow-y-auto ${
                        fieldErrors.categoryIds ? 'border-red-500' : 'border-gray-200'
                      }`}>
                        {categories.length === 0 ? (
                          <div className="text-gray-400 text-xs">Chưa có danh mục</div>
                        ) : (
                          categories.map((c) => (
                            <label key={c._id} className="flex items-center gap-2 py-1 hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={form.categoryIds.includes(c._id)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setForm((prev) => ({
                                    ...prev,
                                    categoryIds: checked
                                      ? [...prev.categoryIds, c._id]
                                      : prev.categoryIds.filter((id) => id !== c._id),
                                  }));
                                }}
                                className="accent-emerald-600"
                              />
                              <span className="text-sm text-gray-800">{c.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                      {fieldErrors.categoryIds && (
                        <div className="text-xs text-red-600">{fieldErrors.categoryIds}</div>
                      )}
                      {fieldErrors.categoryId && (
                        <div className="text-xs text-red-600">{fieldErrors.categoryId}</div>
                      )}
                      {form.categoryIds.length > 0 && (
                        <div className="text-xs text-gray-600">
                          Đã chọn: {form.categoryIds.length} danh mục
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 pt-6">
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
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-gray-500">Loại hoa (từ Bộ lọc sản phẩm)</label>
                      <div className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white max-h-32 overflow-y-auto">
                        {filterOptions.types.length === 0 ? (
                          <div className="text-gray-400 text-xs">Chưa cấu hình (Admin → Cài đặt → Bộ lọc sản phẩm)</div>
                        ) : (
                          filterOptions.types.map((opt) => (
                            <label key={opt} className="flex items-center gap-2 py-1 hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={form.flowerTypes.includes(opt)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setForm((prev) => ({
                                    ...prev,
                                    flowerTypes: checked ? [...prev.flowerTypes, opt] : prev.flowerTypes.filter((v) => v !== opt),
                                  }));
                                }}
                                className="accent-emerald-600"
                              />
                              <span className="text-sm text-gray-800">{opt}</span>
                            </label>
                          ))
                        )}
                      </div>
                      {form.flowerTypes.length > 0 && (
                        <div className="text-xs text-gray-600">Đã chọn: {form.flowerTypes.length} loại</div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-gray-500">Màu sắc (từ Bộ lọc sản phẩm)</label>
                      <div className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white max-h-32 overflow-y-auto">
                        {filterOptions.colors.length === 0 ? (
                          <div className="text-gray-400 text-xs">Chưa cấu hình (Admin → Cài đặt → Bộ lọc sản phẩm)</div>
                        ) : (
                          filterOptions.colors.map((opt) => (
                            <label key={opt} className="flex items-center gap-2 py-1 hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={form.colors.includes(opt)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setForm((prev) => ({
                                    ...prev,
                                    colors: checked ? [...prev.colors, opt] : prev.colors.filter((v) => v !== opt),
                                  }));
                                }}
                                className="accent-emerald-600"
                              />
                              <span className="text-sm text-gray-800">{opt}</span>
                            </label>
                          ))
                        )}
                      </div>
                      {form.colors.length > 0 && <div className="text-xs text-gray-600">Đã chọn: {form.colors.length} màu</div>}
                    </div>
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

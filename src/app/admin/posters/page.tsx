'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/components/ToastProvider';

type PosterItem = {
  _id: string;
  imageUrl: string;
  name?: string;
  link?: string;
  order?: number;
  active: boolean;
  createdAt?: string;
};

type FetchResponse = {
  items: PosterItem[];
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

export default function AdminPosters() {
  const { addToast } = useToast();
  const [items, setItems] = useState<PosterItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PosterItem | null>(null);
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    imageUrl: '',
    link: '',
    order: 0,
    active: true,
  });
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchPosters = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));

      const res = await fetch(`/api/admin/posters?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Fetch error');
      }
      const data: FetchResponse = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosters();
  }, [page]);

  const resetForm = () => {
    setEditing(null);
    setForm({
      name: '',
      imageUrl: '',
      link: '',
      order: 0,
      active: true,
    });
  };

  const handleImageFile = async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      addToast('Vui lòng chọn file ảnh', 'error');
      return;
    }
    setImageUploading(true);
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
        body: JSON.stringify({ image: base64, folder: 'posters' }),
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      if (data?.url) setForm((prev) => ({ ...prev, imageUrl: data.url }));
    } catch (err) {
      console.error(err);
      addToast('Upload ảnh thất bại. Vui lòng thử lại.', 'error');
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (item: PosterItem) => {
    setEditing(item);
    setForm({
      name: item.name || '',
      imageUrl: item.imageUrl || '',
      link: item.link || '',
      order: item.order ?? 0,
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
      name: form.name.trim() || undefined,
      imageUrl: form.imageUrl.trim(),
      link: form.link.trim() || undefined,
      order: Number(form.order),
      active: form.active,
    };

    if (!payload.imageUrl) {
      addToast('Vui lòng thêm ảnh poster', 'error');
      return;
    }

    try {
      const method = editing ? 'PUT' : 'POST';
      const endpoint = editing ? `/api/admin/posters/${editing._id}` : '/api/admin/posters';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Lỗi lưu poster');
      }
      addToast(editing ? 'Cập nhật poster thành công' : 'Thêm poster thành công', 'success');
      closeForm();
      fetchPosters();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Lỗi lưu poster', 'error');
    }
  };

  const handleHide = async (item: PosterItem) => {
    const action = item.active ? 'hide' : 'unhide';
    const confirmed = window.confirm(
      item.active
        ? `Ẩn poster này? (Poster sẽ không hiển thị trên trang chủ nhưng vẫn còn trong hệ thống)`
        : `Hiển thị lại poster này?`
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/posters/${item._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Lỗi ẩn/hiển thị poster');
      }
      addToast(item.active ? 'Đã ẩn poster' : 'Đã hiển thị poster', 'success');
      fetchPosters();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Lỗi ẩn/hiển thị poster', 'error');
    }
  };

  const handleDelete = async (item: PosterItem) => {
    const confirmed = window.confirm(
      `⚠️ Bạn có chắc muốn XÓA VĨNH VIỄN poster này?\n\n` +
        `Hành động này KHÔNG THỂ hoàn tác. Nếu chỉ muốn ẩn khỏi trang chủ, hãy dùng nút "Ẩn".`
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/posters/${item._id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Lỗi xóa poster');
      }
      addToast('Đã xóa poster vĩnh viễn', 'success');
      fetchPosters();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Lỗi xóa poster', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Quản lý Poster / Banner</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
        >
          Thêm poster
        </button>
      </div>
      <p className="text-sm text-gray-500">
        Chỉ tối đa 6 poster hiển thị trên trang chủ (banner). Số thứ tự hiển thị không được trùng.
      </p>

      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-200 text-gray-600">
                <th className="py-3 px-2">Ảnh</th>
                <th className="py-3 px-2">Tên poster</th>
                <th className="py-3 px-2">Link</th>
                <th className="py-3 px-2">Thứ tự</th>
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
                    Chưa có poster. Nhấn &quot;Thêm poster&quot; để thêm.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id} className="border-b border-gray-100">
                    <td className="py-3 px-2">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="h-14 w-24 object-cover rounded-md border border-gray-200"
                        />
                      ) : (
                        <div className="h-14 w-24 rounded-md bg-gray-100 border border-gray-200" />
                      )}
                    </td>
                    <td className="py-3 px-2 text-gray-900 font-medium max-w-[180px]">
                      {item.name || '—'}
                    </td>
                    <td className="py-3 px-2 text-gray-700 max-w-[200px] truncate" title={item.link}>
                      {item.link || '—'}
                    </td>
                    <td className="py-3 px-2 text-gray-600">{item.order ?? 0}</td>
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

      {showForm &&
        mounted &&
        createPortal(
          <div className="fixed top-0 left-0 w-[100vw] h-[100vh] bg-[rgba(0,0,0,0.45)] backdrop-blur-sm flex items-center justify-center z-[999]">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-[1000]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <div className="text-lg font-semibold text-gray-900">
                  {editing ? 'Sửa poster' : 'Thêm poster'}
                </div>
                <button onClick={closeForm} className="text-gray-500 hover:text-gray-700 text-sm">
                  Đóng
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Tên poster (chỉ hiển thị trong quản lý)</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="VD: Banner Tết, Khuyến mãi tháng 3..."
                    className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Ảnh poster (Cloudinary)</label>
                  <div className="border border-dashed border-gray-300 rounded-md p-3 bg-gray-50">
                    <div
                      className={`flex flex-col items-center justify-center gap-2 text-sm text-gray-600 rounded-md border border-dashed py-6 cursor-pointer ${imageUploading ? 'border-gray-200 bg-gray-100 cursor-wait' : 'border-gray-300 bg-white hover:border-emerald-500 hover:bg-emerald-50'}`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (!imageUploading) handleImageFile(e.dataTransfer.files);
                      }}
                    >
                      {imageUploading ? (
                        <span className="text-gray-500">Đang tải lên Cloudinary...</span>
                      ) : (
                        <>
                          <span className="font-semibold">Chọn / kéo thả ảnh poster</span>
                          <label className="px-3 py-2 bg-white border border-gray-300 rounded-md text-xs font-semibold text-gray-700 hover:border-emerald-500 cursor-pointer">
                            Chọn ảnh
                            <input
                              ref={imageInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={imageUploading}
                              onChange={(e) => handleImageFile(e.target.files)}
                            />
                          </label>
                        </>
                      )}
                    </div>
                    {form.imageUrl ? (
                      <div className="mt-3 flex items-center gap-2">
                        <img
                          src={form.imageUrl}
                          alt="Preview"
                          className="h-24 w-40 object-cover rounded-md border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, imageUrl: '' }))}
                          className="text-xs text-rose-600 hover:underline"
                        >
                          Xóa ảnh
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Link (tùy chọn)</label>
                  <input
                    value={form.link}
                    onChange={(e) => setForm((prev) => ({ ...prev, link: e.target.value }))}
                    placeholder="https://..."
                    className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    min={0}
                    value={form.order}
                    onChange={(e) => setForm((prev) => ({ ...prev, order: Number(e.target.value) || 0 }))}
                    className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                      className="accent-emerald-600"
                    />
                    Hiển thị trên trang chủ
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
        )}
    </div>
  );
}

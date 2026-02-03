'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useToast } from '@/components/ToastProvider';

type UserRow = {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'customer';
  status?: 'active' | 'blocked' | 'deleted';
  phone?: string;
  avatar?: string;
  createdAt?: string;
};

type FetchResponse = {
  items: UserRow[];
  total: number;
  page: number;
  limit: number;
};

type FetchDetail = UserRow;

// User Admin Management - Scoped to Admin Panel only
// Do NOT reuse for Customer logic
// Do NOT change auth core

const pageSize = 10;
const roles = ['admin', 'staff', 'customer'] as const;
const statuses = ['active', 'blocked', 'deleted'] as const;

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN');
}

export default function AdminUsers() {
  const router = useRouter();
  const { addToast } = useToast();
  const [items, setItems] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('createdAt_desc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FetchDetail | null>(null);
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'customer' as 'admin' | 'staff' | 'customer',
    status: 'active' as 'active' | 'blocked',
    phone: '',
    avatar: '',
  });

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  useEffect(() => setMounted(true), []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      if (search) params.set('search', search);
      if (role) params.set('role', role);
      if (status) params.set('status', status);
      if (sort) params.set('sort', sort);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Fetch error');
      }
      const data: FetchResponse = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Lỗi tải người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, role, status, sort]);

  const resetForm = () => {
    setEditing(null);
    setForm({
      name: '',
      email: '',
      role: 'customer',
      status: 'active',
      phone: '',
      avatar: '',
    });
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: FetchDetail) => {
    setEditing(item);
    setForm({
      name: item.name || '',
      email: item.email || '',
      role: item.role || 'customer',
      status: (item.status as any) || 'active',
      phone: item.phone || '',
      avatar: item.avatar || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      addToast('Vui lòng nhập tên và email', 'error');
      return;
    }
    try {
      const isEdit = Boolean(editing?._id);
      const method = isEdit ? 'PATCH' : 'POST';
      const endpoint = isEdit ? `/api/admin/users/${editing?._id}` : '/api/admin/users';
      const payload: any = {
        name: form.name.trim(),
        role: form.role,
        status: form.status,
        phone: form.phone.trim(),
        avatar: form.avatar.trim(),
      };
      if (!isEdit) {
        payload.email = form.email.trim();
      }
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Lỗi lưu người dùng');
      }
      addToast(isEdit ? 'Cập nhật người dùng thành công' : 'Thêm người dùng thành công', 'success');
      closeModal();
      fetchUsers();
    } catch (err: any) {
      addToast(err?.message || 'Lỗi lưu người dùng', 'error');
    }
  };

  const handleHide = async (id: string, currentStatus?: string) => {
    const isHidden = currentStatus === 'deleted';
    const action = isHidden ? 'unhide' : 'hide';
    const confirmed = window.confirm(
      isHidden
        ? `Hiển thị lại người dùng này?`
        : `Ẩn người dùng này? (Người dùng sẽ không hiển thị cho khách hàng nhưng vẫn còn trong hệ thống)`
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Lỗi ẩn/hiển thị người dùng');
      }
      addToast(isHidden ? 'Đã hiển thị người dùng' : 'Đã ẩn người dùng', 'success');
      fetchUsers();
    } catch (err: any) {
      addToast(err?.message || 'Lỗi ẩn/hiển thị người dùng', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      `⚠️ CẢNH BÁO: Bạn có chắc muốn XÓA VĨNH VIỄN người dùng này?\n\n` +
      `Hành động này KHÔNG THỂ hoàn tác. Người dùng sẽ bị xóa hoàn toàn khỏi database.\n\n` +
      `Nếu chỉ muốn ẩn khỏi hệ thống, hãy sử dụng nút "Ẩn" thay vì "Xóa".`
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Lỗi xóa người dùng');
      }
      addToast('Đã xóa người dùng vĩnh viễn', 'success');
      fetchUsers();
    } catch (err: any) {
      addToast(err?.message || 'Lỗi xóa người dùng', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Quản lý người dùng</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
        >
          Thêm người dùng
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
            placeholder="Tìm tên / email / SĐT"
            className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white md:col-span-2"
          />
          <select
            value={role}
            onChange={(e) => {
              setPage(1);
              setRole(e.target.value);
            }}
            className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
          >
            <option value="">Tất cả vai trò</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
          >
            <option value="">Tất cả trạng thái</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
          >
            <option value="createdAt_desc">Mới nhất</option>
            <option value="createdAt_asc">Cũ nhất</option>
            <option value="name_asc">Tên A-Z</option>
            <option value="name_desc">Tên Z-A</option>
            <option value="email_asc">Email A-Z</option>
            <option value="email_desc">Email Z-A</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-200 text-gray-600">
                <th className="py-3 px-2">Tên</th>
                <th className="py-3 px-2">Email</th>
                <th className="py-3 px-2">Vai trò</th>
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
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    Không có người dùng.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id} className="border-b border-gray-100">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        {item.avatar ? (
                          <img src={item.avatar} alt={item.name} className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                            {item.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="cursor-pointer hover:underline" onClick={() => router.push(`/admin/users/${item._id}`)}>
                          <div className="font-semibold text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-500">{item.phone || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-gray-700">{item.email}</td>
                    <td className="py-3 px-2 text-gray-700 capitalize">{item.role}</td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          item.status === 'deleted'
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : item.status === 'blocked'
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}
                      >
                        {item.status === 'deleted' ? 'Đã ẩn' : item.status || 'active'}
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
                          onClick={() => handleHide(item._id, item.status)}
                          className={`min-w-[60px] px-3 py-1 rounded-md border text-sm text-center ${
                            item.status === 'deleted'
                              ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                          }`}
                        >
                          {item.status === 'deleted' ? 'Hiện' : 'Ẩn'}
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
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

      {showModal && mounted
        ? createPortal(
            // FIX: Ensure modal overlay covers entire viewport
            // IMPORTANT: Do not move modal back into admin layout
            <div className="fixed top-0 left-0 w-[100vw] h-[100vh] bg-[rgba(0,0,0,0.45)] backdrop-blur-sm flex items-center justify-center z-[999]">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto z-[1000]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {editing ? 'Sửa người dùng' : 'Thêm người dùng'}
                    </div>
                    <div className="text-sm text-gray-500">
                      User Admin Management - Scoped to Admin Panel only
                    </div>
                  </div>
                  <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-sm">
                    Đóng
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Tên</label>
                      <input
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Email</label>
                      <input
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                        required
                        disabled={Boolean(editing)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Vai trò</label>
                      <select
                        value={form.role}
                        onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as any }))}
                        className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Trạng thái</label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as any }))}
                        className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                      >
                        <option value="active">active</option>
                        <option value="blocked">blocked</option>
                      </select>
                    </div>
                  </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Số điện thoại</label>
                      <input
                        value={form.phone}
                        onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                        className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                        placeholder="Tùy chọn"
                      />
                    </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Avatar (URL)</label>
                    <input
                      value={form.avatar}
                      onChange={(e) => setForm((prev) => ({ ...prev, avatar: e.target.value }))}
                      className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeModal}
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

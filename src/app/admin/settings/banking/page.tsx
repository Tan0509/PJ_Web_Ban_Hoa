'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/components/ToastProvider';

type BankingAccount = {
  _id: string;
  label?: string;
  bankId?: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  qrImageDataUrl: string;
  note?: string;
  isDefault: boolean;
  active: boolean;
  createdAt?: string;
};

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminBankingSettings() {
  const { addToast } = useToast();
  const [items, setItems] = useState<BankingAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Payment methods visibility
  const [paymentMethods, setPaymentMethods] = useState({
    cod: true,
    banking: true,
    vnpay: true,
    momo: true,
  });
  const [savingPaymentMethods, setSavingPaymentMethods] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [editing, setEditing] = useState<BankingAccount | null>(null);
  const [form, setForm] = useState({
    label: '',
    bankId: '',
    bankName: '',
    accountNo: '',
    accountName: '',
    qrImageDataUrl: '',
    note: '',
    isDefault: false,
    active: true,
  });

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/banking-accounts');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Không tải được dữ liệu');
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err: any) {
      setError(err?.message || 'Không tải được dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const res = await fetch('/api/admin/settings/payment-methods');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Không tải được cài đặt');
      setPaymentMethods(data?.paymentMethods || { cod: true, banking: true, vnpay: true, momo: true });
    } catch (err: any) {
      // Keep default values
    }
  };

  const handleSavePaymentMethods = async () => {
    // Validate: ít nhất 1 payment method phải được enable
    const enabledCount = Object.values(paymentMethods).filter(Boolean).length;
    if (enabledCount === 0) {
      addToast('Vui lòng bật ít nhất một phương thức thanh toán', 'error');
      return;
    }

    try {
      setSavingPaymentMethods(true);
      const res = await fetch('/api/admin/settings/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethods }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Lưu thất bại');
      addToast('Đã lưu cài đặt phương thức thanh toán', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Lưu thất bại', 'error');
    } finally {
      setSavingPaymentMethods(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchItems();
    loadPaymentMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({
      label: '',
      bankId: '',
      bankName: '',
      accountNo: '',
      accountName: '',
      qrImageDataUrl: '',
      note: '',
      isDefault: false,
      active: true,
    });
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (it: BankingAccount) => {
    setEditing(it);
    setForm({
      label: it.label || '',
      bankId: it.bankId || '',
      bankName: it.bankName || '',
      accountNo: it.accountNo || '',
      accountName: it.accountName || '',
      qrImageDataUrl: it.qrImageDataUrl || '',
      note: it.note || '',
      isDefault: !!it.isDefault,
      active: it.active ?? true,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handlePickQr = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Vui lòng chọn file hình ảnh', 'error');
      return;
    }
    try {
      setUploadingQr(true);
      const base64 = await fileToDataUrl(file);
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, folder: 'banking-qr' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Tải ảnh lên thất bại');
      if (data?.url) setForm((prev) => ({ ...prev, qrImageDataUrl: data.url }));
    } catch (err: any) {
      addToast(err?.message || 'Tải ảnh lên thất bại', 'error');
    } finally {
      setUploadingQr(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        label: form.label.trim() || undefined,
        bankId: form.bankId.trim() || undefined,
        bankName: form.bankName.trim(),
        accountNo: form.accountNo.trim(),
        accountName: form.accountName.trim(),
        qrImageDataUrl: form.qrImageDataUrl,
        note: form.note.trim() || undefined,
        isDefault: !!form.isDefault,
        active: !!form.active,
      };

      const res = await fetch(editing ? `/api/admin/banking-accounts/${editing._id}` : '/api/admin/banking-accounts', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Lưu thất bại');
      addToast(editing ? 'Cập nhật thành công' : 'Tạo tài khoản thành công', 'success');
      closeForm();
      fetchItems();
    } catch (err: any) {
      addToast(err?.message || 'Lưu thất bại', 'error');
    }
  };

  const handleDelete = async (it: BankingAccount) => {
    const ok = window.confirm(`Xoá tài khoản "${it.bankName} - ${it.accountNo}"?`);
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/banking-accounts/${it._id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Xoá thất bại');
      addToast('Đã xoá', 'success');
      fetchItems();
    } catch (err: any) {
      addToast(err?.message || 'Xoá thất bại', 'error');
    }
  };

  const handleSetDefault = async (it: BankingAccount) => {
    try {
      const res = await fetch(`/api/admin/banking-accounts/${it._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Cập nhật thất bại');
      addToast('Đã đặt làm mặc định', 'success');
      fetchItems();
    } catch (err: any) {
      addToast(err?.message || 'Cập nhật thất bại', 'error');
    }
  };

  const defaultLabel = useMemo(() => {
    const d = items.find((x) => x.isDefault);
    return d ? `${d.bankName} - ${d.accountNo}` : '—';
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Cài đặt Banking</h1>
          <p className="text-sm text-gray-500">Quản lý tài khoản nhận chuyển khoản và QR mặc định</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
        >
          Thêm tài khoản
        </button>
      </div>

      {/* Payment Methods Visibility Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Hiển thị phương thức thanh toán</h2>
          <p className="text-sm text-gray-500">Bật/tắt các phương thức thanh toán hiển thị trên trang thanh toán</p>
        </div>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-md border border-gray-200 hover:bg-gray-50">
            <span className="text-sm font-medium text-gray-900">Thanh toán khi nhận hàng (COD)</span>
            <input
              type="checkbox"
              checked={paymentMethods.cod}
              onChange={(e) => setPaymentMethods((prev) => ({ ...prev, cod: e.target.checked }))}
              className="h-5 w-5 text-emerald-600 focus:ring-emerald-500"
            />
          </label>
          <label className="flex items-center justify-between p-3 rounded-md border border-gray-200 hover:bg-gray-50">
            <span className="text-sm font-medium text-gray-900">Chuyển khoản (Banking)</span>
            <input
              type="checkbox"
              checked={paymentMethods.banking}
              onChange={(e) => setPaymentMethods((prev) => ({ ...prev, banking: e.target.checked }))}
              className="h-5 w-5 text-emerald-600 focus:ring-emerald-500"
            />
          </label>
          <label className="flex items-center justify-between p-3 rounded-md border border-gray-200 hover:bg-gray-50">
            <span className="text-sm font-medium text-gray-900">VNPay</span>
            <input
              type="checkbox"
              checked={paymentMethods.vnpay}
              onChange={(e) => setPaymentMethods((prev) => ({ ...prev, vnpay: e.target.checked }))}
              className="h-5 w-5 text-emerald-600 focus:ring-emerald-500"
            />
          </label>
          <label className="flex items-center justify-between p-3 rounded-md border border-gray-200 hover:bg-gray-50">
            <span className="text-sm font-medium text-gray-900">MoMo</span>
            <input
              type="checkbox"
              checked={paymentMethods.momo}
              onChange={(e) => setPaymentMethods((prev) => ({ ...prev, momo: e.target.checked }))}
              className="h-5 w-5 text-emerald-600 focus:ring-emerald-500"
            />
          </label>
        </div>
        <div className="flex items-center justify-end pt-2">
          <button
            type="button"
            onClick={handleSavePaymentMethods}
            disabled={savingPaymentMethods}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            {savingPaymentMethods ? 'Đang lưu...' : 'Lưu cài đặt'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
        <div className="text-sm text-gray-700">
          Mặc định hiện tại: <span className="font-semibold text-gray-900">{defaultLabel}</span>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Đang tải...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-600">Chưa có tài khoản nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th className="py-3 px-2">QR</th>
                  <th className="py-3 px-2">Ngân hàng</th>
                  <th className="py-3 px-2">Số tài khoản</th>
                  <th className="py-3 px-2">Chủ tài khoản</th>
                  <th className="py-3 px-2">Mặc định</th>
                  <th className="py-3 px-2 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it._id} className="border-b border-gray-100">
                    <td className="py-3 px-2">
                      {it.qrImageDataUrl ? (
                        <img src={it.qrImageDataUrl} alt="QR" className="h-10 w-10 rounded-md border border-gray-200 object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-md border border-gray-200 bg-gray-50" />
                      )}
                    </td>
                    <td className="py-3 px-2 text-gray-800">
                      <div className="font-semibold">{it.bankName}</div>
                      <div className="text-xs text-gray-500">{it.bankId ? `Mã: ${it.bankId}` : ''}</div>
                    </td>
                    <td className="py-3 px-2 text-gray-700">{it.accountNo}</td>
                    <td className="py-3 px-2 text-gray-700">{it.accountName}</td>
                    <td className="py-3 px-2">
                      {it.isDefault ? (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Mặc định
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(it)}
                          className="text-sm font-semibold text-[#0f5c5c] hover:underline"
                        >
                          Đặt mặc định
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right space-x-2">
                      <button
                        onClick={() => openEdit(it)}
                        className="px-3 py-1 rounded-md border border-gray-200 text-sm hover:bg-gray-50"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(it)}
                        className="px-3 py-1 rounded-md border border-rose-200 text-sm text-rose-700 hover:bg-rose-50"
                      >
                        Xoá
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && mounted
        ? createPortal(
            <div className="fixed top-0 left-0 w-[100vw] h-[100vh] bg-[rgba(0,0,0,0.45)] backdrop-blur-sm flex items-center justify-center z-[999]">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-[1000]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{editing ? 'Sửa tài khoản Banking' : 'Thêm tài khoản Banking'}</div>
                    <div className="text-sm text-gray-500">Quản lý tài khoản nhận chuyển khoản</div>
                  </div>
                  <button onClick={closeForm} className="text-gray-500 hover:text-gray-700 text-sm">
                    Đóng
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Tên ngân hàng *</label>
                      <input
                        value={form.bankName}
                        onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
                        className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Mã bank (VietQR) (tuỳ chọn)</label>
                      <input
                        value={form.bankId}
                        onChange={(e) => setForm((p) => ({ ...p, bankId: e.target.value }))}
                        className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                        placeholder="VD: ACB"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Số tài khoản *</label>
                      <input
                        value={form.accountNo}
                        onChange={(e) => setForm((p) => ({ ...p, accountNo: e.target.value }))}
                        className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Chủ tài khoản *</label>
                      <input
                        value={form.accountName}
                        onChange={(e) => setForm((p) => ({ ...p, accountName: e.target.value }))}
                        className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Ảnh QR (upload) *</label>
                    <div className={`border border-dashed rounded-md p-3 ${uploadingQr ? 'border-gray-200 bg-gray-100' : 'border-gray-300 bg-gray-50'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingQr}
                          onChange={(e) => handlePickQr(e.target.files?.[0] || null)}
                          className="text-sm"
                        />
                        {form.qrImageDataUrl ? (
                          <img src={form.qrImageDataUrl} alt="QR preview" className="h-16 w-16 rounded-md border border-gray-200 object-cover" />
                        ) : (
                          <div className="h-16 w-16 rounded-md border border-gray-200 bg-white flex items-center justify-center text-xs text-gray-400">
                            {uploadingQr ? 'Đang tải lên...' : ''}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">Ảnh lưu trên Cloudinary. Chọn ảnh để tải lên.</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Ghi chú/Lưu ý (tuỳ chọn)</label>
                    <textarea
                      rows={3}
                      value={form.note}
                      onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                      className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                      placeholder="VD: Nhập đúng nội dung chuyển khoản để được xác nhận nhanh"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-gray-800">
                      <input
                        type="checkbox"
                        checked={form.isDefault}
                        onChange={(e) => setForm((p) => ({ ...p, isDefault: e.target.checked }))}
                        className="accent-emerald-600"
                      />
                      Đặt làm mặc định
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-800">
                      <input
                        type="checkbox"
                        checked={form.active}
                        onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                        className="accent-emerald-600"
                      />
                      Kích hoạt
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
    </div>
  );
}


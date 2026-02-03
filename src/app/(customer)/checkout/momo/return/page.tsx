 'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

export default function MomoReturnPage() {
  const params = useSearchParams();
  const { addToast } = useToast();
  const didToastRef = useRef(false);
  const didConfirmRef = useRef(false);

  const resultCode = params?.get('resultCode') || '';
  const message = params?.get('message') || '';
  const orderId = params?.get('orderId') || '';

  const ok = String(resultCode || '') === '0';

  const reason = useMemo(() => {
    const msg = String(message || '').toLowerCase();
    const code = String(resultCode || '');
    const isCancelled =
      code === '1006' || code === '1005' || msg.includes('hủy') || msg.includes('huy') || msg.includes('cancel');
    return isCancelled ? 'cancelled' : 'failed';
  }, [message, resultCode]);

  const ordersHref = ok
    ? `/orders?success=1&source=momo&orderId=${encodeURIComponent(String(orderId || ''))}`
    : `/orders?fail=1&source=momo&reason=${encodeURIComponent(reason)}&orderId=${encodeURIComponent(String(orderId || ''))}`;

  // Fallback confirmation: update status on our server using return parameters (success/cancel/fail)
  useEffect(() => {
    if (didConfirmRef.current) return;
    didConfirmRef.current = true;

    const body = {
      partnerCode: params?.get('partnerCode') || '',
      amount: params?.get('amount') || '',
      extraData: params?.get('extraData') || '',
      message: params?.get('message') || '',
      orderId: params?.get('orderId') || '',
      orderInfo: params?.get('orderInfo') || '',
      orderType: params?.get('orderType') || '',
      payType: params?.get('payType') || '',
      requestId: params?.get('requestId') || '',
      responseTime: params?.get('responseTime') || '',
      resultCode: params?.get('resultCode') || '',
      transId: params?.get('transId') || '',
      signature: params?.get('signature') || '',
    };

    // If return doesn't include a signature, we cannot verify -> skip silently
    if (!body.signature) return;

    fetch('/api/payments/momo/ipn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (res.ok) return;
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.message || 'Không thể xác nhận giao dịch MoMo');
      })
      .catch((e: any) => {
        // Best-effort: only warn on success return; cancel/fail is already handled by UI toast
        if (ok) {
          addToast(e?.message || 'Không thể xác nhận giao dịch MoMo. Vui lòng kiểm tra lại sau.', 'error');
        }
      });
  }, [ok, params, addToast]);

  useEffect(() => {
    if (didToastRef.current) return;
    if (ok) return;
    didToastRef.current = true;
    const base = reason === 'cancelled' ? 'Bạn đã huỷ thanh toán MoMo.' : 'Thanh toán MoMo thất bại.';
    addToast(message ? `${base} (${message})` : `${base} Vui lòng thử lại.`, 'error');
  }, [ok, addToast, message, reason]);

  return (
    <div className="container-section my-10 md:my-12">
      <div className="max-w-2xl mx-auto rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className={`text-2xl font-bold ${ok ? 'text-[#0f5c5c]' : 'text-red-600'}`}>
          {ok ? 'Thanh toán MoMo thành công' : 'Thanh toán MoMo chưa thành công'}
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {message ? message : ok ? 'Cảm ơn bạn! Hệ thống sẽ xử lý đơn hàng sớm nhất.' : 'Vui lòng thử lại hoặc chọn phương thức khác.'}
        </div>

        <div className="mt-4 text-sm text-gray-700 space-y-1">
          {orderId ? (
            <div>
              <span className="font-semibold">Mã đơn (orderId):</span> {orderId}
            </div>
          ) : null}
          {resultCode ? (
            <div>
              <span className="font-semibold">Mã kết quả:</span> {resultCode}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={ordersHref}
            className="inline-flex items-center justify-center rounded-md bg-[#0f5c5c] px-4 py-2 text-white font-semibold shadow hover:bg-[#0c4d4d] transition"
          >
            Xem đơn hàng
          </Link>
          <Link
            href="/home"
            className="inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-gray-800 font-semibold hover:bg-gray-50 transition"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}


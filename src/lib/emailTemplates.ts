import { formatVnd } from '@/lib/helpers/format';

type OrderEmailItem = {
  name: string;
  quantity: number;
  price: number;
  image?: string;
};

type OrderEmailData = {
  orderCode: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  shippingAddress: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderEmailItem[];
  note?: string;
};

function money(v: number) {
  return formatVnd(v);
}

function statusVi(orderStatus: string) {
  const map: Record<string, string> = {
    PENDING: 'Chờ xử lý',
    CONFIRMED: 'Đã xác nhận',
    SHIPPING: 'Đang giao',
    COMPLETED: 'Hoàn tất',
    CANCELLED: 'Đã huỷ',
  };
  return map[orderStatus] || orderStatus;
}

function paymentStatusVi(paymentStatus: string) {
  const map: Record<string, string> = {
    UNPAID: 'Chưa thanh toán',
    PAID: 'Đã thanh toán',
    EXPIRED: 'Hết hạn',
  };
  return map[paymentStatus] || paymentStatus;
}

function safeImgTag(src?: string) {
  if (!src) return '';
  // Avoid embedding huge base64 images in email
  if (src.startsWith('data:image/') && src.length > 80_000) return '';
  return `<img src="${src}" alt="" width="56" height="56" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;" />`;
}

export function renderUserOrderCreatedEmail(data: OrderEmailData) {
  const title =
    data.paymentMethod === 'Banking'
      ? 'Đặt hàng thành công – Vui lòng chuyển khoản'
      : data.paymentMethod === 'COD'
      ? 'Đặt hàng thành công (COD)'
      : 'Đặt hàng thành công – Đơn đang chờ thanh toán';

  const itemsHtml = data.items
    .map(
      (it) => `
      <tr>
        <td style="padding:10px 0;vertical-align:top;">
          ${safeImgTag(it.image)}
        </td>
        <td style="padding:10px 0 10px 10px;vertical-align:top;">
          <div style="font-weight:600;color:#111827;">${it.name}</div>
          <div style="color:#6b7280;font-size:12px;">SL: ${it.quantity}</div>
        </td>
        <td style="padding:10px 0;vertical-align:top;text-align:right;font-weight:600;color:#111827;">
          ${money(it.price * it.quantity)}
        </td>
      </tr>
    `
    )
    .join('');

  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.5;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <div style="font-size:20px;font-weight:800;color:#0f5c5c;">${title}</div>
      <div style="margin-top:6px;color:#6b7280;">Cảm ơn bạn đã đặt hàng tại <b>Hoa Tươi NyNa</b>.</div>

      <div style="margin-top:16px;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="vertical-align:top;padding-right:12px;">
              <div style="color:#6b7280;font-size:12px;">Mã đơn</div>
              <div style="font-size:18px;font-weight:800;word-break:break-word;">${data.orderCode}</div>
            </td>
            <td style="vertical-align:top;text-align:right;padding-left:12px;">
              <div style="color:#6b7280;font-size:12px;">Tổng tiền</div>
              <div style="font-size:18px;font-weight:800;color:#0f5c5c;white-space:nowrap;">${money(data.totalAmount)}</div>
            </td>
          </tr>
        </table>
        <div style="margin-top:12px;display:flex;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:200px;">
            <div style="color:#6b7280;font-size:12px;">Phương thức</div>
            <div style="font-weight:700;">${data.paymentMethod}</div>
          </div>
          <div style="flex:1;min-width:200px;">
            <div style="color:#6b7280;font-size:12px;">Trạng thái</div>
            <div style="font-weight:700;">${statusVi(data.orderStatus)} • ${paymentStatusVi(data.paymentStatus)}</div>
          </div>
        </div>
      </div>

      <div style="margin-top:16px;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
        <div style="font-weight:800;margin-bottom:8px;">Thông tin giao hàng</div>
        <div style="color:#111827;"><b>${data.customerName}</b> • ${data.customerPhone}</div>
        <div style="color:#374151;margin-top:4px;">${data.shippingAddress}</div>
      </div>

      <div style="margin-top:16px;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
        <div style="font-weight:800;margin-bottom:8px;">Sản phẩm</div>
        <table style="width:100%;border-collapse:collapse;">
          ${itemsHtml}
        </table>
      </div>

      <div style="margin-top:16px;color:#6b7280;font-size:12px;">
        Bạn có thể theo dõi trạng thái đơn hàng trong mục <b>Đơn hàng</b> trên website.
      </div>
    </div>
  </div>
  `;
}

export function renderAdminNewOrderEmail(data: OrderEmailData) {
  const itemsHtml = data.items
    .map(
      (it) => `
      <tr>
        <td style="padding:10px 0;vertical-align:top;">
          ${safeImgTag(it.image)}
        </td>
        <td style="padding:10px 0 10px 10px;vertical-align:top;">
          <div style="font-weight:600;color:#111827;">${it.name}</div>
          <div style="color:#6b7280;font-size:12px;">SL: ${it.quantity} • Đơn giá: ${money(it.price)}</div>
        </td>
        <td style="padding:10px 0;vertical-align:top;text-align:right;font-weight:700;color:#111827;">
          ${money(it.price * it.quantity)}
        </td>
      </tr>
    `
    )
    .join('');

  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.5;color:#111827;">
    <div style="max-width:720px;margin:0 auto;padding:24px;">
      <div style="font-size:20px;font-weight:800;color:#111827;">Đơn hàng mới</div>
      <div style="margin-top:6px;color:#6b7280;">Có đơn hàng mới trên hệ thống.</div>

      <div style="margin-top:16px;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="vertical-align:top;padding-right:12px;">
              <div style="color:#6b7280;font-size:12px;">Mã đơn</div>
              <div style="font-size:18px;font-weight:800;word-break:break-word;">${data.orderCode}</div>
            </td>
            <td style="vertical-align:top;text-align:right;padding-left:12px;">
              <div style="color:#6b7280;font-size:12px;">Tổng tiền</div>
              <div style="font-size:18px;font-weight:800;color:#0f5c5c;white-space:nowrap;">${money(data.totalAmount)}</div>
            </td>
          </tr>
        </table>
        <div style="margin-top:12px;display:flex;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:220px;">
            <div style="color:#6b7280;font-size:12px;">Khách hàng</div>
            <div style="font-weight:700;">${data.customerName} • ${data.customerPhone}</div>
            <div style="color:#6b7280;font-size:12px;">${data.customerEmail}</div>
          </div>
          <div style="flex:1;min-width:220px;">
            <div style="color:#6b7280;font-size:12px;">Thanh toán</div>
            <div style="font-weight:700;">${data.paymentMethod} • ${paymentStatusVi(data.paymentStatus)}</div>
            <div style="color:#6b7280;font-size:12px;">Trạng thái: ${statusVi(data.orderStatus)}</div>
          </div>
        </div>
      </div>

      <div style="margin-top:16px;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
        <div style="font-weight:800;margin-bottom:8px;">Địa chỉ giao hàng</div>
        <div style="color:#374151;">${data.shippingAddress}</div>
        ${data.note ? `<div style="margin-top:8px;color:#6b7280;font-size:12px;"><b>Ghi chú:</b> ${data.note}</div>` : ''}
      </div>

      <div style="margin-top:16px;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
        <div style="font-weight:800;margin-bottom:8px;">Sản phẩm</div>
        <table style="width:100%;border-collapse:collapse;">
          ${itemsHtml}
        </table>
      </div>
    </div>
  </div>
  `;
}

export function renderUserOrderStatusUpdatedEmail(opts: {
  orderCode: string;
  customerName: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
}) {
  const title = 'Cập nhật trạng thái đơn hàng';
  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.5;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <div style="font-size:20px;font-weight:800;color:#0f5c5c;">${title}</div>
      <div style="margin-top:6px;color:#6b7280;">Xin chào <b>${opts.customerName}</b>, đơn hàng của bạn đã được cập nhật.</div>

      <div style="margin-top:16px;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="vertical-align:top;padding-right:12px;">
              <div style="color:#6b7280;font-size:12px;">Mã đơn</div>
              <div style="font-size:18px;font-weight:800;word-break:break-word;">${opts.orderCode}</div>
            </td>
            <td style="vertical-align:top;text-align:right;padding-left:12px;">
              <div style="color:#6b7280;font-size:12px;">Tổng tiền</div>
              <div style="font-size:18px;font-weight:800;color:#0f5c5c;white-space:nowrap;">${money(opts.totalAmount)}</div>
            </td>
          </tr>
        </table>
        <div style="margin-top:12px;display:flex;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:200px;">
            <div style="color:#6b7280;font-size:12px;">Trạng thái</div>
            <div style="font-weight:700;">${statusVi(opts.orderStatus)}</div>
          </div>
          <div style="flex:1;min-width:200px;">
            <div style="color:#6b7280;font-size:12px;">Thanh toán</div>
            <div style="font-weight:700;">${opts.paymentMethod} • ${paymentStatusVi(opts.paymentStatus)}</div>
          </div>
        </div>
      </div>

      <div style="margin-top:16px;color:#6b7280;font-size:12px;">
        Bạn có thể vào mục <b>Đơn hàng</b> để xem chi tiết.
      </div>
    </div>
  </div>
  `;
}

export function renderUserPaymentSuccessEmail(opts: {
  orderCode: string;
  customerName: string;
  totalAmount: number;
  paymentMethod: string;
}) {
  const title = 'Thanh toán thành công';
  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.5;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <div style="font-size:20px;font-weight:800;color:#0f5c5c;">${title}</div>
      <div style="margin-top:6px;color:#6b7280;">Xin chào <b>${opts.customerName}</b>, hệ thống đã ghi nhận bạn thanh toán thành công.</div>

      <div style="margin-top:16px;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="vertical-align:top;padding-right:12px;">
              <div style="color:#6b7280;font-size:12px;">Mã đơn</div>
              <div style="font-size:18px;font-weight:800;word-break:break-word;">${opts.orderCode}</div>
            </td>
            <td style="vertical-align:top;text-align:right;padding-left:12px;">
              <div style="color:#6b7280;font-size:12px;">Số tiền</div>
              <div style="font-size:18px;font-weight:800;color:#0f5c5c;white-space:nowrap;">${money(opts.totalAmount)}</div>
            </td>
          </tr>
        </table>
        <div style="margin-top:12px;display:flex;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:200px;">
            <div style="color:#6b7280;font-size:12px;">Phương thức</div>
            <div style="font-weight:700;">${opts.paymentMethod}</div>
          </div>
          <div style="flex:1;min-width:200px;">
            <div style="color:#6b7280;font-size:12px;">Trạng thái thanh toán</div>
            <div style="font-weight:700;">${paymentStatusVi('PAID')}</div>
          </div>
        </div>
      </div>

      <div style="margin-top:16px;color:#6b7280;font-size:12px;">
        Bạn có thể vào mục <b>Đơn hàng</b> để xem chi tiết và theo dõi tiến trình xử lý.
      </div>
    </div>
  </div>
  `;
}


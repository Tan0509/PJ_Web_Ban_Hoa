import mongoose, { Schema, Document } from 'mongoose';

interface IOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface IOrder extends Document {
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  orderCode?: string;
  items: IOrderItem[];
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  paidAt?: Date;
  orderStatus: string;
  shippingAddress: string;
  deliveryTime?: string; // Thời gian giao hàng (khách chọn khi đặt)
  customerNote?: string; // Ghi chú đơn hàng
  giftMessage?: string; // Lời nhắn kèm hoa (nổi bật)
  expiresAt?: Date;
  paymentMeta?: any;
  createdAt: Date;
  updatedAt?: Date;
  history?: {
    from?: string;
    to: string;
    by?: { id?: string; role?: 'admin' | 'system'; name?: string };
    note?: string;
    createdAt?: Date;
  }[];
}

const OrderSchema = new Schema<IOrder>(
  {
    customerId: { type: String, required: true },
    customerName: { type: String },
    customerEmail: { type: String },
    customerPhone: { type: String },
    orderCode: {
      type: String,
      unique: true,
      sparse: true,
      default: function () {
        try {
          const id = (this as any)._id?.toString?.() || '';
          return 'OD-' + id.slice(-8).toUpperCase();
        } catch {
          return undefined;
        }
      },
    },
    items: [
      {
        productId: { type: String },
        name: { type: String },
        price: { type: Number },
        quantity: { type: Number },
        image: { type: String },
      },
    ],
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String },
    paymentStatus: { type: String, default: 'UNPAID' },
    paidAt: { type: Date },
    orderStatus: { type: String, default: 'PENDING' },
    shippingAddress: { type: String },
    deliveryTime: { type: String },
    customerNote: { type: String },
    giftMessage: { type: String },
    expiresAt: { type: Date },
    paymentMeta: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
    history: [
      {
        from: { type: String },
        to: { type: String, required: true },
        by: {
          id: { type: String },
          role: { type: String, enum: ['admin', 'system'], default: 'system' },
        },
        note: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { collection: 'orders', timestamps: true }
);

export default mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);


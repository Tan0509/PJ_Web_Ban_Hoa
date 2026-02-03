import mongoose, { Schema, Document } from 'mongoose';

export type ProductFilterItem = {
  id: string;
  label: string;
  enabled: boolean;
};

export type ProductFilterGroup = {
  enabled: boolean;
  items: ProductFilterItem[];
};

export type ProductFilterSetting = {
  types: ProductFilterGroup; // flower types (Bó hoa, Giỏ hoa, ...)
  colors: ProductFilterGroup; // colors (Đỏ, Hồng, ...)
};

export type PaymentMethodSetting = {
  cod: boolean; // Thanh toán khi nhận hàng (COD)
  banking: boolean; // Chuyển khoản (Banking)
  vnpay: boolean; // VNPay
  momo: boolean; // MoMo
};

export interface IAppSetting extends Document {
  key: 'singleton';
  adminOrderNotifyEmails: string[]; // list of admin emails to receive new order notifications
  productFilters?: ProductFilterSetting; // admin-configured product filter options
  favicon?: string; // website favicon: Cloudinary URL hoặc base64 data URL (legacy)
  paymentMethods?: PaymentMethodSetting; // payment method visibility settings
  createdAt: Date;
  updatedAt?: Date;
}

const AppSettingSchema = new Schema<IAppSetting>(
  {
    key: { type: String, unique: true, default: 'singleton' },
    adminOrderNotifyEmails: [{ type: String }],
    productFilters: { type: Schema.Types.Mixed },
    favicon: { type: String }, // Cloudinary URL hoặc base64 (legacy)
    paymentMethods: { type: Schema.Types.Mixed }, // payment method visibility settings
  },
  { collection: 'app_settings', timestamps: true }
);

export default mongoose.models.AppSetting || mongoose.model<IAppSetting>('AppSetting', AppSettingSchema);


import mongoose, { Schema, Document } from 'mongoose';

export interface IBankingAccount extends Document {
  label?: string;
  bankId?: string; // VietQR bank code (e.g. ACB)
  bankName: string;
  accountNo: string;
  accountName: string;
  qrImageDataUrl: string; // Cloudinary URL hoặc base64 data URL (legacy)
  note?: string;
  isDefault: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

const BankingAccountSchema = new Schema<IBankingAccount>(
  {
    label: { type: String },
    bankId: { type: String },
    bankName: { type: String, required: true },
    accountNo: { type: String, required: true },
    accountName: { type: String, required: true },
    qrImageDataUrl: { type: String, required: true }, // Cloudinary URL hoặc base64 (legacy)
    note: { type: String },
    isDefault: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { collection: 'banking_accounts', timestamps: true }
);

export default mongoose.models.BankingAccount ||
  mongoose.model<IBankingAccount>('BankingAccount', BankingAccountSchema);


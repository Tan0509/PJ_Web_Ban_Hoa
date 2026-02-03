import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  orderId: string;
  provider: string;
  amount: number;
  transactionId: string;
  status: string;
  rawResponse: object;
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  orderId: { type: String, required: true },
  provider: { type: String, required: true },
  amount: { type: Number, required: true },
  transactionId: { type: String },
  status: { type: String, default: 'PENDING' },
  rawResponse: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'payments' });

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);


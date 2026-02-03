import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  customerId: string;
  productId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>({
  customerId: { type: String, required: true },
  productId: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'reviews' });

export default mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);


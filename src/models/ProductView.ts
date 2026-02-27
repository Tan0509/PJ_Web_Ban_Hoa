import mongoose, { Document, Schema } from 'mongoose';

export interface IProductView extends Document {
  dateKey: string;
  fingerprint: string;
  productSlug: string;
  productName?: string;
  createdAt: Date;
}

const ProductViewSchema = new Schema<IProductView>(
  {
    dateKey: { type: String, required: true },
    fingerprint: { type: String, required: true },
    productSlug: { type: String, required: true },
    productName: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ProductViewSchema.index({ createdAt: -1 });
ProductViewSchema.index({ dateKey: 1, productSlug: 1 });
ProductViewSchema.index({ dateKey: 1, fingerprint: 1, productSlug: 1 }, { unique: true });

export default mongoose.models.ProductView || mongoose.model<IProductView>('ProductView', ProductViewSchema);

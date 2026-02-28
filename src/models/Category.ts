import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  icon?: string;
  parentId?: string;
  order?: number;
  menuOrder?: number;
  description?: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    icon: { type: String },
    parentId: { type: String, default: null },
    order: { type: Number, default: 0 },
    menuOrder: { type: Number, default: 0 },
    description: { type: String },
    active: { type: Boolean, default: true },
  },
  {
    collection: 'categories',
    timestamps: true,
  }
);

CategorySchema.index({ active: 1, order: 1, name: 1 }); // Home + layout: find active, sort by order/name
CategorySchema.index({ parentId: 1, order: 1, name: 1 });

export default mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

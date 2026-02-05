import mongoose, { Schema, Document } from 'mongoose';

export interface IHomeCategoryCache extends Document {
  key: string;
  categoryProducts: any;
  updatedAt: Date;
}

const HomeCategoryCacheSchema = new Schema<IHomeCategoryCache>(
  {
    key: { type: String, required: true, unique: true },
    categoryProducts: { type: Schema.Types.Mixed, default: [] },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'home_category_cache' }
);

export default mongoose.models.HomeCategoryCache ||
  mongoose.model<IHomeCategoryCache>('HomeCategoryCache', HomeCategoryCacheSchema);

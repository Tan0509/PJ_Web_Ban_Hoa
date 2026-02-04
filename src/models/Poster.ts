import mongoose, { Schema, Document } from 'mongoose';

export interface IPoster extends Document {
  imageUrl: string;
  name?: string; // Chỉ dùng trong admin để quản lý, không hiển thị cho khách
  link?: string;
  order?: number;
  active?: boolean;
}

const PosterSchema = new Schema<IPoster>({
  imageUrl: { type: String, required: true },
  name: { type: String },
  link: { type: String },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { collection: 'posters' });

PosterSchema.index({ active: 1, order: 1 }); // Home banner: find active, sort by order

export default mongoose.models.Poster || mongoose.model<IPoster>('Poster', PosterSchema);

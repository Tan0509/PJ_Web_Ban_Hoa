import mongoose, { Schema, Document } from 'mongoose';

export interface IAdmin extends Document {
  username: string;
  email: string;
  password: string;
  role: string;
  name: string;
  phone: string;
  avatar: string;
  active: boolean;
  createdAt: Date;
}

const AdminSchema = new Schema<IAdmin>({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'ADMIN' },
  name: { type: String },
  phone: { type: String },
  avatar: { type: String },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'admins' });

export default mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);


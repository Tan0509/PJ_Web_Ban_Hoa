import mongoose, { Schema, Document } from 'mongoose';

interface IAddress {
  label?: string;
  detail?: string;
  recipient?: string;
  phone?: string;
  city?: string;
  district?: string;
  ward?: string;
  isDefault?: boolean;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'staff' | 'customer';
  createdAt: Date;
  // Admin extensions
  status?: 'active' | 'blocked' | 'deleted';
  phone?: string;
  avatar?: string;
  deletedAt?: Date;
  provider?: string;
  // OAuth fields (from customers migration)
  googleId?: string;
  facebookId?: string;
  // Address array (from customers migration)
  address?: IAddress[];
}

// AUTH AUDIT FIX: enforce unique email, defaults, provider tracking
// MIGRATION: Added googleId, facebookId, address[] to support customer data migration
const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String },
    role: { type: String, enum: ['admin', 'staff', 'customer'], default: 'customer' },
    createdAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'blocked', 'deleted'], default: 'active' },
    phone: { type: String },
    avatar: { type: String },
    deletedAt: { type: Date },
    provider: { type: String, default: 'local' },
    // OAuth fields (from customers migration)
    googleId: { type: String },
    facebookId: { type: String },
    // Address array (from customers migration)
    address: [
      {
        label: { type: String },
        detail: { type: String },
        recipient: { type: String },
        phone: { type: String },
        city: { type: String },
        district: { type: String },
        ward: { type: String },
        isDefault: { type: Boolean },
      },
    ],
  },
  { collection: 'users' }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

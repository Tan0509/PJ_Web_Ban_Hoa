import mongoose, { Schema, Document } from 'mongoose';

interface IAddress {
  label?: string;
  detail?: string;
}

export interface ICustomer extends Document {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  provider: string;
  googleId?: string;
  facebookId?: string;
  avatar?: string;
  address?: IAddress[];
  role?: 'customer' | 'admin' | 'staff';
  active?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    password: { type: String },
    provider: { type: String, default: 'local' },
    googleId: { type: String },
    facebookId: { type: String },
    avatar: { type: String },
    address: [
      {
        label: { type: String },
        detail: { type: String },
      },
    ],
    role: { type: String, enum: ['admin', 'staff', 'customer'], default: 'customer' },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'customers', timestamps: true }
);

export default mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
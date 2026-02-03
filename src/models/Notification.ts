import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: string;
  userType: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId: { type: String, required: true },
  userType: { type: String, enum: ['admin', 'customer'], required: true },
  title: { type: String, required: true },
  message: { type: String },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'notifications' });

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);


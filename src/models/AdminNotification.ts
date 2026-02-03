import mongoose, { Schema, Document } from 'mongoose';

export type AdminNotificationType = 'ORDER_CREATED';

export interface IAdminNotification extends Document {
  type: AdminNotificationType;
  title: string;
  body?: string;
  orderId?: string;
  orderCode?: string;
  meta?: any;
  readBy: string[]; // userIds who have read
  createdAt: Date;
  updatedAt?: Date;
}

const AdminNotificationSchema = new Schema<IAdminNotification>(
  {
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String },
    orderId: { type: String },
    orderCode: { type: String },
    meta: { type: Schema.Types.Mixed },
    readBy: [{ type: String }],
  },
  { collection: 'admin_notifications', timestamps: true }
);

AdminNotificationSchema.index({ createdAt: -1 });

export default mongoose.models.AdminNotification ||
  mongoose.model<IAdminNotification>('AdminNotification', AdminNotificationSchema);


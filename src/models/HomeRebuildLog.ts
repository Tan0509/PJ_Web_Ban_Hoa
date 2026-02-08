import mongoose, { Schema, Document } from 'mongoose';

export interface IHomeRebuildLog extends Document {
  key: string;
  snapshot: any;
  createdAt: Date;
  updatedAt: Date;
}

const HomeRebuildLogSchema = new Schema<IHomeRebuildLog>(
  {
    key: { type: String, required: true, unique: true },
    snapshot: { type: Schema.Types.Mixed, default: {} },
  },
  { collection: 'home_rebuild_logs', timestamps: true }
);

export default mongoose.models.HomeRebuildLog ||
  mongoose.model<IHomeRebuildLog>('HomeRebuildLog', HomeRebuildLogSchema);

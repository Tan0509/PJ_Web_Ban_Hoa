import mongoose, { Document, Schema } from 'mongoose';

export interface ISiteVisit extends Document {
  dateKey: string;
  fingerprint: string;
  createdAt: Date;
}

const SiteVisitSchema = new Schema<ISiteVisit>(
  {
    dateKey: { type: String, required: true },
    fingerprint: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

SiteVisitSchema.index({ dateKey: 1 });
SiteVisitSchema.index({ dateKey: 1, fingerprint: 1 }, { unique: true });

export default mongoose.models.SiteVisit || mongoose.model<ISiteVisit>('SiteVisit', SiteVisitSchema);

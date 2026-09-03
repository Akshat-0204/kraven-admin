import { ACTIVITY_ENTITY_TYPES } from '@kraven/config';
import { Schema, model } from 'mongoose';

export interface ActivityDocument {
  entityType: (typeof ACTIVITY_ENTITY_TYPES)[number];
  entityId: Schema.Types.ObjectId;
  action: string;
  description: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema<ActivityDocument>(
  {
    entityType: { type: String, required: true, enum: ACTIVITY_ENTITY_TYPES },
    entityId: { type: Schema.Types.ObjectId, required: true },
    action: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    timestamp: { type: Date, default: Date.now, required: true }
  },
  { timestamps: true }
);

activitySchema.index({ entityType: 1, entityId: 1, timestamp: -1 });

export const ActivityModel = model<ActivityDocument>('Activity', activitySchema);

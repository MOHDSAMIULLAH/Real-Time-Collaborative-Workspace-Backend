import mongoose, { Schema, Document } from 'mongoose';
import { EventType } from '../types/enums';

export interface IActivityLog extends Document {
  projectId: string;
  userId: string;
  eventType: EventType;
  payload: any;
  timestamp: Date;
}

const ActivityLogSchema: Schema = new Schema({
  projectId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  eventType: {
    type: String,
    enum: Object.values(EventType),
    required: true,
  },
  payload: {
    type: Schema.Types.Mixed,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

ActivityLogSchema.index({ projectId: 1, timestamp: -1 });
ActivityLogSchema.index({ userId: 1, timestamp: -1 });

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);

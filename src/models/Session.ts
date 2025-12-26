import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  userId: string;
  projectId: string;
  sessionId: string;
  isActive: boolean;
  lastActivity: Date;
  createdAt: Date;
}

const SessionSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  projectId: {
    type: String,
    required: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

SessionSchema.index({ projectId: 1, isActive: 1 });
SessionSchema.index({ userId: 1, isActive: 1 });

export const Session = mongoose.model<ISession>('Session', SessionSchema);

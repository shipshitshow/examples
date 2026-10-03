import { Schema, model, type Document, type Types } from 'mongoose';

export type GenerationStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface IGeneration extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  prompt: string;
  aspectRatio: string;
  durationSeconds: number;
  status: GenerationStatus;
  /** External job ID from fal.ai / Replicate */
  externalJobId?: string;
  /** R2 object key once video is stored */
  r2Key?: string;
  /** Error message if status = failed */
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const generationSchema = new Schema<IGeneration>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    prompt: { type: String, required: true },
    aspectRatio: { type: String, required: true, default: '16:9' },
    durationSeconds: { type: Number, required: true, default: 5 },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued',
      index: true,
    },
    externalJobId: { type: String },
    r2Key: { type: String },
    errorMessage: { type: String },
  },
  { timestamps: true },
);

export const Generation = model<IGeneration>('Generation', generationSchema);

import { Schema, model, type Document, type Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  displayName?: string;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, trim: true },
    stripeCustomerId: { type: String, sparse: true, index: true },
  },
  { timestamps: true },
);

export const User = model<IUser>('User', userSchema);

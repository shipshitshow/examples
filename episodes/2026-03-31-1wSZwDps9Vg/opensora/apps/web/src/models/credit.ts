import { Schema, model, type Document, type Types } from 'mongoose';

export type CreditTransactionType = 'credit' | 'debit' | 'refund';

export interface ICreditTransaction extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  type: CreditTransactionType;
  description: string;
  /** Reference to a Generation if this is a debit for a generation */
  generationId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const creditTransactionSchema = new Schema<ICreditTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['credit', 'debit', 'refund'], required: true },
    description: { type: String, required: true },
    generationId: { type: Schema.Types.ObjectId, ref: 'Generation' },
  },
  { timestamps: true },
);

export const CreditTransaction = model<ICreditTransaction>(
  'CreditTransaction',
  creditTransactionSchema,
);

export interface ICreditBalance extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  balance: number;
  updatedAt: Date;
}

const creditBalanceSchema = new Schema<ICreditBalance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

export const CreditBalance = model<ICreditBalance>('CreditBalance', creditBalanceSchema);

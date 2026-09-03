import { EXPENSE_CATEGORIES } from '@kraven/config';
import { Schema, model } from 'mongoose';
import { fileReferenceSchema } from '../../shared/schemas/common.js';

export interface ExpenseDocument {
  name: string;
  amount: number;
  category: (typeof EXPENSE_CATEGORIES)[number];
  date: Date;
  vendor?: string;
  associatedProject?: Schema.Types.ObjectId;
  receipt?: unknown;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<ExpenseDocument>(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, enum: EXPENSE_CATEGORIES },
    date: { type: Date, required: true },
    vendor: { type: String, trim: true },
    associatedProject: { type: Schema.Types.ObjectId, ref: 'Project' },
    receipt: fileReferenceSchema,
    notes: String
  },
  { timestamps: true }
);

expenseSchema.index({ category: 1 });
expenseSchema.index({ associatedProject: 1 });
expenseSchema.index({ date: 1 });

export const ExpenseModel = model<ExpenseDocument>('Expense', expenseSchema);

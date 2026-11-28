import type { ExpenseFilterInput, ExpenseInput, UpdateExpenseInput } from '@kraven/validation';
import { expenseFilterSchema, expenseSchema, updateExpenseSchema } from '@kraven/validation';
import { logActivity } from '../../shared/activity/activity.service.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { ExpenseModel } from './expense.model.js';
import { assertObjectId, escapeRegExp } from '../../shared/utils/objectId.js';

export async function listExpenses(filters: ExpenseFilterInput) {
  const parsedFilters = expenseFilterSchema.parse(filters);
  const query: Record<string, unknown> = {};

  if (parsedFilters.category) query.category = parsedFilters.category;
  if (parsedFilters.associatedProject) query.associatedProject = parsedFilters.associatedProject;
  if (parsedFilters.dateFrom || parsedFilters.dateTo) {
    query.date = {
      ...(parsedFilters.dateFrom ? { $gte: parsedFilters.dateFrom } : {}),
      ...(parsedFilters.dateTo ? { $lte: parsedFilters.dateTo } : {})
    };
  }
  if (parsedFilters.search) {
    query.$or = [
      { name: new RegExp(escapeRegExp(parsedFilters.search), 'i') },
      { vendor: new RegExp(escapeRegExp(parsedFilters.search), 'i') }
    ];
  }

  return ExpenseModel.find(query).sort({ date: -1, createdAt: -1 });
}

export async function getExpenseById(expenseId: string) {
  assertObjectId(expenseId, 'expense');
  const expense = await ExpenseModel.findById(expenseId);

  if (!expense) {
    throw new HttpError(404, 'Expense not found');
  }

  return expense;
}

export async function createExpense(input: ExpenseInput) {
  const payload = expenseSchema.parse(input);
  const expense = await ExpenseModel.create(payload);

  await logActivity({
    entityType: 'Expense',
    entityId: String(expense._id),
    action: 'created',
    description: `Expense created - ${expense.name}`
  });

  return expense;
}

export async function updateExpense(expenseId: string, input: UpdateExpenseInput) {
  const payload = updateExpenseSchema.parse(input);
  const expense = await getExpenseById(expenseId);

  Object.assign(expense, payload);
  await expense.save();

  await logActivity({
    entityType: 'Expense',
    entityId: String(expense._id),
    action: 'updated',
    description: `Expense updated - ${expense.name}`
  });

  return expense;
}

export async function deleteExpense(expenseId: string) {
  const expense = await getExpenseById(expenseId);
  await ExpenseModel.deleteOne({ _id: expense._id });

  await logActivity({
    entityType: 'Expense',
    entityId: String(expense._id),
    action: 'deleted',
    description: `Expense deleted - ${expense.name}`
  });
}

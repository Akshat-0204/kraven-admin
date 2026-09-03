import type { Request, Response } from 'express';
import { createExpense, deleteExpense, getExpenseById, listExpenses, updateExpense } from './expense.service.js';
import { serializeExpense } from './finance.serializer.js';

export async function listExpensesController(req: Request, res: Response) {
  const expenses = await listExpenses(req.query as Record<string, string | undefined>);
  res.json({ expenses: expenses.map(serializeExpense) });
}

export async function getExpenseController(req: Request, res: Response) {
  const expense = await getExpenseById(req.params.id);
  res.json({ expense: serializeExpense(expense) });
}

export async function createExpenseController(req: Request, res: Response) {
  const expense = await createExpense(req.body);
  res.status(201).json({ expense: serializeExpense(expense) });
}

export async function updateExpenseController(req: Request, res: Response) {
  const expense = await updateExpense(req.params.id, req.body);
  res.json({ expense: serializeExpense(expense) });
}

export async function deleteExpenseController(req: Request, res: Response) {
  await deleteExpense(req.params.id);
  res.status(204).send();
}

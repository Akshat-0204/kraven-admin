import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
  createExpenseController,
  deleteExpenseController,
  getExpenseController,
  listExpensesController,
  updateExpenseController
} from './expense.controller.js';

export const expenseRoutes = Router();

expenseRoutes.get('/', asyncHandler(listExpensesController));
expenseRoutes.post('/', asyncHandler(createExpenseController));
expenseRoutes.get('/:id', asyncHandler(getExpenseController));
expenseRoutes.patch('/:id', asyncHandler(updateExpenseController));
expenseRoutes.delete('/:id', asyncHandler(deleteExpenseController));

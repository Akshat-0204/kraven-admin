import type { Request, Response } from 'express';
import { getAgencyFinancialSummary, getProjectFinancialSummary } from './finance.service.js';

export async function getFinanceOverviewController(_req: Request, res: Response) {
  const summary = await getAgencyFinancialSummary();
  res.json({ summary });
}

export async function getProjectFinancialsController(req: Request, res: Response) {
  const summary = await getProjectFinancialSummary(req.params.projectId);
  res.json({ summary });
}

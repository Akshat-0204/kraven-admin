import type { Request, Response } from 'express';
import {
  getDashboardLeads,
  getDashboardProjects,
  getDashboardRevenue,
  getDashboardSummary
} from './dashboard.service.js';

export async function getDashboardSummaryController(_req: Request, res: Response) {
  res.json(await getDashboardSummary());
}

export async function getDashboardRevenueController(_req: Request, res: Response) {
  res.json(await getDashboardRevenue());
}

export async function getDashboardProjectsController(_req: Request, res: Response) {
  res.json(await getDashboardProjects());
}

export async function getDashboardLeadsController(_req: Request, res: Response) {
  res.json(await getDashboardLeads());
}

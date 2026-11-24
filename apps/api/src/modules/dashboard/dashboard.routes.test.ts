import mongoose, { Aggregate, Query, Types } from 'mongoose';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';

vi.mock('../../middleware/authenticate.js', async () => {
  const { authenticateAsTestUser } = await import('../../test/mockAuthenticate.js');
  return { authenticate: authenticateAsTestUser };
});

const READ_OPS = new Set(['find', 'findOne', 'countDocuments', 'estimatedDocumentCount', 'distinct']);
const overdueInvoiceId = new Types.ObjectId();

/** Canned aggregation results, keyed by model and the first $group's `_id` expression. */
function aggregateResult(modelName: string, pipeline: Record<string, any>[]) {
  const groupId = JSON.stringify(pipeline[0]?.$group?._id ?? null);

  if (modelName === 'Lead' && groupId === '"$status"') {
    return [
      { _id: 'New', count: 2 },
      { _id: 'Meeting', count: 1 },
      { _id: 'Won', count: 1 }
    ];
  }
  if (modelName === 'Lead') return [{ _id: '2026-02-01', count: 3 }, { _id: '2026-01-15', count: 1 }];
  if (modelName === 'Project') {
    return [
      { _id: 'In Progress', count: 2, progressSum: 90 },
      { _id: 'Completed', count: 1, progressSum: 100 }
    ];
  }
  if (modelName === 'Invoice' && groupId === 'null') {
    return [{ invoiced: 300000, received: 120000, pending: 180000, overdue: 50000 }];
  }
  if (modelName === 'Invoice') {
    return [
      { _id: '2026-02', invoiced: 100000, received: 20000 },
      { _id: '2026-01', invoiced: 200000, received: 100000 }
    ];
  }
  if (modelName === 'Expense' && groupId === 'null') return [{ total: 25000 }];
  if (modelName === 'Expense') return [{ _id: '2026-01', expenses: 25000 }, { _id: '2025-12', expenses: 5000 }];
  return [];
}

function queryResult(modelName: string, op: string) {
  if (op === 'countDocuments') return 1;
  if (modelName === 'Invoice') {
    return [{ _id: overdueInvoiceId, invoiceNumber: 'INV-1', remainingAmount: 50000, dueDate: new Date('2026-01-01') }];
  }
  return [];
}

describe('GET /dashboard', () => {
  const queryOps: string[] = [];
  const pipelines: Record<string, unknown>[][] = [];
  let saveSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    queryOps.length = 0;
    pipelines.length = 0;
    vi.spyOn(Query.prototype, 'exec').mockImplementation(async function (this: Query<unknown, unknown>) {
      const op = (this as unknown as { op?: string }).op ?? 'unknown';
      queryOps.push(op);
      const result = queryResult(this.model.modelName, op);
      const lean = Boolean(this.mongooseOptions().lean);
      return Array.isArray(result) && !lean ? result.map((doc) => this.model.hydrate(doc)) : result;
    });
    vi.spyOn(Aggregate.prototype, 'exec').mockImplementation(async function (this: Aggregate<unknown>) {
      const pipeline = this.pipeline() as Record<string, any>[];
      pipelines.push(pipeline);
      return aggregateResult(this.model().modelName, pipeline);
    });
    saveSpy = vi.spyOn(mongoose.Model.prototype, 'save').mockImplementation(async function (this: unknown) {
      return this;
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('builds the summary without writing to the database', async () => {
    const response = await request(createApp()).get('/dashboard/summary').expect(200);

    expect(saveSpy).not.toHaveBeenCalled();
    expect(queryOps.length).toBeGreaterThan(0);
    expect(queryOps.every((op) => READ_OPS.has(op))).toBe(true);
    expect(pipelines.flat().some((stage) => '$out' in stage || '$merge' in stage)).toBe(false);

    expect(response.body.leads).toMatchObject({ total: 4, new: 2, inProgress: 1, won: 1, conversionRate: 25 });
    expect(response.body.leads.overTime).toEqual([
      { date: '2026-01-15', count: 1 },
      { date: '2026-02-01', count: 3 }
    ]);
    expect(response.body.projects).toMatchObject({
      totalActive: 2,
      inProgress: 2,
      completed: 1,
      overallProgress: 45,
      approachingDeadline: 1
    });
    expect(response.body.finance).toEqual({
      revenue: 300000,
      invoiced: 300000,
      received: 120000,
      pending: 180000,
      overdue: 50000,
      expenses: 25000,
      profit: 275000
    });
    expect(response.body.alerts[0]).toMatchObject({
      id: `invoice-${overdueInvoiceId}`,
      type: 'overdue-payment',
      title: 'Invoice INV-1 overdue'
    });
  });

  it('groups the revenue chart by month', async () => {
    const response = await request(createApp()).get('/dashboard/revenue').expect(200);

    expect(saveSpy).not.toHaveBeenCalled();
    expect(response.body.revenueOverTime).toEqual([
      { date: '2025-12', invoiced: 0, received: 0, expenses: 5000 },
      { date: '2026-01', invoiced: 200000, received: 100000, expenses: 25000 },
      { date: '2026-02', invoiced: 100000, received: 20000, expenses: 0 }
    ]);
    expect(JSON.stringify(pipelines)).toContain('"format":"%Y-%m"');
  });
});

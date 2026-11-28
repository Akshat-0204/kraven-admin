import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { clientSchema } from '@kraven/validation';
import { HttpError } from '../shared/errors/httpError.js';
import { errorHandler } from './errorHandler.js';

function appThrowing(make: () => unknown) {
  const app = express();
  app.use(express.json());
  app.post('/x', () => {
    throw make();
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('names missing required fields from zod', async () => {
    const result = clientSchema.safeParse({ email: 'nope' });
    const res = await request(appThrowing(() => (result as { error: unknown }).error)).post('/x');
    expect(res.status).toBe(400);
    expect(res.body.fieldErrors).toMatchObject({
      companyName: 'Company name is required',
      contactPerson: 'Contact person is required',
      email: 'Email: Enter a valid email address'
    });
    expect(res.body.message).toContain('Company name is required');
  });

  it('passes HttpError field errors through', async () => {
    const res = await request(appThrowing(() => new HttpError(422, 'Too much', { amount: 'Too much' }))).post('/x');
    expect(res.status).toBe(422);
    expect(res.body).toEqual({ message: 'Too much', fieldErrors: { amount: 'Too much' } });
  });

  it('maps mongoose required errors to 400', async () => {
    const Model = mongoose.model('ErrTest', new mongoose.Schema({ invoiceNumber: { type: String, required: true } }));
    const error = new Model({}).validateSync();
    const res = await request(appThrowing(() => error)).post('/x');
    expect(res.status).toBe(400);
    expect(res.body.fieldErrors).toEqual({ invoiceNumber: 'Invoice number is required' });
  });

  it('maps duplicate key to 409', async () => {
    const res = await request(appThrowing(() => Object.assign(new Error('dup'), { code: 11000, keyValue: { invoiceNumber: 'A1' } }))).post('/x');
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Invoice number already exists');
  });

  it('reports malformed JSON as 400', async () => {
    const app = express();
    app.use(express.json());
    app.post('/x', (_req, res) => {
      res.json({});
    });
    app.use(errorHandler);
    const res = await request(app).post('/x').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Request body is not valid JSON');
  });
});

import { describe, expect, it } from 'vitest';
import { LeadModel } from './lead.model.js';

describe('LeadModel', () => {
  it('requires canonical status values', async () => {
    const lead = new LeadModel({
      name: 'Contact',
      companyName: 'Acme',
      status: 'Invalid'
    });

    await expect(lead.validate()).rejects.toThrow();
  });
});

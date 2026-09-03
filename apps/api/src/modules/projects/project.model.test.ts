import { describe, expect, it } from 'vitest';
import { ProjectModel } from './project.model.js';

describe('ProjectModel', () => {
  it('keeps progress within 0 and 100', async () => {
    const project = new ProjectModel({
      projectName: 'Website',
      client: '507f1f77bcf86cd799439011',
      progressPercentage: 101
    });

    await expect(project.validate()).rejects.toThrow();
  });
});

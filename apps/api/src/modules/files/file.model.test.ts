import { describe, expect, it } from 'vitest';
import { FileMetadataModel } from './file.model.js';

describe('FileMetadata model', () => {
  it('only enforces bucketKey uniqueness on docs that have one (legacy docs lack it)', () => {
    const bucketKeyIndex = FileMetadataModel.schema.indexes().find(([fields]) => 'bucketKey' in fields);

    expect(bucketKeyIndex?.[1]).toMatchObject({
      unique: true,
      partialFilterExpression: { bucketKey: { $exists: true } }
    });
  });
});

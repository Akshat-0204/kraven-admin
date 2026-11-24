import mongoose, { Query, Types } from 'mongoose';
import { vi } from 'vitest';

/**
 * Minimal in-memory stand-in for MongoDB in route tests (no mongod in CI/dev).
 * Stubs `Query.prototype.exec` and `Model.prototype.save`; supports the query shapes the
 * portal code uses: equality (dot paths, arrays), `$in`, `$nin`, `$ne`, `$gt(e)`, `$lt(e)`,
 * `$exists`, `$or`, `$and`; updates with `$set`, `$unset`, `$inc` or plain fields; `sort`/`limit`.
 * Values are stored as given and compared by string/epoch, so ObjectIds and id strings match.
 */
type Raw = Record<string, any>;

export interface MemoryStore {
  collections: Map<string, Raw[]>;
  insert(modelName: string, doc: Raw): Raw;
  all(modelName: string): Raw[];
  get(modelName: string, id: unknown): Raw | undefined;
  restore(): void;
}

function normalize(value: unknown): unknown {
  if (value instanceof Types.ObjectId) return value.toHexString();
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object' && '_bsontype' in (value as Raw)) return String(value);
  return value;
}

function getPath(doc: Raw | undefined, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current === null || current === undefined) return undefined;
    return (current as Raw)[key];
  }, doc);
}

function setPath(doc: Raw, path: string, value: unknown) {
  const keys = path.split('.');
  let current = doc;
  for (const key of keys.slice(0, -1)) {
    if (current[key] === null || typeof current[key] !== 'object') current[key] = {};
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
}

function unsetPath(doc: Raw, path: string) {
  const keys = path.split('.');
  const parent = keys.slice(0, -1).reduce<Raw | undefined>((current, key) => current?.[key], doc);
  if (parent) delete parent[keys[keys.length - 1]];
}

function equals(actual: unknown, expected: unknown) {
  if (Array.isArray(actual)) return actual.some((item) => normalize(item) === normalize(expected));
  if (expected === null) return actual === null || actual === undefined;
  return normalize(actual) === normalize(expected);
}

function isOperatorObject(value: unknown): value is Raw {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !(value instanceof Types.ObjectId) &&
    !(value instanceof Date) &&
    !Array.isArray(value) &&
    Object.keys(value as Raw).some((key) => key.startsWith('$'))
  );
}

function compare(actual: unknown, expected: unknown) {
  const a = normalize(actual) as number | string;
  const b = normalize(expected) as number | string;
  if (a === undefined || a === null) return null;
  return a < b ? -1 : a > b ? 1 : 0;
}

function matchCondition(actual: unknown, condition: unknown): boolean {
  if (!isOperatorObject(condition)) return equals(actual, condition);

  return Object.entries(condition).every(([operator, operand]) => {
    switch (operator) {
      case '$in':
        return (operand as unknown[]).some((item) => equals(actual, item));
      case '$nin':
        return !(operand as unknown[]).some((item) => equals(actual, item));
      case '$ne':
        return !equals(actual, operand);
      case '$exists':
        return operand ? actual !== undefined : actual === undefined;
      case '$type':
        return operand === 'string' ? typeof actual === 'string' : true;
      case '$gt':
        return compare(actual, operand) === 1;
      case '$gte':
        return [0, 1].includes(compare(actual, operand) as number);
      case '$lt':
        return compare(actual, operand) === -1;
      case '$lte':
        return [0, -1].includes(compare(actual, operand) as number);
      default:
        throw new Error(`memoryStore: unsupported operator ${operator}`);
    }
  });
}

export function matches(doc: Raw, filter: Raw = {}): boolean {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === '$or') return (condition as Raw[]).some((sub) => matches(doc, sub));
    if (key === '$and') return (condition as Raw[]).every((sub) => matches(doc, sub));
    return matchCondition(getPath(doc, key), condition);
  });
}

function applyUpdate(doc: Raw, update: Raw) {
  for (const [key, value] of Object.entries(update)) {
    if (key === '$set') {
      for (const [path, fieldValue] of Object.entries(value as Raw)) setPath(doc, path, fieldValue);
    } else if (key === '$unset') {
      for (const path of Object.keys(value as Raw)) unsetPath(doc, path);
    } else if (key === '$inc') {
      for (const [path, amount] of Object.entries(value as Raw)) {
        setPath(doc, path, (Number(getPath(doc, path)) || 0) + Number(amount));
      }
    } else if (key === '$setOnInsert') {
      continue;
    } else if (key.startsWith('$')) {
      throw new Error(`memoryStore: unsupported update operator ${key}`);
    } else {
      setPath(doc, key, value);
    }
  }
  doc.updatedAt = new Date();
}

function sortDocs(docs: Raw[], sort: Raw | undefined) {
  if (!sort) return docs;
  const entries = Object.entries(sort);
  return [...docs].sort((left, right) => {
    for (const [path, direction] of entries) {
      const result = compare(getPath(left, path), getPath(right, path)) ?? -1;
      if (result !== 0) return result * (Number(direction) < 0 || direction === 'desc' ? -1 : 1);
    }
    return 0;
  });
}

export function installMemoryStore(): MemoryStore {
  const collections = new Map<string, Raw[]>();
  const collection = (name: string) => {
    if (!collections.has(name)) collections.set(name, []);
    return collections.get(name)!;
  };
  const clone = (doc: Raw) => structuredCloneWithIds(doc);

  const execSpy = vi.spyOn(Query.prototype, 'exec').mockImplementation(async function (this: Query<unknown, unknown>) {
    const query = this as unknown as {
      op: string;
      model: mongoose.Model<unknown>;
      getFilter(): Raw;
      getUpdate(): Raw | null;
      getOptions(): Raw;
      mongooseOptions(): Raw;
    };
    const docs = collection(query.model.modelName);
    const filter = query.getFilter();
    const options = query.getOptions();
    const lean = Boolean(query.mongooseOptions().lean);
    const output = (doc: Raw | undefined) => {
      if (!doc) return null;
      return lean ? clone(doc) : query.model.hydrate(clone(doc));
    };
    const matching = () => sortDocs(docs.filter((doc) => matches(doc, filter)), options.sort);

    switch (query.op) {
      case 'find': {
        let result = matching();
        if (options.skip) result = result.slice(options.skip);
        if (options.limit) result = result.slice(0, options.limit);
        return result.map(output);
      }
      case 'findOne':
        return output(matching()[0]);
      case 'countDocuments':
        return matching().length;
      case 'findOneAndUpdate': {
        const doc = matching()[0];
        if (!doc) return null;
        const before = clone(doc);
        applyUpdate(doc, query.getUpdate() ?? {});
        return output(options.new || options.returnDocument === 'after' ? doc : before);
      }
      case 'updateOne':
      case 'updateMany': {
        const targets = query.op === 'updateOne' ? matching().slice(0, 1) : matching();
        for (const doc of targets) applyUpdate(doc, query.getUpdate() ?? {});
        return { acknowledged: true, matchedCount: targets.length, modifiedCount: targets.length };
      }
      case 'deleteOne':
      case 'findOneAndDelete': {
        const doc = matching()[0];
        if (doc) docs.splice(docs.indexOf(doc), 1);
        return query.op === 'deleteOne' ? { acknowledged: true, deletedCount: doc ? 1 : 0 } : output(doc);
      }
      case 'deleteMany': {
        const targets = matching();
        for (const doc of targets) docs.splice(docs.indexOf(doc), 1);
        return { acknowledged: true, deletedCount: targets.length };
      }
      default:
        throw new Error(`memoryStore: unsupported query op ${query.op}`);
    }
  });

  const fakeSave = async function (this: any) {
    await this.validate();
    const now = new Date();
    if (this.schema.options.timestamps) {
      if (this.isNew) this.set('createdAt', this.get('createdAt') ?? now);
      this.set('updatedAt', now);
    }
    const docs = collection((this.constructor as mongoose.Model<unknown>).modelName);
    const raw = this.toObject({ depopulate: true });
    const index = docs.findIndex((doc) => normalize(doc._id) === normalize(raw._id));
    if (index >= 0) docs[index] = raw;
    else docs.push(raw);
    this.isNew = false;
    return this;
  };
  // `Model.create` calls `$save`, an alias captured at definition time, so stub both.
  const saveSpy = vi.spyOn(mongoose.Model.prototype, 'save').mockImplementation(fakeSave);
  const dollarSaveSpy = vi.spyOn(mongoose.Model.prototype as any, '$save').mockImplementation(fakeSave);

  return {
    collections,
    insert(modelName, doc) {
      const model = mongoose.model(modelName);
      const hydrated = new model(doc);
      const now = new Date();
      const raw = { createdAt: now, updatedAt: now, ...hydrated.toObject({ depopulate: true }), ...pickDates(doc) };
      collection(modelName).push(raw);
      return raw;
    },
    all: (modelName) => collection(modelName),
    get: (modelName, id) => collection(modelName).find((doc) => normalize(doc._id) === normalize(id)),
    restore() {
      execSpy.mockRestore();
      saveSpy.mockRestore();
      dollarSaveSpy.mockRestore();
    }
  };
}

function pickDates(doc: Raw) {
  const result: Raw = {};
  if (doc.createdAt) result.createdAt = doc.createdAt;
  if (doc.updatedAt) result.updatedAt = doc.updatedAt;
  return result;
}

/** Deep clone that keeps ObjectIds and Dates as their own types. */
function structuredCloneWithIds<T>(value: T): T {
  if (value instanceof Types.ObjectId) return new Types.ObjectId(value.toHexString()) as T;
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (Array.isArray(value)) return value.map((item) => structuredCloneWithIds(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, structuredCloneWithIds(item)])) as T;
  }
  return value;
}

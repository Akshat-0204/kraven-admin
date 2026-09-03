import type { Request, Response } from 'express';
import { globalSearch } from './search.service.js';

export async function globalSearchController(req: Request, res: Response) {
  const results = await globalSearch(req.query);
  res.json({ results });
}

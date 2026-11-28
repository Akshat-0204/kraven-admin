import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { ZodError, type ZodIssue } from 'zod';
import { HttpError } from '../shared/errors/httpError.js';
import { logger } from '../shared/logger/logger.js';

export type FieldErrors = Record<string, string>;

/** "companyName" / "links.0.url" -> "Company name" / "Links 1 url" */
export function humanizePath(path: (string | number)[]): string {
  if (path.length === 0) return '';
  const text = path
    .map((part) => (typeof part === 'number' ? String(part + 1) : part))
    .join(' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_.-]+/g, ' ')
    .toLowerCase()
    .trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function issueMessage(issue: ZodIssue): string {
  const field = humanizePath(issue.path);
  const missing =
    issue.message === 'Required' ||
    (issue.code === 'invalid_type' && (issue.received === 'undefined' || issue.received === 'null'));
  if (missing) return field ? `${field} is required` : 'Required';
  // Custom messages from schemas already read as sentences; generic zod defaults get the field name prefixed.
  return field ? `${field}: ${issue.message}` : issue.message;
}

function zodFieldErrors(issues: ZodIssue[]): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.join('.') || '_form';
    fields[key] ??= issueMessage(issue);
  }
  return fields;
}

function summarize(messages: string[]): string {
  const unique = [...new Set(messages)];
  if (unique.length === 0) return 'Validation failed';
  if (unique.length <= 3) return unique.join('. ');
  return `${unique.slice(0, 3).join('. ')} (+${unique.length - 3} more)`;
}

function send(res: Parameters<ErrorRequestHandler>[2], status: number, message: string, fieldErrors?: FieldErrors) {
  res.status(status).json(fieldErrors && Object.keys(fieldErrors).length ? { message, fieldErrors } : { message });
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  void _next;

  if (res.headersSent) {
    logger.error({ error, path: req.path }, 'error after response started');
    res.end();
    return;
  }

  if (error instanceof HttpError) {
    send(res, error.statusCode, error.message, error.fieldErrors);
    return;
  }

  if (error instanceof ZodError) {
    const fieldErrors = zodFieldErrors(error.issues);
    res.status(400).json({ message: summarize(Object.values(fieldErrors)), fieldErrors, issues: error.issues });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const fieldErrors: FieldErrors = {};
    for (const [path, item] of Object.entries(error.errors)) {
      const field = humanizePath(path.split('.'));
      fieldErrors[path] =
        item.kind === 'required' ? `${field} is required` : item instanceof mongoose.Error.CastError ? `${field} is invalid` : item.message;
    }
    send(res, 400, summarize(Object.values(fieldErrors)), fieldErrors);
    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    const field = humanizePath(error.path.split('.'));
    send(res, 400, `${field || 'Value'} is invalid`, { [error.path]: `${field} is invalid` });
    return;
  }

  const code = (error as { code?: number }).code;
  if (code === 11000) {
    const keyValue = (error as { keyValue?: Record<string, unknown> }).keyValue ?? {};
    const path = Object.keys(keyValue)[0];
    const field = path ? humanizePath(path.split('.')) : 'Value';
    send(res, 409, `${field} already exists`, path ? { [path]: `${field} already exists` } : undefined);
    return;
  }

  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : error.code === 'LIMIT_UNEXPECTED_FILE' ? `Unexpected file field "${error.field ?? ''}"` : error.message;
    send(res, status, message);
    return;
  }

  // body-parser errors carry `type` and `status`.
  const bodyType = (error as { type?: string }).type;
  if (bodyType === 'entity.parse.failed') {
    send(res, 400, 'Request body is not valid JSON');
    return;
  }
  if (bodyType === 'entity.too.large') {
    send(res, 413, 'Request body is too large');
    return;
  }

  const status = (error as { status?: number; statusCode?: number }).status ?? (error as { statusCode?: number }).statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    send(res, status, error instanceof Error && error.message ? error.message : 'Bad request');
    return;
  }

  logger.error({ error, method: req.method, path: req.path }, 'unhandled API error');
  send(res, 500, 'Something went wrong on the server. Please try again.');
};

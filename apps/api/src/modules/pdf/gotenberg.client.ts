import { env } from '../../config/env.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { logger } from '../../shared/logger/logger.js';

export interface HtmlToPdfOptions {
  timeoutMs?: number;
}

/** A4 with ~15mm margins; values are inches, as Gotenberg expects. */
const PAGE_FIELDS: Record<string, string> = {
  paperWidth: '8.27',
  paperHeight: '11.7',
  marginTop: '0.6',
  marginBottom: '0.6',
  marginLeft: '0.6',
  marginRight: '0.6',
  printBackground: 'true'
};

function isTimeout(error: unknown) {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

/**
 * Renders a complete HTML document to PDF with Gotenberg's Chromium route.
 * Failures map to HttpErrors: 504 on timeout, 503 when the service is unreachable, 502 on a bad response.
 */
export async function htmlToPdf(html: string, options: HtmlToPdfOptions = {}): Promise<Buffer> {
  const form = new FormData();
  form.append('files', new Blob([html], { type: 'text/html' }), 'index.html');
  for (const [name, value] of Object.entries(PAGE_FIELDS)) {
    form.append(name, value);
  }

  const url = `${env.gotenbergUrl.replace(/\/+$/, '')}/forms/chromium/convert/html`;
  const timeoutMs = options.timeoutMs ?? env.gotenbergTimeoutMs;

  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', body: form, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    if (isTimeout(error)) {
      logger.warn({ timeoutMs }, 'gotenberg request timed out');
      throw new HttpError(504, 'PDF generation timed out');
    }
    logger.error({ error }, 'gotenberg unreachable');
    throw new HttpError(503, 'PDF service unavailable');
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    logger.error({ status: response.status, detail: detail.slice(0, 500) }, 'gotenberg conversion failed');
    throw new HttpError(502, 'PDF generation failed');
  }

  try {
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    if (isTimeout(error)) throw new HttpError(504, 'PDF generation timed out');
    throw new HttpError(502, 'PDF generation failed');
  }
}

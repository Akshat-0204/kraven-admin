import { DOCUMENT_PAGE } from '@kraven/config';
import puppeteer, { type Browser, type PDFOptions } from 'puppeteer';
import { env } from '../../config/env.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { logger } from '../../shared/logger/logger.js';

export interface HtmlToPdfOptions {
  timeoutMs?: number;
  /**
   * Document layout: margins from DOCUMENT_PAGE and, when header/footer HTML is given, a per-page
   * header/footer band. `{{page.number}}` / `{{page.total}}` in the bands become page counters.
   * Without it the legacy 15mm layout is used (invoices).
   */
  document?: { headerHtml?: string; footerHtml?: string };
}

const mm = (value: number) => `${value}mm`;

/** Header/footer templates may only carry inline `data:` images; anything else is dropped (SSRF guard). */
function stripRemoteImages(html: string) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => (/\bsrc\s*=\s*["']?\s*data:/i.test(tag) ? tag : ''));
}

/**
 * Builds a Chromium header/footer template. These render in an isolated context that ignores page
 * CSS and defaults to a tiny font, so everything is inline and the font size is explicit.
 */
export function buildBandTemplate(html: string, position: 'header' | 'footer') {
  if (!html.trim()) return '<span></span>';
  const content = stripRemoteImages(html)
    .replace(/\{\{\s*page\.number\s*\}\}/g, '<span class="pageNumber"></span>')
    .replace(/\{\{\s*page\.total\s*\}\}/g, '<span class="totalPages"></span>');
  const height = position === 'header' ? DOCUMENT_PAGE.headerHeightMm : DOCUMENT_PAGE.footerHeightMm;
  const edge = position === 'header' ? 'top' : 'bottom';
  const style = [
    'width: 100%',
    'box-sizing: border-box',
    `height: ${mm(height)}`,
    `margin-${edge}: ${mm(Math.max(0, (position === 'header' ? DOCUMENT_PAGE.marginMm.top : DOCUMENT_PAGE.marginMm.bottom) - height) / 2)}`,
    `padding: 0 ${mm(DOCUMENT_PAGE.marginMm.right)} 0 ${mm(DOCUMENT_PAGE.marginMm.left)}`,
    `font-family: ${DOCUMENT_PAGE.fontFamily.replace(/"/g, "'")}`,
    'font-size: 9pt',
    'line-height: 1.3',
    'color: #444',
    '-webkit-print-color-adjust: exact',
    'print-color-adjust: exact',
    'overflow: hidden'
  ].join('; ');
  return `<div style="${style}"><style>p{margin:0}img{max-height:${mm(height)}}</style>${content}</div>`;
}

function pdfLayout(options: HtmlToPdfOptions): Partial<PDFOptions> {
  if (!options.document) {
    return { format: 'A4', margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' } };
  }
  const { headerHtml = '', footerHtml = '' } = options.document;
  const { marginMm } = DOCUMENT_PAGE;
  const hasBands = Boolean(headerHtml.trim() || footerHtml.trim());
  return {
    format: DOCUMENT_PAGE.format,
    margin: { top: mm(marginMm.top), bottom: mm(marginMm.bottom), left: mm(marginMm.left), right: mm(marginMm.right) },
    displayHeaderFooter: hasBands,
    ...(hasBands
      ? { headerTemplate: buildBandTemplate(headerHtml, 'header'), footerTemplate: buildBandTemplate(footerHtml, 'footer') }
      : {})
  };
}

let browserPromise: Promise<Browser> | null = null;

/** One shared headless Chromium per process, relaunched if it crashes or disconnects. */
function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
      .then((browser) => {
        browser.on('disconnected', () => {
          browserPromise = null;
        });
        return browser;
      })
      .catch((error: unknown) => {
        browserPromise = null;
        throw error;
      });
  }
  return browserPromise;
}

export async function closePdfBrowser() {
  const pending = browserPromise;
  browserPromise = null;
  if (pending) await (await pending).close().catch(() => undefined);
}

function isTimeout(error: unknown) {
  return error instanceof Error && error.name === 'TimeoutError';
}

/**
 * Renders a complete HTML document to an A4 PDF in headless Chromium.
 * SSRF guard: every network request is blocked; only inline `data:` resources load (header/footer
 * templates additionally have non-`data:` images stripped).
 * Failures map to HttpErrors: 504 on timeout, 503 when Chromium cannot start, 502 otherwise.
 */
export async function htmlToPdf(html: string, options: HtmlToPdfOptions = {}): Promise<Buffer> {
  const timeoutMs = options.timeoutMs ?? env.pdfTimeoutMs;

  let browser: Browser;
  try {
    browser = await getBrowser();
  } catch (error) {
    logger.error({ error }, 'chromium failed to launch');
    throw new HttpError(503, 'PDF service unavailable');
  }

  const page = await browser.newPage();
  try {
    page.setDefaultTimeout(timeoutMs);
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (url.startsWith('data:') || url === 'about:blank') void request.continue();
      else void request.abort('blockedbyclient');
    });

    await page.setContent(html, { waitUntil: 'load', timeout: timeoutMs });
    const pdf = await page.pdf({ ...pdfLayout(options), printBackground: true, timeout: timeoutMs });
    return Buffer.from(pdf);
  } catch (error) {
    if (isTimeout(error)) {
      logger.warn({ timeoutMs }, 'pdf render timed out');
      throw new HttpError(504, 'PDF generation timed out');
    }
    logger.error({ error }, 'pdf render failed');
    throw new HttpError(502, 'PDF generation failed');
  } finally {
    await page.close().catch(() => undefined);
  }
}

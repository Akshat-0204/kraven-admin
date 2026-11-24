import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from '../../config/env.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { htmlToPdf } from './gotenberg.client.js';

const fetchMock = vi.fn<typeof fetch>();

async function statusOf(promise: Promise<unknown>) {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(HttpError);
  return (error as HttpError).statusCode;
}

describe('gotenberg client', () => {
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('posts index.html to the chromium route and returns the PDF bytes', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(new Response(Buffer.from('%PDF-1.7 test'), { status: 200 }));

    const pdf = await htmlToPdf('<html><body>Hi</body></html>');

    expect(pdf.toString()).toBe('%PDF-1.7 test');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${env.gotenbergUrl}/forms/chromium/convert/html`);
    expect(init?.method).toBe('POST');
    const form = init?.body as FormData;
    const file = form.get('files') as File;
    expect(file.name).toBe('index.html');
    expect(await file.text()).toBe('<html><body>Hi</body></html>');
    expect(form.get('printBackground')).toBe('true');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('maps a non-2xx response to 502', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(new Response('chromium crashed', { status: 500 }));

    expect(await statusOf(htmlToPdf('<p>x</p>'))).toBe(502);
  });

  it('maps an unreachable service to 503', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    expect(await statusOf(htmlToPdf('<p>x</p>'))).toBe(503);
  });

  it('aborts and maps to 504 when the service does not answer in time', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        })
    );

    expect(await statusOf(htmlToPdf('<p>x</p>', { timeoutMs: 20 }))).toBe(504);
  });
});

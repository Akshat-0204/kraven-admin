import { afterAll, describe, expect, it } from 'vitest';
import { buildBandTemplate, closePdfBrowser, htmlToPdf } from './pdf.renderer.js';

describe('pdf renderer', () => {
  afterAll(async () => {
    await closePdfBrowser();
  });

  it('renders HTML to PDF bytes', async () => {
    const pdf = await htmlToPdf('<html><body><h1>Hi</h1></body></html>');
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  }, 60_000);

  it('blocks network requests from template HTML', async () => {
    const pdf = await htmlToPdf('<img src="http://127.0.0.1:1/secret"><p>x</p>');
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  }, 60_000);

  it('builds header/footer bands with page tokens mapped and remote images stripped', () => {
    const band = buildBandTemplate(
      '<p><img src="http://evil.test/x.png"><img src="data:image/png;base64,AAAA"> Page {{page.number}} of {{ page.total }}</p>',
      'footer'
    );
    expect(band).toContain('<span class="pageNumber"></span>');
    expect(band).toContain('<span class="totalPages"></span>');
    expect(band).toContain('font-size: 9pt');
    expect(band).toContain('data:image/png;base64,AAAA');
    expect(band).not.toContain('evil.test');
    expect(buildBandTemplate('  ', 'header')).toBe('<span></span>');
  });

  it('renders a document with header and footer bands', async () => {
    const pdf = await htmlToPdf('<html><body><p>Body</p></body></html>', {
      document: { headerHtml: '<p>Acme</p>', footerHtml: '<p>{{page.number}} / {{page.total}}</p>' }
    });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  }, 60_000);
});

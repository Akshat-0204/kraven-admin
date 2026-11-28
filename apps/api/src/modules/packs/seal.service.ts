import { createHash } from 'node:crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface SealInput {
  pdf: Buffer;
  documentId: string;
  title: string;
  signerName: string;
  method: 'typed' | 'drawn';
  /** PNG bytes for a drawn signature. */
  signaturePng?: Buffer;
  signedAt: Date;
  ip: string;
  userAgent: string;
}

export const sha256Hex = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');

/** Standard fonts only encode WinAnsi; replace anything else so embedding never throws. */
const winAnsi = (value: string) => value.replace(/[^\x20-\x7e\xa0-\xff]/g, '?');

/**
 * Embeds the signature on the last page and appends an audit page. Returns the sealed PDF and the
 * SHA-256 of the original, so the audit page can state which bytes were signed.
 */
export async function sealPdf(input: SealInput) {
  const originalSha256 = sha256Hex(input.pdf);
  const pdf = await PDFDocument.load(input.pdf);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const script = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const image = input.signaturePng ? await pdf.embedPng(input.signaturePng) : undefined;
  const signedLabel = `Signed by ${winAnsi(input.signerName)} on ${input.signedAt.toISOString()}`;

  const drawSignature = (page: ReturnType<typeof pdf.addPage>, x: number, y: number) => {
    if (image) {
      const scaled = image.scaleToFit(180, 60);
      page.drawImage(image, { x, y, width: scaled.width, height: scaled.height });
    } else {
      page.drawText(winAnsi(input.signerName), { x, y: y + 15, size: 24, font: script, color: rgb(0.05, 0.1, 0.4) });
    }
  };

  const last = pdf.getPages().at(-1) ?? pdf.addPage();
  drawSignature(last, 40, 50);
  last.drawText(signedLabel, { x: 40, y: 36, size: 8, font, color: rgb(0.3, 0.3, 0.3) });

  const audit = pdf.addPage();
  let y = audit.getHeight() - 60;
  audit.drawText('Signature audit record', { x: 50, y, size: 18, font: bold });
  y -= 40;
  const rows: [string, string][] = [
    ['Document', input.title],
    ['Document ID', input.documentId],
    ['Signer name', input.signerName],
    ['Signature method', input.method],
    ['Signed at (UTC)', input.signedAt.toISOString()],
    ['IP address', input.ip || 'unknown'],
    ['User agent', input.userAgent || 'unknown'],
    ['SHA-256 of original PDF', input.pdf.length ? originalSha256 : '']
  ];
  for (const [label, value] of rows) {
    audit.drawText(label, { x: 50, y, size: 9, font: bold, color: rgb(0.3, 0.3, 0.3) });
    const text = winAnsi(value);
    // Wrap long values (hash, user agent) at roughly 80 characters per line.
    for (let index = 0; index < Math.max(text.length, 1); index += 80) {
      y -= 14;
      audit.drawText(text.slice(index, index + 80), { x: 50, y, size: 10, font });
    }
    y -= 12;
  }
  drawSignature(audit, 50, y - 70);

  const sealed = Buffer.from(await pdf.save());
  return { sealed, originalSha256, sealedSha256: sha256Hex(sealed) };
}

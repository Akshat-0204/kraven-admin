import { env } from '../../config/env.js';

const esc = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function layout(heading: string, body: string, link?: { url: string; label: string }) {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;padding:28px">
<h2 style="margin:0 0 16px;font-size:20px">${esc(heading)}</h2>
${body}
${link ? `<p style="margin:24px 0"><a href="${esc(link.url)}" style="background:#111;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${esc(link.label)}</a></p>` : ''}
<p style="margin:24px 0 0;font-size:12px;color:#666">${esc(env.agency.name)}</p>
</div></body></html>`;
}

export interface RenderedEmail {
  subject: string;
  html: string;
}

/** Link only: the access code is never put in an email; the admin sends it separately. */
export function portalAccessEmail(input: { clientName: string; portalUrl: string }): RenderedEmail {
  return {
    subject: `Your ${env.agency.name} client portal`,
    html: layout(
      `Hi ${input.clientName}`,
      `<p>Your client portal is ready. You will need the access code we share with you separately.</p>`,
      { url: input.portalUrl, label: 'Open your portal' }
    )
  };
}

export function packSentEmail(input: { clientName: string; packTitle: string; portalUrl: string }): RenderedEmail {
  return {
    subject: `${input.packTitle} is ready for you`,
    html: layout(
      `Hi ${input.clientName}`,
      `<p>We have shared <strong>${esc(input.packTitle)}</strong> with you. Please review it in your portal.</p>`,
      { url: input.portalUrl, label: 'View in portal' }
    )
  };
}

export function reminderEmail(input: { clientName: string; lines: string[]; portalUrl?: string }): RenderedEmail {
  return {
    subject: `Reminder: ${input.lines.length} item${input.lines.length === 1 ? '' : 's'} waiting on you`,
    html: layout(
      `Hi ${input.clientName}`,
      `<p>A quick reminder about the following:</p><ul>${input.lines.map((line) => `<li>${esc(line)}</li>`).join('')}</ul>`,
      input.portalUrl ? { url: input.portalUrl, label: 'Open your portal' } : undefined
    )
  };
}

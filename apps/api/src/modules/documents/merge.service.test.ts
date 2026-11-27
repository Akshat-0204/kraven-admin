import { describe, expect, it } from 'vitest';
import { HttpError } from '../../shared/errors/httpError.js';
import { buildMergeContext, DOCUMENT_VARIABLES, type MergeSource } from './document.variables.js';
import { extractBody, extractTemplateVariables, mergeTemplate, prepareTemplateHtml, renderDocumentHtml, wrapPrintDocument } from './merge.service.js';
import { sanitizeTemplateHtml } from './template.sanitize.js';

const source: MergeSource = {
  client: { companyName: 'Acme & Co', contactPerson: 'Riya Shah', email: 'riya@acme.test' },
  project: {
    projectName: 'Website',
    projectValue: 150000,
    expectedCompletionDate: new Date('2026-03-15T00:00:00Z'),
    deliverables: ['Design', 'Build']
  },
  now: new Date('2026-01-10T00:00:00Z')
};

function statusOf(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    return (error as HttpError).statusCode;
  }
  throw new Error('expected an HttpError');
}

describe('merge service', () => {
  it('fills registered variables', () => {
    const html = mergeTemplate(
      '<p>{{client.company}} / {{client.contactName}} / {{project.name}} / {{project.value}} / {{project.dueDate}} / {{project.deliverables}} / {{today}} / {{agency.name}}</p>',
      source
    );

    expect(html).toBe(
      '<p>Acme &amp; Co / Riya Shah / Website / ₹1,50,000 / 15 March 2026 / Design, Build / 10 January 2026 / Kraven</p>'
    );
  });

  it('HTML-escapes variable values', () => {
    const hostile: MergeSource = {
      client: { companyName: '<script>alert(1)</script><img src=x onerror=alert(2)>', contactPerson: '"><b>x</b>' }
    };

    const html = mergeTemplate('<p>{{client.company}}</p><p title="{{client.contactName}}">t</p>', hostile);

    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('drops a javascript: URL injected through a value into an href', () => {
    const html = mergeTemplate('<a href="{{client.website}}">site</a>', {
      client: { companyName: 'A', contactPerson: 'B', website: 'javascript:alert(1)' }
    });

    expect(html).toBe('<a>site</a>');
  });

  it('renders missing project values as empty strings', () => {
    expect(mergeTemplate('<p>[{{project.name}}]</p>', { client: source.client })).toBe('<p>[]</p>');
  });

  it('rejects triple-stache, blocks, helpers, partials and unknown variables', () => {
    expect(statusOf(() => extractTemplateVariables('{{{client.company}}}'))).toBe(400);
    expect(statusOf(() => extractTemplateVariables('{{#if client.company}}x{{/if}}'))).toBe(400);
    expect(statusOf(() => extractTemplateVariables('{{lookup client "company"}}'))).toBe(400);
    expect(statusOf(() => extractTemplateVariables('{{> header}}'))).toBe(400);
    expect(statusOf(() => extractTemplateVariables('{{constructor.name}}'))).toBe(400);
    expect(statusOf(() => extractTemplateVariables('{{@root.client}}'))).toBe(400);
    expect(statusOf(() => extractTemplateVariables('{{client.compnay}}'))).toBe(400);
    expect(statusOf(() => extractTemplateVariables('<p>{{client.company</p>'))).toBe(400);
    expect(statusOf(() => extractTemplateVariables('<p>{{}}</p>'))).toBe(400);
  });

  it('tolerates rich-text tags and whitespace inside placeholders', () => {
    expect(extractTemplateVariables('<p>{{<strong>client.company</strong>}}</p>')).toEqual(['client.company']);
    expect(extractTemplateVariables('<p><strong>{{</strong>client.company}}</p>')).toEqual(['client.company']);
    expect(extractTemplateVariables('<p>{{  client.company   }}</p>')).toEqual(['client.company']);
  });

  it('reports the variables a template uses', () => {
    expect(extractTemplateVariables('<p>{{client.company}} {{today}} {{client.company}}</p>').sort()).toEqual([
      'client.company',
      'today'
    ]);
  });

  it('wraps merged HTML in a print document with an escaped title', () => {
    const html = renderDocumentHtml('<p>{{client.company}}</p>', 'Proposal <draft>', source);

    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<title>Proposal &lt;draft&gt;</title>');
    expect(html).toContain('<p>Acme &amp; Co</p>');
  });

  it('resolves every registered variable', () => {
    const context = buildMergeContext(source) as Record<string, Record<string, unknown>>;
    for (const { key } of DOCUMENT_VARIABLES) {
      const value = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], context);
      expect(typeof value, key).toBe('string');
    }
  });
});

describe('document editor merge rules', () => {
  it('merges data-variable chip spans and plain placeholders alike', () => {
    const html = mergeTemplate(
      '<p><span data-variable="client.company">{{client.company}}</span> / {{client.email}}</p>',
      source
    );
    expect(html).toBe('<p>Acme &amp; Co / riya@acme.test</p>');
    expect(extractTemplateVariables('<span data-variable="project.name">x</span>')).toEqual(['project.name']);
  });

  it('shows [Label] for missing values in label mode and blanks otherwise', () => {
    expect(mergeTemplate('<p>{{client.phone}}</p>', source, { missing: 'label' })).toBe('<p>[Client phone]</p>');
    expect(mergeTemplate('<p>{{client.phone}}</p>', source)).toBe('<p></p>');
    expect(mergeTemplate('<p>{{client.company}}</p>', { now: source.now }, { missing: 'label' })).toBe('<p>[Client company]</p>');
  });

  it('allows page tokens only in header/footer and keeps them literal', () => {
    expect(statusOf(() => extractTemplateVariables('<p>{{page.number}}</p>'))).toBe(400);
    expect(statusOf(() => mergeTemplate('<p>{{ page.total }}</p>', source))).toBe(400);
    expect(extractTemplateVariables('<p>{{page.number}}</p>', { allowPageTokens: true })).toEqual([]);
    expect(mergeTemplate('<p>{{page.number}} of {{page.total}}</p>', source, { allowPageTokens: true })).toBe(
      '<p>{{page.number}} of {{page.total}}</p>'
    );
  });

  it('wraps the body in .document-content and extracts it back', () => {
    const shell = wrapPrintDocument('<p>Body</p>', 'T');
    expect(shell).toContain('<div class="document-content">');
    expect(shell).toContain('.document-content');
    expect(extractBody(shell)).toBe('<p>Body</p>');
  });
});

describe('template sanitizer', () => {
  it('strips scripts, event handlers, iframes and javascript: URLs', () => {
    const html = sanitizeTemplateHtml(
      '<p onclick="steal()">Hi<script>alert(1)</script></p><iframe src="https://evil.test"></iframe>' +
        '<a href="javascript:alert(1)">x</a><img src="x" onerror="alert(1)"><style>body{}</style>' +
        '<form action="/x"><input name="a"></form>'
    );

    expect(html).toBe('<p>Hi</p><a>x</a><img src="x" />');
  });

  it('keeps Tiptap table markup, formatting and safe styles', () => {
    const tiptap =
      '<table style="min-width:50px"><colgroup><col style="min-width:25px" /></colgroup><tbody>' +
      '<tr><th colspan="1" rowspan="1"><p><strong>Item</strong></p></th></tr>' +
      '<tr><td colspan="2" rowspan="1"><p><em>a</em> <u>b</u> <s>c</s></p></td></tr></tbody></table>' +
      '<h2>Scope</h2><ul><li><p>One</p></li></ul><blockquote><p>q</p></blockquote><hr />';

    expect(sanitizeTemplateHtml(tiptap)).toBe(tiptap);
  });

  it('drops unsafe style values', () => {
    expect(sanitizeTemplateHtml('<p style="background-image: url(https://x.test/a.png); color: red">t</p>')).toBe(
      '<p style="color:red">t</p>'
    );
  });

  it('keeps placeholders intact through sanitizing', () => {
    expect(prepareTemplateHtml('<p>Dear {{client.contactName}},</p><script>x</script>')).toEqual({
      html: '<p>Dear {{client.contactName}},</p>',
      variables: ['client.contactName']
    });
  });
});

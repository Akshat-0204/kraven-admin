import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it } from 'vitest';
import { stripPageTokens } from './DocumentEditor';
import { headerFooterDisplayHtml } from './headerFooter';
import { VariableDisplayStore, VariableNode, chipView, chipifyPlaceholders } from './variableNode';

let editor: Editor | null = null;
afterEach(() => {
  editor?.destroy();
  editor = null;
});

function roundTrip(html: string, store = new VariableDisplayStore()) {
  editor = new Editor({ extensions: [StarterKit, VariableNode.configure({ store })], content: chipifyPlaceholders(html) });
  return editor.getHTML();
}

describe('variable chip node', () => {
  it('round-trips span[data-variable] markup', () => {
    const html = '<p>Hello <span data-variable="client.company">{{client.company}}</span>!</p>';
    expect(roundTrip(html)).toBe(html);
  });

  it('parses plain {{key}} text into chips', () => {
    const out = roundTrip('<p>Dear {{client.contactName}}, re {{ project.name }}.</p>');
    expect(out).toBe(
      '<p>Dear <span data-variable="client.contactName">{{client.contactName}}</span>, re <span data-variable="project.name">{{project.name}}</span>.</p>'
    );
    expect(editor!.state.doc.firstChild!.childCount).toBe(5);
  });

  it('keeps page tokens as text the PDF renderer recognises', () => {
    expect(roundTrip('<p>Page {{page.number}} of {{page.total}}</p>')).toContain('{{page.number}}');
    expect(stripPageTokens('<p>a {{page.number}} b {{ page.total }}</p>')).toBe('<p>a  b </p>');
    expect(stripPageTokens('<p>a <span data-variable="page.number">{{page.number}}</span> b</p>')).toBe('<p>a  b</p>');
    expect(stripPageTokens('<p><span data-variable="client.company">{{client.company}}</span></p>')).toBe(
      '<p><span data-variable="client.company">{{client.company}}</span></p>'
    );
  });

  it('shows resolved values in document mode and flags missing ones', () => {
    const store = new VariableDisplayStore();
    store.set(
      [
        ['client.company', { label: 'Company', value: 'Acme' }],
        ['client.email', { label: 'Email', value: null }]
      ],
      'document'
    );
    expect(chipView(store, 'client.company')).toEqual({ text: 'Acme', unresolved: false });
    expect(chipView(store, 'client.email')).toEqual({ text: 'Email', unresolved: true });
    store.set([['client.company', { label: 'Company' }]], 'template');
    expect(chipView(store, 'client.company')).toEqual({ text: 'Company', unresolved: false });
  });

  it('maps header page tokens to pagination counters', () => {
    const html = headerFooterDisplayHtml('<p>{{page.number}} / {{page.total}}</p>', 'footer');
    expect(html).toContain('rm-page-number');
    expect(html).toContain('kd-page-total');
  });
});

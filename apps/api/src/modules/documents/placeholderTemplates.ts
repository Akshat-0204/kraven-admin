import type { DocumentTemplateInput } from '@kraven/validation';

/**
 * Generic starter template seeded by `npm run seed:templates`. The agency's real templates
 * will be recreated in the editor later; this one only demonstrates layout and variables.
 */
export const PLACEHOLDER_TEMPLATES: DocumentTemplateInput[] = [
  {
    name: 'Project Proposal',
    type: 'Proposal',
    html: [
      '<h1>Project Proposal</h1>',
      '<p><strong>Prepared for:</strong> {{client.company}}<br>',
      '<strong>Attention:</strong> {{client.contactName}}<br>',
      '<strong>Prepared by:</strong> {{agency.name}}<br>',
      '<strong>Date:</strong> {{today}}</p>',
      '<h2>Overview</h2>',
      '<p>Dear {{client.contactName}}, thank you for the opportunity to propose <strong>{{project.name}}</strong>. ',
      'This document outlines the scope, timeline and investment.</p>',
      '<p>{{project.description}}</p>',
      '<h2>Scope and deliverables</h2>',
      '<p>{{project.deliverables}}</p>',
      '<h2>Timeline and investment</h2>',
      '<table><tbody>',
      '<tr><th><p>Item</p></th><th><p>Detail</p></th></tr>',
      '<tr><td><p>Start date</p></td><td><p>{{project.startDate}}</p></td></tr>',
      '<tr><td><p>Expected completion</p></td><td><p>{{project.dueDate}}</p></td></tr>',
      '<tr><td><p>Total investment</p></td><td><p>{{project.value}}</p></td></tr>',
      '</tbody></table>',
      '<h2>Next steps</h2>',
      '<p>Reply to {{agency.email}} or sign this proposal to get started.</p>',
      '<p>{{agency.name}}<br>{{agency.website}}</p>'
    ].join('')
  }
];

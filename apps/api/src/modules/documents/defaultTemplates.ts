import type { DocumentTemplateInput } from '@kraven/validation';

/**
 * The agency's standard documents, seeded by `npm run seed:templates`. Anything that cannot be
 * resolved from client/project data stays as a highlighted `[bracket]` for the admin to fill in
 * while the document is still a Draft.
 */

/** Highlighted free-text placeholder, e.g. `[Outcome 1]`. */
const f = (text: string) => `<span style="background-color: #fff3a3">[${text}]</span>`;

const INK = '#1a1a2e';
const MUTED = '#666666';
const RULE = '#cccccc';

const title = (text: string, subtitle?: string) =>
  `<h1 style="color: ${INK}; font-size: 24pt; border-bottom: 2px solid ${INK}; padding: 0 0 6pt 0">${text}</h1>` +
  (subtitle ? `<p style="color: ${MUTED}; font-size: 11pt">${subtitle}</p>` : '');

const article = (numeral: string, heading: string) =>
  `<h2 style="color: ${INK}; border-bottom: 1px solid ${RULE}; padding: 0 0 3pt 0; margin: 18pt 0 8pt 0; page-break-after: avoid">${numeral} &middot; ${heading}</h2>`;

const heading = (text: string) =>
  `<h2 style="color: ${INK}; border-bottom: 1px solid ${RULE}; padding: 0 0 3pt 0; margin: 18pt 0 8pt 0; page-break-after: avoid">${text}</h2>`;

const p = (html: string) => `<p>${html}</p>`;
const ul = (items: string[]) => `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
const clause = (num: string, html: string) => `<p><strong>${num}</strong>&nbsp;&nbsp;${html}</p>`;

const cellStyle = `border: 1px solid ${RULE}; padding: 5pt 7pt`;
const th = (text: string, align = 'left') =>
  `<th style="${cellStyle}; background-color: #f0f0f4; text-align: ${align}">${text}</th>`;
const td = (html: string, align = 'left') => `<td style="${cellStyle}; text-align: ${align}">${html}</td>`;
const table = (head: string[], rows: string[][], aligns: string[] = []) =>
  `<table><thead><tr>${head.map((h, i) => th(h, aligns[i])).join('')}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((c, i) => td(c, aligns[i])).join('')}</tr>`)
    .join('')}</tbody></table>`;

const LINE = '______________________________';
const noBorder = 'border: none; padding: 4pt 8pt 4pt 0';

/** Two-column signature block (agency left, client right). Each side is a list of "Label: value" lines. */
const signatures = (left: { party: string; lines: string[] }, right: { party: string; lines: string[] }) => {
  const side = (s: { party: string; lines: string[] }) =>
    `<td style="${noBorder}; width: 50%"><p><strong>${s.party}</strong></p>${s.lines
      .map((line) => `<p>${line}</p>`)
      .join('')}</td>`;
  return `<table style="page-break-inside: avoid"><tbody><tr>${side(left)}${side(right)}</tr></tbody></table>`;
};

const sigLines = (name: string, titleText: string) => [
  `Signature: ${LINE}`,
  `Name: ${name}`,
  `Title: ${titleText}`,
  `Date: ${LINE}`
];

/* ------------------------------------------------------------------ Proposal */

const proposalHtml = [
  title(
    'Project Proposal &amp; Quotation',
    'Prepared by {{agency.name}} for {{client.company}}<br>How we propose to solve this, what it will take, and what it will cost'
  ),
  p(
    `Prepared for {{client.company}} by {{agency.name}} on {{today}}, under reference ${f('PROP-00X')}. This proposal remains open for acceptance until 7 days of receiving, after which pricing and timelines may need to be revisited.`
  ),

  article('I', 'Introduction'),
  p(
    `Thank you for the opportunity to put this proposal together. Based on our conversations with {{client.company}}, we understand what you&rsquo;re trying to achieve, and we&rsquo;ve set out below how {{agency.name}} would approach the work, what you can expect to receive, what it will cost, and how long it should take. We&rsquo;ve tried to keep this proposal specific and free of filler, so that what you&rsquo;re approving is exactly what you&rsquo;ll get.`
  ),

  article('II', 'Our Understanding of Your Requirement'),
  p(
    f(
      'Summarise, in the Client&rsquo;s own language as far as possible, the problem they&rsquo;ve described: the current process, where it breaks down or wastes time, and what success looks like to them. Two to three short paragraphs, written so the Client recognises their own situation. Example: Today, your team manually re-keys order data from supplier PDFs into [system] every morning, which takes roughly [X] hours a week and is prone to transcription errors. You&rsquo;d like that process automated end to end, with exceptions routed to a human for review rather than silently failing.'
    )
  ),

  article('III', 'Proposed Solution'),
  p(`We propose to design and build ${f('name of solution / system')}, which will:`),
  ul([
    f(
      'Outcome 1, written as a result the Client cares about &mdash; e.g., Automatically extract data from incoming supplier invoices with no manual re-keying'
    ),
    f('Outcome 2 &mdash; e.g., Cross-check extracted data against your purchase orders in [ERP] in real time'),
    f('Outcome 3 &mdash; e.g., Flag mismatches to a Slack channel for same-day human review'),
    f('Outcome 4 &mdash; e.g., Maintain a searchable audit log of every transaction processed')
  ]),
  p(
    `Technically, we&rsquo;d build this using ${f('proposed stack/tools, e.g., Python, n8n, OpenAI&rsquo;s document extraction APIs, and a lightweight PostgreSQL log')}, chosen because ${f('one or two sentences of plain-language reasoning &mdash; reliability, cost, the Client&rsquo;s existing tooling, etc.')}.`
  ),

  article('IV', 'Scope of Work'),
  p(
    'This engagement covers the following phases. A detailed Statement of Work will be issued for signature once this proposal is approved, and will serve as the binding scope document.'
  ),
  table(
    ['&numero;', 'What&rsquo;s Included', 'Indicative Duration'],
    [
      ['I', 'Discovery &amp; requirements mapping', '2-3 days'],
      ['II', 'Solution architecture &amp; design sign-off', '3 days'],
      ['III', 'Build &amp; internal QA', '10-12 days'],
      ['IV', 'Client testing &amp; feedback rounds', '2-4 days'],
      ['V', 'Deployment, handover &amp; documentation', '5-7 days']
    ]
  ),

  article('V', 'Investment'),
  table(
    ['Item', 'Fee'],
    [
      ['Phase 1 &ndash; Discovery &amp; Requirements', f('$xx.xx')],
      ['Phase 2 &ndash; Build Completion', f('$xx.xx')],
      ['Phase 3 &ndash; Deployment &amp; Handover', f('$xx.xx')],
      ['<strong>Total</strong>', '<strong>{{project.value}}</strong>']
    ],
    ['left', 'right']
  ),
  p(
    'Payment milestones, invoicing, and payment terms will be set out in full in the Statement of Work. As a guide, we typically structure payments as 30% on signing, 40% at midpoint, 30% on go-live.'
  ),
  p(
    'This is a fixed quotation for the scope described in Article IV. Work requested outside that scope will be quoted separately or handled through a Change Request once we&rsquo;re underway.'
  ),

  article('VI', 'Assumptions &amp; Exclusions'),
  ul([
    'Third-party software licences, API credits, and hosting costs are billed at cost or paid for directly by the Client, unless stated otherwise above.',
    'This quotation assumes the Client can provide access, data, and feedback within the response times agreed in the Statement of Work.',
    'Ongoing maintenance, hosting, and support after go-live are not included unless listed in Article IV, and can be quoted separately on request.'
  ]),

  article('VII', 'Why {{agency.name}}'),
  p(
    f(
      'Two or three sentences of genuine, specific positioning &mdash; not generic marketing copy. Example: We specialise in exactly this kind of workflow automation for [industry/use case], and we&rsquo;ve built similar systems for [type of client] that have cut manual processing time by [result, if you have a real one to cite]. We also keep builds lean and documented, so your team isn&rsquo;t left dependent on us to make small changes later.'
    )
  ),

  article('VIII', 'Next Steps'),
  p(
    'If this proposal looks right to you, the next step is for us to issue a Statement of Work and Master Service Agreement for signature, after which we&rsquo;ll schedule a kickoff call and get started.'
  ),
  p(
    'We&rsquo;re happy to walk through any part of this proposal or adjust the scope to fit your priorities. Looking forward to working together.'
  ),
  signatures(
    { party: 'For {{agency.name}}', lines: sigLines(LINE, LINE) },
    { party: 'For {{client.company}}', lines: sigLines(LINE, LINE) }
  )
].join('');

/* ----------------------------------------------------------------------- SOW */

const sowHtml = [
  title(
    'Statement of Work',
    'Issued under the Master Service Agreement between {{agency.name}} and the Client<br>An account of one Project &mdash; what will be built, by when, and at what cost'
  ),
  p(
    `This Statement of Work (this &ldquo;SOW&rdquo;), numbered ${f('SOW-00X')}, is entered into as of {{today}} between {{agency.name}}, represented here by Sanchit Jain and Akshat Soni, and {{client.company}} (the &ldquo;Client&rdquo;), represented here by {{client.contactName}}. This SOW is governed by, and incorporated into, the Master Service Agreement between the Parties dated ${f('MSA Date')} (the &ldquo;Agreement&rdquo;). Terms not defined here carry the meaning given to them in the Agreement, and where this SOW and the Agreement disagree, this SOW governs, but only for the Project described below, and only where the two cannot be read together.`
  ),
  p('The Project is expected to begin on {{project.startDate}} and to conclude by {{project.dueDate}}, subject to the timeline set out in Article IV below.'),

  article('I', 'Project Overview'),
  p(
    f(
      'Two to four sentences in plain language describing what is being built, the business problem it solves, and why the Client is commissioning it. Example: {{agency.name}} will design, build, and deploy an automated invoice-reconciliation workflow that pulls vendor invoices from the Client&rsquo;s inbox, matches them against purchase orders in [ERP system], and flags exceptions for human review.'
    )
  ),

  article('II', 'Scope of Work'),
  p('{{agency.name}} will perform the following, in the order and across the phases set out in Article IV:'),
  ul([
    f('Deliverable or workstream 1 &mdash; e.g., Discovery and technical requirements document'),
    f('Deliverable or workstream 2 &mdash; e.g., Solution architecture and integration design'),
    f('Deliverable or workstream 3 &mdash; e.g., Build of automation workflow in [n8n / Zapier / Make / custom code]'),
    f('Deliverable or workstream 4 &mdash; e.g., Quality assurance testing across [list scenarios]'),
    f('Deliverable or workstream 5 &mdash; e.g., Deployment to production environment and handover documentation')
  ]),
  `<h3 style="color: ${INK}">What this Project does not include</h3>`,
  p(
    'For clarity, and unless added later through a signed Change Request under Article IX of the Agreement, this Project does not include:'
  ),
  ul([
    f('e.g., Ongoing maintenance or support after the warranty period in Article VIII below'),
    f('e.g., Integration with systems not named in Article III'),
    f('e.g., Data migration or cleansing of historical records')
  ]),

  article('III', 'Assumptions and Dependencies'),
  p(
    'This SOW, including the timeline and fees that follow, assumes the following. Should any assumption prove incorrect, the Parties will address its impact through a Change Request.'
  ),
  ul([
    `The Client will provide timely access to ${f('systems / APIs / credentials / stakeholders')} as reasonably requested by {{agency.name}}.`,
    `The Client will designate one point of contact authorised to review and approve deliverables within ${f('3')} business days of submission.`,
    'Third-party platforms, APIs, or licences required for this Project (e.g., Cloud Costs, Payment Gateways, LLM Tokens) are procured and paid for by the Client unless otherwise agreed.',
    'Any data shared with {{agency.name}} for development or testing purposes is anonymised, or the Client has the right to share it in its current form.'
  ]),

  article('IV', 'Timeline and Milestones'),
  p(
    'The work will unfold across the milestones set out below. Dates are targets, calculated from the assumptions in Article III and timely Client feedback; a delay caused by the Client in providing access, approvals, or materials will shift the affected milestone by an equivalent number of days.'
  ),
  table(
    ['&numero;', 'Milestone', 'Target Date', 'Payment Trigger'],
    [
      ['I', 'Discovery &amp; sign-off on requirements', f('Date'), '30% deposit'],
      ['II', 'Architecture &amp; design approved', f('Date'), '&ndash;'],
      ['III', 'Build complete, internal QA passed', f('Date'), '30% deposit'],
      ['IV', 'Client acceptance testing', f('Date'), '&ndash;'],
      ['V', 'Go-live &amp; handover', f('Date'), '40% on go-live']
    ]
  ),

  article('V', 'Fees and Payment Schedule'),
  p(
    'The total fee for this Project is {{project.value}}, payable against the milestones set out in Article IV, in accordance with the invoicing and payment terms of Article IV of the Agreement.'
  ),

  article('VI', 'Acceptance Criteria'),
  p(
    `A deliverable will be deemed accepted if it performs in accordance with the specifications set out in Article II above, and if the Client does not raise a written, specific, and reproducible objection within ${f('5')} business days of delivery. If the Client raises a valid objection within that window, {{agency.name}} will correct the issue and redeliver, at which point the same review period applies to the corrected deliverable.`
  ),

  article('VII', 'Roles and Communication'),
  p(
    `The Parties will hold a bi-weekly status check-in over ${f('call / meet / email')} and will use ${f('project management tool, e.g., Notion')} as the single source of truth for task status and open issues.`
  ),

  article('VIII', 'Warranty and Post-Launch Support'),
  p(
    `{{agency.name}} warrants that the Deliverables will perform substantially as specified for ${f('7')} days following go-live (the &ldquo;Warranty Period&rdquo;). During the Warranty Period, {{agency.name}} will fix, at no additional cost, any defect that causes the Deliverables to materially deviate from the agreed specification. This warranty does not cover issues caused by Client-side changes, third-party platform changes outside {{agency.name}}&rsquo;s control, or use of the Deliverables in a manner inconsistent with their intended purpose. Support beyond the Warranty Period, if desired, will be agreed and charged separately.`
  ),

  article('IX', 'Term of this SOW'),
  p(
    'This SOW takes effect on the date of last signature below and continues until the Deliverables are accepted under Article VI and all payments due under Article V are received, unless terminated earlier under Article III of the Agreement.'
  ),

  p(
    'By signing below, each Party confirms it has the authority to bind the organisation it represents, and agrees that this SOW is governed by the Agreement referenced above.'
  ),
  signatures(
    { party: 'For {{agency.name}}', lines: sigLines('Akshat Soni', 'CTO') },
    { party: 'For {{client.company}}', lines: sigLines(LINE, LINE) }
  )
].join('');

/* ----------------------------------------------------------------------- MSA */

const defs = (items: [string, string, string][]) =>
  items.map(([num, term, text]) => clause(num, `&ldquo;${term}&rdquo; ${text}`)).join('');

const msaHtml = [
  title('Master Service Agreement'),
  p(
    'This Master Service Agreement (this &ldquo;Agreement&rdquo;) is entered into as of {{today}} (the &ldquo;Effective Date&rdquo;), by and between {{agency.name}}, and {{client.company}}, with its principal place of business at {{client.address}} (the &ldquo;Client&rdquo;). {{agency.name}} and the Client are each referred to individually as a &ldquo;Party&rdquo; and together as the &ldquo;Parties.&rdquo;'
  ),
  p(
    'This Agreement sets out the general terms that will govern every project {{agency.name}} undertakes for the Client. The specific work, deliverables, fees, and timelines for each individual project will be described in a separate Statement of Work that both Parties sign (each, an &ldquo;SOW&rdquo;). Where anything in an SOW conflicts with this Agreement, the SOW will control for that project only, and only to the extent of the conflict.'
  ),

  article('I', 'Definitions'),
  defs([
    [
      '1.1',
      'Background IP',
      'means any tools, frameworks, libraries, code, methodologies, templates, or know-how that either Party owned or had rights to before the Effective Date, or that either Party develops independently of this Agreement and without reliance on the other Party&rsquo;s Confidential Information.'
    ],
    [
      '1.2',
      'Deliverables',
      'means the software, code, scripts, automations, designs, documentation, and other work product that {{agency.name}} creates specifically for the Client under an SOW.'
    ],
    ['1.3', 'Project', 'means a discrete body of work described in an SOW.'],
    [
      '1.4',
      'Services',
      'means the software development, automation, consulting, design, and related services {{agency.name}} provides to the Client under this Agreement and any SOW.'
    ],
    ['1.5', 'SOW', 'means a Statement of Work signed by both Parties that incorporates this Agreement by reference.']
  ]),

  article('II', 'Engagement and Scope of Services'),
  clause(
    '2.1',
    '{{agency.name}} will perform the Services described in each SOW in a professional and workmanlike manner, consistent with generally accepted industry standards for software and automation development.'
  ),
  clause(
    '2.2',
    'No work will begin, and no obligation will arise, until both Parties have signed an SOW covering that work. Verbal requests, casual chat messages, and informal &ldquo;can you also just add&rdquo; asks are not Project authorizations under this Agreement unless and until they are captured in a signed SOW or a Change Request under Article IX.'
  ),
  clause(
    '2.3',
    '{{agency.name}} may, at its discretion and with prior notice to the Client, use subcontractors or independent contractors to perform parts of the Services, provided {{agency.name}} remains responsible for the quality and timely delivery of the Services as if {{agency.name}} had performed them directly.'
  ),

  article('III', 'Term and Termination'),
  clause(
    '3.1',
    'This Agreement begins on the Effective Date and continues until terminated by either Party as set out below. It will govern every SOW signed while it remains in effect.'
  ),
  clause(
    '3.2',
    `Either Party may terminate this Agreement for convenience by giving the other Party at least ${f('14')} days&rsquo; written notice, provided that any SOW already in progress will continue to be governed by this Agreement through to its completion or earlier termination, unless both Parties agree otherwise in writing.`
  ),
  clause(
    '3.3',
    `Either Party may terminate this Agreement or any individual SOW immediately on written notice if the other Party materially breaches this Agreement or that SOW and fails to cure the breach within ${f('7')} days of receiving written notice describing the breach in reasonable detail.`
  ),
  clause(
    '3.4',
    'On termination of an SOW, the Client will pay {{agency.name}} for all Services performed and all reasonable, non-cancellable expenses incurred up to the effective date of termination, calculated on a pro-rata basis where fees are fixed. Articles VI, VII, VIII, X, XI, and XIII will survive termination of this Agreement, along with any other provision that by its nature is intended to survive.'
  ),

  article('IV', 'Fees, Invoicing, and Payment Terms'),
  clause(
    '4.1',
    'The Client will pay the fees set out in each SOW. Unless an SOW states otherwise, fees are quoted inclusive of applicable taxes, duties, and government levies, which are the Client&rsquo;s responsibility.'
  ),
  clause(
    '4.2',
    `{{agency.name}} will invoice the Client in accordance with the milestones or billing schedule described in the relevant SOW. Unless otherwise agreed in writing, invoices are due within ${f('3')} days of the invoice date.`
  ),
  clause(
    '4.3',
    `If an invoice remains unpaid for more than ${f('3')} days past its due date, {{agency.name}} may suspend work on the affected Project, and any related Project, until payment is received, without that suspension being treated as a breach by {{agency.name}}.`
  ),
  clause(
    '4.4',
    `The Client must raise any good-faith dispute over an invoice in writing within ${f('5')} days of receiving it, along with reasonable supporting detail. Amounts not disputed within that window are deemed accepted. The Parties will work in good faith to resolve any disputed amount promptly, and the Client will pay all undisputed portions of the invoice in the meantime.`
  ),

  article('V', 'Client Responsibilities'),
  clause(
    '5.1',
    'The Client will provide timely access to the people, systems, credentials, content, and decisions {{agency.name}} reasonably needs to deliver the Services, as described in the applicable SOW.'
  ),
  clause(
    '5.2',
    'The Client is responsible for the accuracy and legality of any data, content, or materials it provides to {{agency.name}}, and for obtaining any third-party licences or consents needed for {{agency.name}} to use them as part of the Services.'
  ),
  clause(
    '5.3',
    'Where delays in the Client&rsquo;s feedback, approvals, or access cause {{agency.name}} to miss a deadline set out in an SOW, that deadline will be extended by a reasonable period, and {{agency.name}} will not be in breach on account of that delay.'
  ),

  article('VI', 'Intellectual Property'),
  clause(
    '6.1',
    'Subject to full payment of all fees due for the relevant Project, {{agency.name}} assigns to the Client all right, title, and interest in the Deliverables created specifically for that Project, excluding any Background IP embedded within them.'
  ),
  clause(
    '6.2',
    '{{agency.name}} retains ownership of all Background IP. To the extent any Background IP is incorporated into a Deliverable, {{agency.name}} grants the Client a perpetual, worldwide, royalty-free, non-exclusive licence to use, copy, and modify that Background IP solely as part of, and to the extent necessary to use, the Deliverable.'
  ),
  clause(
    '6.3',
    '{{agency.name}} may, unless the relevant SOW says otherwise, reuse general know-how, techniques, and non-confidential learnings gained while performing the Services for other clients, provided this does not involve disclosing the Client&rsquo;s Confidential Information or reproducing Deliverables built specifically for the Client.'
  ),
  clause(
    '6.4',
    '{{agency.name}} may identify the Client as a customer and use the Client&rsquo;s name and logo in {{agency.name}}&rsquo;s general marketing materials, case studies, and website, unless the Client objects in writing or the relevant SOW restricts this.'
  ),

  article('VII', 'Confidentiality'),
  clause(
    '7.1',
    '&ldquo;Confidential Information&rdquo; means any non-public information disclosed by one Party to the other in connection with this Agreement, whether technical, commercial, or operational, and whether disclosed orally, in writing, or by access to systems, that a reasonable person would understand to be confidential given its nature or the circumstances of disclosure.'
  ),
  clause(
    '7.2',
    'Each Party will use the other Party&rsquo;s Confidential Information only to perform its obligations under this Agreement, will protect it with at least the same care it uses to protect its own confidential information of similar importance, and will not disclose it to anyone other than employees, contractors, and advisors who need to know it and are bound by confidentiality obligations at least as protective as those in this Article.'
  ),
  clause(
    '7.3',
    'Confidential Information does not include information that: (a) is or becomes publicly available through no fault of the receiving Party; (b) was already known to the receiving Party free of any confidentiality obligation before disclosure; (c) is independently developed without reference to the disclosing Party&rsquo;s Confidential Information; or (d) is rightfully received from a third party without restriction.'
  ),
  clause(
    '7.4',
    'A Party may disclose Confidential Information where required by law, regulation, or court order, provided it gives the other Party prompt notice where legally permitted and reasonable assistance to seek protective treatment.'
  ),
  clause(
    '7.5',
    `This Article VII will survive termination of this Agreement for ${f('1')} year, except for trade secrets, which remain protected for as long as they qualify as trade secrets under applicable law.`
  ),

  article('VIII', 'Warranties and Disclaimers'),
  clause(
    '8.1',
    '{{agency.name}} warrants that it will perform the Services using reasonably skilled personnel and in material conformance with the specifications set out in the applicable SOW.'
  ),
  clause(
    '8.2',
    `If the Client notifies {{agency.name}} of a material non-conformance with Clause 8.1 within ${f('10')} days of delivery, {{agency.name}} will, as its sole obligation and the Client&rsquo;s exclusive remedy, re-perform the non-conforming part of the Services at no extra charge.`
  ),
  clause(
    '8.3',
    'Except for the express warranty in Clause 8.1, the Services and Deliverables are provided on an &ldquo;as is&rdquo; basis. {{agency.name}} disclaims all other warranties, whether express, implied, or statutory, including any implied warranties of merchantability, fitness for a particular purpose, and non-infringement, to the fullest extent permitted by law.'
  ),
  clause(
    '8.4',
    'Each Party warrants that it has the full right and authority to enter into this Agreement and to perform its obligations under it.'
  ),

  article('IX', 'Change Management'),
  clause(
    '9.1',
    'Either Party may request a change to the scope, timeline, or fees of an active Project by submitting a written or verbal Change Request describing the proposed change.'
  ),
  clause(
    '9.2',
    'No change will take effect, and {{agency.name}} will not be obliged to perform any work outside the original SOW, until both Parties have signed the Change Request. Once signed, the Change Request becomes part of, and amends, the relevant SOW.'
  ),

  article('X', 'Limitation of Liability'),
  clause(
    '10.1',
    'Neither Party will be liable to the other for any indirect, incidental, special, consequential, or punitive damages, or for any loss of profits, revenue, data, or business opportunity, arising out of or relating to this Agreement, even if advised of the possibility of such damages.'
  ),
  clause(
    '10.2',
    `Except for breaches of Article VII (Confidentiality), infringement of the other Party&rsquo;s intellectual property rights, and amounts owed for Services actually rendered, each Party&rsquo;s total aggregate liability arising out of or relating to this Agreement will not exceed the total fees paid or payable by the Client under the SOW giving rise to the claim in the ${f('6')} months preceding the event giving rise to liability.`
  ),
  clause(
    '10.3',
    'Nothing in this Agreement limits either Party&rsquo;s liability for fraud, wilful misconduct, or any other liability that cannot lawfully be limited or excluded.'
  ),

  article('XI', 'Indemnification'),
  clause(
    '11.1',
    '{{agency.name}} will defend the Client against any third-party claim alleging that a Deliverable, as delivered by {{agency.name}} and used in accordance with this Agreement, infringes that third party&rsquo;s intellectual property rights, and will indemnify the Client for damages finally awarded against it as a result, provided the Client promptly notifies {{agency.name}} of the claim, gives {{agency.name}} sole control of its defence and settlement, and reasonably cooperates with {{agency.name}}. This obligation does not apply to claims arising from Client-supplied materials, Client modifications, or use of a Deliverable in combination with products {{agency.name}} did not provide.'
  ),
  clause(
    '11.2',
    'The Client will indemnify {{agency.name}} against any third-party claim arising from materials, data, or instructions the Client provided, or from the Client&rsquo;s breach of Clause 5.2, to the extent such claim arises from those materials, data, instructions, or breach.'
  ),

  article('XII', 'Independent Contractor Relationship'),
  clause(
    '12.1',
    '{{agency.name}} performs the Services as an independent contractor. Nothing in this Agreement creates a partnership, joint venture, agency, or employment relationship between the Parties. Neither Party has authority to bind the other or to make commitments on the other&rsquo;s behalf.'
  ),
  clause(
    '12.2',
    '{{agency.name}} is solely responsible for the wages, benefits, and statutory contributions of its own personnel and subcontractors engaged in performing the Services.'
  ),

  article('XIII', 'Force Majeure'),
  clause(
    '14.1',
    `Neither Party will be liable for any delay or failure to perform caused by events beyond its reasonable control, including natural disasters, war, civil unrest, government action, internet or utility outages, or widespread illness, provided the affected Party gives prompt notice and uses reasonable efforts to resume performance. If such an event continues for more than ${f('30')} days, either Party may terminate the affected SOW on written notice.`
  ),

  article('XIV', 'Dispute Resolution and Governing Law'),
  clause('15.1', 'This Agreement is governed by the laws of India, without regard to its conflict-of-law principles.'),
  clause(
    '15.2',
    `The Parties will first attempt to resolve any dispute through good-faith negotiation between senior representatives. If the dispute is not resolved within ${f('30')} days, either Party may pursue any remedy available under this Agreement, subject to Clause 15.3.`
  ),
  clause(
    '15.3',
    'Any dispute that cannot be resolved through negotiation will be referred to and finally resolved by arbitration in the Court of Delhi under the rules of Laws of India and Indian IT Act (2000), conducted in the English language by a sole arbitrator. The arbitral award will be final and binding, and judgment on it may be entered in any court of competent jurisdiction. Either Party may seek interim injunctive relief from a competent court to protect its Confidential Information or intellectual property pending the outcome of arbitration.'
  ),

  article('XVI', 'General Provisions'),
  clause(
    '16.1',
    '<em>Entire Agreement.</em> This Agreement, together with all signed SOWs and Change Requests, constitutes the entire agreement between the Parties regarding its subject matter and supersedes all prior discussions, proposals, and understandings, written or oral.'
  ),
  clause('16.2', '<em>Amendment.</em> This Agreement may only be amended by a document signed by both Parties.'),
  clause(
    '16.3',
    '<em>Assignment.</em> Neither Party may assign this Agreement without the other Party&rsquo;s prior written consent, except that either Party may assign it without consent in connection with a merger, acquisition, or sale of substantially all its assets.'
  ),
  clause(
    '16.4',
    '<em>Notices.</em> Notices under this Agreement must be in writing and delivered by email with confirmation of receipt, to the addresses set out in the relevant SOW or as otherwise notified in writing.'
  ),
  clause(
    '16.5',
    '<em>Severability.</em> If any provision of this Agreement is found unenforceable, the remaining provisions will continue in full force, and the unenforceable provision will be replaced with one that most closely achieves its original intent.'
  ),

  p('In witness whereof, the Parties have executed this Agreement as of the Effective Date.'),
  signatures(
    { party: 'For {{agency.name}}', lines: sigLines('Sanchit Jain', 'Co-Founder') },
    { party: 'For {{client.company}}', lines: sigLines(LINE, LINE) }
  )
].join('');

/* ------------------------------------------------------------------ Handover */

const kv = (label: string, value: string) => `<strong>${label}:</strong> ${value}`;
const code = (lines: string[]) =>
  `<pre style="background-color: #f4f4f6; border: 1px solid ${RULE}; padding: 8pt; font-size: 9pt">${lines.join('\n')}</pre>`;

const handoverHtml = [
  title('Website Handover Document'),
  p(
    [
      kv('Prepared by', '{{agency.name}}'),
      kv('Prepared for', '{{client.company}}'),
      kv('Project', `{{project.name}} (${f('SOW Number')})`),
      kv('Project URL', f('Project Staging / Beta URL')),
      kv('Handover Date', '{{today}}')
    ].join('<br>')
  ),

  heading('1. Delivered Scope'),
  p('The completed website includes all features and pages agreed upon in the project scope, including:'),
  ul([
    `${f('Number of Pages')} pages converted from the provided Figma designs`,
    'Responsive desktop, tablet, and mobile layouts',
    'Pixel-perfect implementation aligned to the design file',
    'Cross-device and cross-browser QA (tested with Polypane)',
    'Production deployment and optimization'
  ]),
  p(
    'Any features not listed in the agreed scope are considered outside the delivered project. This excludes any Complex Pages not provided in the original design file.'
  ),

  heading('2. Technology Stack'),
  table(
    ['Technology', 'Purpose'],
    [
      ['Next.js', 'Frontend framework'],
      ['Tailwind CSS', 'Styling'],
      ['Figma', 'Design source'],
      ['Polypane', 'Cross-device / cross-browser QA']
    ]
  ),

  heading('3. Source Code &amp; Project Links'),
  p(kv('Source Code', f('Delivery Format, e.g., GitHub Repository / .zip Archive'))),
  p(kv('Production Website', f('Production URL'))),
  p('The production-ready website is a demonstration and will be taken down after delivery.'),

  heading('4. Environment Variables &amp; Secrets'),
  p(
    'The project uses environment variables for API keys configuration, and other sensitive information within the .env file.'
  ),
  p('Example:'),
  code([
    `${f('PROVIDER')}_API_KEY=${f('API_KEY_PLACEHOLDER')}`,
    `CONTACT_FROM_EMAIL="${f('Company Name')} &lt;${f('sender@example.com')}&gt;"`,
    `CONTACT_TO_EMAIL=${f('recipient@example.com')}`
  ]),
  p(
    'Actual secrets are not included in this document. Production variables should be maintained securely through the hosting provider or relevant service dashboard.'
  ),

  heading('5. Website Content &amp; Assets'),
  p('The website contains the content and assets provided or approved by the client, including:'),
  ul([
    'Company information and website copy',
    'Logos and brand assets',
    'Images and videos',
    'Icons and other visual assets',
    'Contact information',
    'Other client-provided materials'
  ]),
  p('The client is responsible for the accuracy, ownership, and licensing of client-provided content and assets.'),

  heading('6. Browser &amp; Device Testing'),
  p('The website has been tested for functionality, responsiveness, and visual consistency across:'),
  ul(['Desktop', 'Mobile', 'Tablet', 'Google Chrome', 'Safari', 'Firefox']),
  p(
    `Testing covers the primary website functionality and responsive layouts. Minor rendering differences may occur between browsers or devices. We used Polypane for testing and rely on that for responsive issues, as prior mentioned any other issues are out of ${f('SOW Number')}.`
  ),

  heading('7. Hosting, Domain &amp; Third-Party Services'),
  p(kv('Hosting', f('Hosting Provider / Client&rsquo;s Property'))),
  p(kv('Email Service', f('Email Service Provider'))),
  p(
    'Account ownership, billing, renewals, and credentials for client-owned services are the client&rsquo;s responsibility after handover.'
  ),

  heading('8. Maintenance &amp; Post-Handover Support'),
  p(
    `{{agency.name}} will provide ${f('Support Duration, e.g., 30 days')} of post-handover support for issues related to the delivered implementation, per the Warranty Period in ${f('SOW Number')}.`
  ),
  p('Support includes:'),
  ul([
    'Bug fixes related to the delivered scope',
    'Initial deployment assistance',
    'Clarification regarding delivered functionality'
  ]),
  p(
    `New features, redesigns, additional integrations, content restructuring, and ongoing maintenance are treated as separate development work and will be charged. An additional ${f('Support Window, e.g., 30-day window')} for minor, non-urgent changes follows the Warranty Period, per ${f('SOW Number')}.`
  ),

  heading('9. Ownership &amp; Transfer'),
  p(
    'Upon completion of the agreed project and applicable commercial terms, the project is formally transferred to {{client.company}}.'
  ),
  p(
    'The client receives access to the delivered source code, production website, project assets, and applicable project resources listed in this document.'
  ),
  p('Third-party services remain subject to their respective provider terms and licenses.'),
  p(
    'Following handover, the client is responsible for maintaining access, credentials, hosting, domain, third-party services, content, and security of client-owned accounts.'
  ),

  heading('10. Client Acceptance'),
  p('By accepting this handover, the client confirms that:'),
  ul([
    'The website has been delivered according to the agreed scope.',
    'The delivered website has been reviewed.',
    'Required project access and resources have been provided.',
    'Known pending items, if any, have been documented.',
    'The client understands the responsibilities transferred after handover.'
  ]),
  p(
    'We {{agency.name}} acknowledge that we have received payment for the job and the client&rsquo;s requirements are fulfilled.'
  ),
  signatures(
    {
      party: 'Client',
      lines: ['Name: {{client.contactName}}', 'Company: {{client.company}}', `Signature: ${LINE}`, 'Date: {{today}}']
    },
    {
      party: '{{agency.name}}',
      lines: [`Representative: ${f('Agency Representative Name (Title)')}`, `Signature: ${LINE}`, 'Date: {{today}}']
    }
  )
].join('');

export const DEFAULT_TEMPLATES: DocumentTemplateInput[] = [
  { name: 'Project Proposal & Quotation', type: 'Proposal', html: proposalHtml },
  { name: 'Statement of Work', type: 'Statement of Work', html: sowHtml },
  { name: 'Master Service Agreement', type: 'Agreement', html: msaHtml },
  { name: 'Website Handover', type: 'Handover', html: handoverHtml }
];

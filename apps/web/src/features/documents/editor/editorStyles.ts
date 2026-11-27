import { DOCUMENT_CONTENT_CSS, DOCUMENT_PAGE } from '@kraven/config';
import { PAGE_PX } from './pageGeometry';

/**
 * Editor-only CSS. Body typography comes from the shared DOCUMENT_CONTENT_CSS (same as the PDF shell);
 * everything here is chrome: page canvas, chips, header/footer bands, page-break spacer.
 */
export const EDITOR_CSS = `
${DOCUMENT_CONTENT_CSS}
.kd-root { color-scheme: light; }
.kd-canvas .ProseMirror { outline: none; background: transparent; box-sizing: content-box; }
.kd-canvas .ProseMirror.rm-with-pagination { border: none !important; }
.kd-canvas .rm-with-pagination .page { background: transparent; }
.kd-canvas .ProseMirror[contenteditable="false"] { caret-color: transparent; }

/* White page sheets: pagination-plus draws gaps; the sheet itself is the editor's white background. */
.kd-pages { background: #fff; box-shadow: 0 1px 3px rgba(60,64,67,.15), 0 4px 12px rgba(60,64,67,.12); }
.kd-canvas .rm-pagination-gap { border-color: transparent !important; box-shadow: inset 0 6px 6px -6px rgba(60,64,67,.25), inset 0 -6px 6px -6px rgba(60,64,67,.25); }

/* Header/footer bands: fixed height so the body starts exactly at the PDF margin. */
.kd-canvas .rm-page-header-content, .kd-canvas .rm-page-footer-content { height: ${PAGE_PX.headerHeight}px; overflow: hidden; }
.kd-canvas .rm-page-header, .kd-canvas .rm-page-footer { cursor: text !important; }
.kd-canvas .rm-page-header-left, .kd-canvas .rm-page-footer-left { float: none !important; display: block !important; width: calc(100% - var(--rm-margin-left) - var(--rm-margin-right)); }
.kd-canvas .rm-first-page-header .rm-page-header-left { width: 100%; }
.kd-canvas .rm-page-header-right, .kd-canvas .rm-page-footer-right { display: none !important; }
.kd-band { font-family: ${DOCUMENT_PAGE.fontFamily}; font-size: 9pt; line-height: 1.35; color: #5f6368; height: ${PAGE_PX.headerHeight}px; display: flex; flex-direction: column; justify-content: flex-end; }
.kd-band--footer { justify-content: flex-start; }
.kd-band p { margin: 0; }
.kd-band img, .kd-hf-editor img { max-height: ${PAGE_PX.headerHeight - 4}px; width: auto; display: inline-block; vertical-align: middle; }
.kd-canvas:not(.kd-hf-active) .kd-band { opacity: .6; }
.kd-canvas:not(.kd-readonly) .rm-page-header:hover .kd-band, .kd-canvas:not(.kd-readonly) .rm-page-footer:hover .kd-band { opacity: .85; }
.kd-band:empty::before { content: ''; }
.kd-page-total::before { content: var(--kd-page-total, "1"); }
.kd-hf-active .ProseMirror.rm-with-pagination > *:not([data-rm-pagination]):not(.rm-first-page-header) { opacity: .4; }

/* Variable chips */
.kd-variable { display: inline; border-radius: 4px; padding: 0 3px; margin: 0 1px; background: #e8f0fe; color: #174ea6; font-size: .95em; white-space: nowrap; }
.kd-variable--missing { background: #fef7e0; color: #b06000; outline: 1px dashed #f9ab00; outline-offset: -1px; }
.ProseMirror-selectednode.kd-variable, .ProseMirror-selectednode .kd-variable { outline: 2px solid #1a73e8; outline-offset: 0; }

/* Manual page break spacer */
.kd-page-break { position: relative; display: block; width: 100%; min-height: 1px; user-select: none; }
.kd-page-break::before { content: ''; position: absolute; left: 0; right: 0; top: 6px; border-top: 1px dashed #c4c7c5; }
.kd-page-break__label { position: absolute; top: 0; left: 50%; transform: translateX(-50%); font: 500 10px/12px ${DOCUMENT_PAGE.fontFamily}; color: #80868b; background: #fff; padding: 0 6px; letter-spacing: .04em; text-transform: uppercase; }
.ProseMirror-selectednode.kd-page-break::before { border-top-color: #1a73e8; }

.kd-canvas .document-content table { display: table; }
.kd-canvas .document-content .selectedCell { background: #e8f0fe; }
.kd-canvas .document-content p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #9aa0a6; float: left; height: 0; pointer-events: none; }
.kd-hf-editor .ProseMirror { outline: none; font-family: ${DOCUMENT_PAGE.fontFamily}; font-size: 9pt; line-height: 1.35; color: #3c4043; min-height: ${PAGE_PX.headerHeight}px; }
.kd-hf-editor .ProseMirror p { margin: 0; }
`;

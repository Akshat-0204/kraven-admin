import { DOCUMENT_PAGE } from '@kraven/config';

const PX_PER_MM = 96 / 25.4;
export const mmToPx = (mm: number) => Math.round(mm * PX_PER_MM);

/** Pixel geometry for tiptap-pagination-plus, derived from the shared DOCUMENT_PAGE (same numbers the PDF uses). */
export const PAGE_PX = {
  width: mmToPx(DOCUMENT_PAGE.widthMm),
  height: mmToPx(DOCUMENT_PAGE.heightMm),
  marginLeft: mmToPx(DOCUMENT_PAGE.marginMm.left),
  marginRight: mmToPx(DOCUMENT_PAGE.marginMm.right),
  /** Page edge -> header band. The 12mm header band itself sits inside the 25mm top margin. */
  marginTop: mmToPx(DOCUMENT_PAGE.marginMm.top - DOCUMENT_PAGE.headerHeightMm),
  marginBottom: mmToPx(DOCUMENT_PAGE.marginMm.bottom - DOCUMENT_PAGE.footerHeightMm),
  headerHeight: mmToPx(DOCUMENT_PAGE.headerHeightMm),
  footerHeight: mmToPx(DOCUMENT_PAGE.footerHeightMm),
  gap: 20
};

/** Height of the writable body area of one page. */
export const PAGE_CONTENT_PX =
  PAGE_PX.height - PAGE_PX.marginTop - PAGE_PX.headerHeight - PAGE_PX.marginBottom - PAGE_PX.footerHeight;

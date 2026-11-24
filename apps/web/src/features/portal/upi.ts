export interface UpiPaymentRequest {
  /** Payee UPI id (VPA), e.g. `name@bank`. */
  vpa: string;
  /** Payee name shown in the UPI app. */
  name: string;
  /** Amount in rupees; sent with two decimals. Omitted when not positive. */
  amount?: number;
  /** Transaction note, e.g. the invoice number. */
  note?: string;
}

/** Deep-link schemes. `upi://pay` opens the system chooser; the others target one app. */
export const UPI_APP_SCHEMES = {
  any: 'upi://pay',
  gpay: 'tez://upi/pay',
  phonepe: 'phonepe://pay',
  paytm: 'paytmmp://pay'
} as const;

/** Query string of a UPI payment link (NPCI linking spec). Every value is URI-encoded. */
export function buildUpiParams({ vpa, name, amount, note }: UpiPaymentRequest) {
  const params: [string, string][] = [
    ['pa', vpa.trim()],
    ['pn', name.trim()]
  ];
  if (amount !== undefined && Number.isFinite(amount) && amount > 0) params.push(['am', amount.toFixed(2)]);
  if (note?.trim()) params.push(['tn', note.trim()]);
  params.push(['cu', 'INR']);
  return params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
}

/** `upi://pay?pa=&pn=&am=&tn=&cu=INR`, or the same query on an app-specific scheme. */
export function buildUpiUri(request: UpiPaymentRequest, scheme: string = UPI_APP_SCHEMES.any) {
  return `${scheme}?${buildUpiParams(request)}`;
}

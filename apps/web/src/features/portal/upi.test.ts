import { describe, expect, it } from 'vitest';
import { UPI_APP_SCHEMES, buildUpiUri } from './upi';

describe('buildUpiUri', () => {
  it('builds a UPI deep link with amount, note and currency', () => {
    expect(buildUpiUri({ vpa: 'sanxhit@slc', name: 'Sanchit Jain', amount: 1500, note: 'INV-001' })).toBe(
      'upi://pay?pa=sanxhit%40slc&pn=Sanchit%20Jain&am=1500.00&tn=INV-001&cu=INR'
    );
  });

  it('encodes every value so it cannot inject extra parameters', () => {
    const uri = buildUpiUri({ vpa: 'a@b', name: 'R&D Co=1', amount: 10.5, note: 'Invoice #7 & more?x=1' });
    expect(uri).toBe('upi://pay?pa=a%40b&pn=R%26D%20Co%3D1&am=10.50&tn=Invoice%20%237%20%26%20more%3Fx%3D1&cu=INR');

    const params = new URLSearchParams(uri.split('?')[1]);
    expect([...params.keys()]).toEqual(['pa', 'pn', 'am', 'tn', 'cu']);
    expect(params.get('pn')).toBe('R&D Co=1');
    expect(params.get('tn')).toBe('Invoice #7 & more?x=1');
  });

  it('rounds the amount to two decimals and omits empty amount and note', () => {
    expect(buildUpiUri({ vpa: 'x@y', name: 'X', amount: 99.999 })).toBe('upi://pay?pa=x%40y&pn=X&am=100.00&cu=INR');
    expect(buildUpiUri({ vpa: 'x@y', name: 'X', amount: 0, note: '  ' })).toBe('upi://pay?pa=x%40y&pn=X&cu=INR');
  });

  it('uses app-specific schemes', () => {
    expect(buildUpiUri({ vpa: 'x@y', name: 'X' }, UPI_APP_SCHEMES.gpay)).toBe('tez://upi/pay?pa=x%40y&pn=X&cu=INR');
  });
});

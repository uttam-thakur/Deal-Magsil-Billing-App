import { Invoice } from '@/types';
import { createInvoice } from '@/lib/defaults';

export function normalizeInvoice(x: Invoice): Invoice {
  const legacyStatus = String((x as Invoice & { paymentStatus?: string }).paymentStatus || '');
  const paymentStatus: Invoice['paymentStatus'] = legacyStatus === 'Paid' || legacyStatus === 'Successful' ? 'Successful' : 'Pending';
  const raw = x as Invoice & { consigneeSameAsBuyer?: boolean };
  const legacyLinked = raw.consigneeSameAsBuyer === true;
  const terms = Array.isArray(x.meta?.termsAndConditions) ? x.meta.termsAndConditions : [x.meta?.paymentTerms || '', '', '', '', ''];
  return {
    ...x,
    meta: {
      ...createInvoice().meta,
      ...x.meta,
      termsOfPayment: x.meta?.termsOfPayment || x.meta?.termsOfDelivery || '',
      termsOfDelivery: x.meta?.termsOfDelivery || x.meta?.paymentTerms || '',
      termsAndConditions: terms.length >= 5 ? terms.slice(0, 5) : [...terms, ...Array(5 - terms.length).fill('')],
    },
    buyerSameAsConsignee: x.buyerSameAsConsignee ?? legacyLinked,
    paymentStatus,
  };
}

export function calc(inv: Invoice) {
  let subtotal = 0, cgst = 0, sgst = 0, igst = 0;
  inv.items.forEach(i => {
    const b = Math.max(0, i.quantity) * Math.max(0, i.rate);
    subtotal += b;
    if (inv.mode === 'GST') {
      if (inv.taxMode === 'INTRA') {
        cgst += b * i.gstRate / 200;
        sgst += b * i.gstRate / 200;
      } else {
        igst += b * i.gstRate / 100;
      }
    }
  });
  return { subtotal, cgst, sgst, igst, tax: cgst + sgst + igst, grand: subtotal + cgst + sgst + igst + inv.roundOff };
}

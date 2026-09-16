'use client';

import styles from "./BillPreviewModal.module.css";
import { calc } from '@/lib/billing';
import { CompanySettings, Invoice } from '@/types';
import { InvoicePreview } from '@/components/invoice/InvoicePreview';

type Props = {
  invoice: Invoice;
  company: CompanySettings;
  onClose: () => void;
  onPrint: () => void;
};

export function BillPreviewModal({ invoice, company, onClose, onPrint }: Props) {
  const totals = calc(invoice);

  return (
    <div className={styles["bill-preview-overlay"]} role="dialog" aria-modal="true" aria-label={`Invoice ${invoice.meta.invoiceNo}`}>
      <div className={styles["bill-preview-toolbar"]}>
        <div>
          <b>Bill Preview</b>
          <span>{invoice.meta.invoiceNo}</span>
        </div>
        <div className={styles["bill-preview-actions"]}>
          <button className={styles["primary"]} onClick={onPrint}>Print / Save PDF</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
      <div className={styles["bill-preview-scroll"]}>
        <div className={styles["bill-preview-paper"]}>
          <InvoicePreview invoice={invoice} company={company} totals={totals} />
        </div>
      </div>
    </div>
  );
}

'use client';

import styles from "./Ledger.module.css";
import { useMemo, useState } from 'react';
import { calc } from '@/lib/billing';
import { dateDisplay, money } from '@/lib/format';
import { Customer, Invoice, LedgerEntry, LedgerPaymentMode } from '@/types';

type Props = {
  invoices: Invoice[];
  customers: Customer[];
  entries: LedgerEntry[];
  onSaveEntry: (entry: LedgerEntry) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onOpenInvoice: (id: string) => void;
};

type Txn = {
  id: string;
  date: string;
  kind: 'Sales' | 'Receipt';
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNo: string;
  particulars: string;
  debit: number;
  credit: number;
  reference: string;
  notes: string;
  isAuto?: boolean;
  entryId?: string;
};

type PaymentDraft = {
  date: string;
  amount: number;
  paymentMode: LedgerPaymentMode;
  reference: string;
  notes: string;
};

function invoiceCustomer(invoice: Invoice) {
  return invoice.buyer.name.trim() ? invoice.buyer : invoice.consignee;
}

function invoiceTotal(invoice: Invoice) {
  return calc(invoice).grand;
}

function explicitReceiptsForInvoice(invoiceId: string, entries: LedgerEntry[]) {
  return entries
    .filter((entry) => entry.invoiceId === invoiceId)
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
}

function buildTransactions(invoices: Invoice[], entries: LedgerEntry[]): Txn[] {
  const txns: Txn[] = [];

  for (const invoice of invoices) {
    const party = invoiceCustomer(invoice);
    if (!party.name.trim()) continue;

    const total = invoiceTotal(invoice);
    const invoiceEntries = entries.filter((entry) => entry.invoiceId === invoice.id);
    const explicit = invoiceEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

    txns.push({
      id: `sale-${invoice.id}`,
      date: invoice.meta.date,
      kind: 'Sales',
      customerId: '',
      customerName: party.name,
      invoiceId: invoice.id,
      invoiceNo: invoice.meta.invoiceNo,
      particulars: `${invoice.mode === 'GST' ? 'Sales / Tax Invoice' : 'Sales Invoice'} — ${invoice.meta.invoiceNo}`,
      debit: total,
      credit: 0,
      reference: '',
      notes: invoice.paymentStatus === 'Successful' ? 'Marked Successful on invoice' : 'Pending invoice',
    });

    if (explicit > 0) {
      for (const entry of invoiceEntries) {
        txns.push({
          id: `receipt-${entry.id}`,
          date: entry.date,
          kind: 'Receipt',
          customerId: entry.customerId,
          customerName: entry.customerName || party.name,
          invoiceId: invoice.id,
          invoiceNo: entry.invoiceNo || invoice.meta.invoiceNo,
          particulars: `Receipt against ${entry.invoiceNo || invoice.meta.invoiceNo}`,
          debit: 0,
          credit: Number(entry.amount || 0),
          reference: entry.reference,
          notes: entry.notes || entry.paymentMode,
          entryId: entry.id,
        });
      }
    } else if (invoice.paymentStatus === 'Successful') {
      txns.push({
        id: `auto-receipt-${invoice.id}`,
        date: invoice.meta.date,
        kind: 'Receipt',
        customerId: '',
        customerName: party.name,
        invoiceId: invoice.id,
        invoiceNo: invoice.meta.invoiceNo,
        particulars: `Payment received — ${invoice.meta.invoiceNo}`,
        debit: 0,
        credit: total,
        reference: '',
        notes: 'Auto entry from Successful invoice',
        isAuto: true,
      });
    }
  }

  for (const entry of entries) {
    if (entry.invoiceId) continue;
    txns.push({
      id: `receipt-${entry.id}`,
      date: entry.date,
      kind: 'Receipt',
      customerId: entry.customerId,
      customerName: entry.customerName,
      invoiceId: '',
      invoiceNo: '',
      particulars: 'Receipt / On-account payment',
      debit: 0,
      credit: Number(entry.amount || 0),
      reference: entry.reference,
      notes: entry.notes || entry.paymentMode,
      entryId: entry.id,
    });
  }

  return txns.sort((a, b) => {
    const d = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (d !== 0) return d;
    return a.id.localeCompare(b.id);
  });
}

export function Ledger({ invoices, customers, entries, onSaveEntry, onDeleteEntry, onOpenInvoice }: Props) {
  const [customerId, setCustomerId] = useState('all');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<LedgerEntry>(() => ({
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    type: 'Receipt',
    customerId: '',
    customerName: '',
    invoiceId: '',
    invoiceNo: '',
    amount: 0,
    paymentMode: 'Cash',
    reference: '',
    notes: '',
    createdAt: new Date().toISOString(),
  }));

  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [detailSaving, setDetailSaving] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>({
    date: new Date().toISOString().slice(0, 10),
    amount: 0,
    paymentMode: 'Cash',
    reference: '',
    notes: '',
  });

  const transactions = useMemo(() => buildTransactions(invoices, entries), [invoices, entries]);
  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const customerOptions = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach((c) => map.set(c.id, c.name));
    invoices.forEach((invoice) => {
      const party = invoiceCustomer(invoice);
      if (!party.name.trim()) return;
      const key = `party:${party.name.trim().toLowerCase()}`;
      if (!map.has(key)) map.set(key, party.name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [customers, invoices]);

  const selectedFilterCustomerName = useMemo(() => {
    if (customerId === 'all') return '';
    return customerOptions.find(([id]) => id === customerId)?.[1] || '';
  }, [customerId, customerOptions]);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const customerMatches =
        customerId === 'all' ||
        (tx.customerId && tx.customerId === customerId) ||
        (selectedFilterCustomerName && tx.customerName.toLowerCase() === selectedFilterCustomerName.toLowerCase());
      const invoiceMatches = !invoiceSearch.trim() || `${tx.invoiceNo} ${tx.particulars}`.toLowerCase().includes(invoiceSearch.trim().toLowerCase());
      const fromMatches = !fromDate || tx.date >= fromDate;
      const toMatches = !toDate || tx.date <= toDate;
      return customerMatches && invoiceMatches && fromMatches && toMatches;
    });
  }, [transactions, customerId, selectedFilterCustomerName, invoiceSearch, fromDate, toDate]);

  const summary = useMemo(() => {
    const debits = filtered.reduce((sum, tx) => sum + tx.debit, 0);
    const credits = filtered.reduce((sum, tx) => sum + tx.credit, 0);
    let opening = 0;
    if (fromDate && !invoiceSearch.trim()) {
      opening = transactions
        .filter((tx) => {
          const customerMatches =
            customerId === 'all' ||
            (tx.customerId && tx.customerId === customerId) ||
            (selectedFilterCustomerName && tx.customerName.toLowerCase() === selectedFilterCustomerName.toLowerCase());
          return customerMatches && tx.date < fromDate;
        })
        .reduce((sum, tx) => sum + tx.debit - tx.credit, 0);
    }
    return { debit: debits, credit: credits, opening, balance: opening + debits - credits };
  }, [filtered, transactions, customerId, selectedFilterCustomerName, fromDate, invoiceSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const selectedCustomerInvoices = useMemo(() => {
    if (!form.customerId || !form.customerName) return [];
    return invoices.filter((invoice) => invoiceCustomer(invoice).name.trim().toLowerCase() === form.customerName.trim().toLowerCase());
  }, [form.customerId, form.customerName, invoices]);

  const selectedInvoiceDue = useMemo(() => {
    if (!form.invoiceId) return 0;
    const invoice = invoices.find((item) => item.id === form.invoiceId);
    if (!invoice) return 0;
    const total = invoiceTotal(invoice);
    const receipts = explicitReceiptsForInvoice(invoice.id, entries);
    if (invoice.paymentStatus === 'Successful') return 0;
    return Math.max(0, total - receipts);
  }, [form.invoiceId, invoices, entries]);

  const detailPayments = useMemo(() => {
    if (!detailInvoice) return [];
    const explicit = entries
      .filter((entry) => entry.invoiceId === detailInvoice.id)
      .slice()
      .sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        return byDate !== 0 ? byDate : a.createdAt.localeCompare(b.createdAt);
      });

    // A bill marked Successful is treated as fully paid even if no explicit
    // receipt row was recorded. Show that as a synthetic payment row so the
    // invoice ledger remains internally consistent.
    if (explicit.length === 0 && detailInvoice.paymentStatus === 'Successful') {
      return [{
        id: `auto-${detailInvoice.id}`,
        date: detailInvoice.meta.date,
        type: 'Receipt' as const,
        customerId: '',
        customerName: invoiceCustomer(detailInvoice).name,
        invoiceId: detailInvoice.id,
        invoiceNo: detailInvoice.meta.invoiceNo,
        amount: invoiceTotal(detailInvoice),
        paymentMode: 'Bank' as LedgerPaymentMode,
        reference: '',
        notes: 'Invoice marked Successful',
        createdAt: detailInvoice.createdAt,
      } as LedgerEntry];
    }

    return explicit;
  }, [detailInvoice, entries]);

  const detailTotal = detailInvoice ? invoiceTotal(detailInvoice) : 0;
  const detailPaid = detailPayments.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const detailRemaining = Math.max(0, detailTotal - detailPaid);
  const detailPaidStatus = detailRemaining <= 0.009;

  const selectCustomer = (id: string) => {
    const customer = customerMap.get(id);
    setForm((current) => ({
      ...current,
      customerId: id,
      customerName: customer?.name || '',
      invoiceId: '',
      invoiceNo: '',
      amount: 0,
    }));
  };

  const selectedInvoiceAmount = (invoice: Invoice) => {
    const total = invoiceTotal(invoice);
    const receipts = explicitReceiptsForInvoice(invoice.id, entries);
    if (invoice.paymentStatus === 'Successful') return 0;
    return Math.max(0, total - receipts);
  };

  const selectInvoice = (id: string) => {
    const invoice = invoices.find((item) => item.id === id);
    if (!invoice) {
      setForm((current) => ({ ...current, invoiceId: '', invoiceNo: '', amount: 0 }));
      return;
    }
    const party = invoiceCustomer(invoice);
    setForm((current) => ({
      ...current,
      customerId: current.customerId || '',
      customerName: party.name,
      invoiceId: invoice.id,
      invoiceNo: invoice.meta.invoiceNo,
      amount: Math.round(selectedInvoiceAmount(invoice) * 100) / 100,
    }));
  };

  const submitReceipt = async () => {
    if (!form.customerName.trim() || Number(form.amount) <= 0) return;
    if (form.invoiceId && selectedInvoiceDue === 0) return;
    if (form.invoiceId && Number(form.amount) > selectedInvoiceDue) return;
    setSaving(true);
    try {
      await onSaveEntry({ ...form, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
      setForm({
        id: crypto.randomUUID(),
        date: new Date().toISOString().slice(0, 10),
        type: 'Receipt',
        customerId: '',
        customerName: '',
        invoiceId: '',
        invoiceNo: '',
        amount: 0,
        paymentMode: 'Cash',
        reference: '',
        notes: '',
        createdAt: new Date().toISOString(),
      });
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const openInvoiceSheet = (invoiceId: string) => {
    const invoice = invoices.find((item) => item.id === invoiceId);
    if (!invoice) return;
    setDetailInvoice(invoice);
    setPaymentDraft({
      date: new Date().toISOString().slice(0, 10),
      amount: 0,
      paymentMode: 'Cash',
      reference: '',
      notes: '',
    });
  };

  const savePaymentFromSheet = async () => {
    if (!detailInvoice || paymentDraft.amount <= 0 || detailRemaining <= 0) return;
    if (paymentDraft.amount > detailRemaining + 0.01) return;

    const party = invoiceCustomer(detailInvoice);
    setDetailSaving(true);
    try {
      await onSaveEntry({
        id: crypto.randomUUID(),
        date: paymentDraft.date,
        type: 'Receipt',
        customerId: party.name.trim() ? (customers.find((c) => c.name.trim().toLowerCase() === party.name.trim().toLowerCase())?.id || '') : '',
        customerName: party.name,
        invoiceId: detailInvoice.id,
        invoiceNo: detailInvoice.meta.invoiceNo,
        amount: paymentDraft.amount,
        paymentMode: paymentDraft.paymentMode,
        reference: paymentDraft.reference,
        notes: paymentDraft.notes,
        createdAt: new Date().toISOString(),
      });

      setPaymentDraft({
        date: new Date().toISOString().slice(0, 10),
        amount: 0,
        paymentMode: 'Cash',
        reference: '',
        notes: '',
      });
    } finally {
      setDetailSaving(false);
    }
  };

  const clearFilters = () => {
    setCustomerId('all');
    setInvoiceSearch('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  return (
    <section className={`${styles["page"]} ${styles["ledger-page"]}`}>
      <div className={styles["page-title"]}>
        <div>
          <p className={styles["eyebrow"]}>TALLY-STYLE PARTY LEDGER</p>
          <h1>Ledger</h1>
          <p className={styles["muted"]}>Track sales, receipts and outstanding balances customer by customer.</p>
        </div>
        <button className={styles["primary"]} onClick={() => setFormOpen(true)}>＋ Record Payment</button>
      </div>

      <div className={`${styles["ledger-filters"]} ${styles["table-card"]}`}>
        <div className={styles["ledger-filter-grid"]}>
          <label className={styles["field"]}>
            <span>Customer</span>
            <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setPage(1); }}>
              <option value="all">All Customers</option>
              {customerOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>

          <label className={styles["field"]}>
            <span>Invoice</span>
            <input value={invoiceSearch} onChange={(e) => { setInvoiceSearch(e.target.value); setPage(1); }} placeholder="Invoice no. / search" />
          </label>

          <label className={styles["field"]}>
            <span>From Date</span>
            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
          </label>

          <label className={styles["field"]}>
            <span>To Date</span>
            <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
          </label>
        </div>

        <button className={styles["table-action"]} onClick={clearFilters}>Clear Filters</button>
      </div>

      <div className={styles["ledger-summary-grid"]}>
        <div className={styles["ledger-summary-card"]}><span>Opening Balance</span><strong>₹ {money(summary.opening)}</strong></div>
        <div className={styles["ledger-summary-card"]}><span>Total Sales / Debit</span><strong>₹ {money(summary.debit)}</strong></div>
        <div className={styles["ledger-summary-card"]}><span>Total Received / Credit</span><strong>₹ {money(summary.credit)}</strong></div>
        <div className={`${styles["ledger-summary-card"]} ${styles["due"]}`}><span>Outstanding / Closing Due</span><strong>₹ {money(summary.balance)}</strong></div>
      </div>

      {formOpen && (
        <div className={`${styles["ledger-payment-card"]} ${styles["table-card"]}`}>
          <div className={`${styles["page-title"]} ${styles["compact"]}`}>
            <div><h2>Record Receipt / Payment</h2><p className={styles["muted"]}>Enter money received from a customer, optionally against a specific invoice.</p></div>
            <button onClick={() => setFormOpen(false)}>Close</button>
          </div>

          <div className={styles["ledger-form-grid"]}>
            <label className={styles["field"]}>
              <span>Customer</span>
              <select value={form.customerId} onChange={(e) => selectCustomer(e.target.value)}>
                <option value="">Select Customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>

            <label className={styles["field"]}>
              <span>Invoice</span>
              <select value={form.invoiceId} onChange={(e) => selectInvoice(e.target.value)} disabled={!form.customerId}>
                <option value="">On Account / Advance</option>
                {selectedCustomerInvoices.map((invoice) => {
                  const due = selectedInvoiceAmount(invoice);
                  return <option key={invoice.id} value={invoice.id}>{invoice.meta.invoiceNo} — Due ₹ {money(due)}</option>;
                })}
              </select>
            </label>

            <label className={styles["field"]}><span>Date</span><input type="date" value={form.date} onChange={(e) => setForm((v) => ({ ...v, date: e.target.value }))} /></label>
            <label className={styles["field"]}><span>Amount Received</span><input type="number" min="0" step="0.01" value={form.amount || ''} onChange={(e) => setForm((v) => ({ ...v, amount: Number(e.target.value) || 0 }))} /></label>
            <label className={styles["field"]}><span>Payment Mode</span><select value={form.paymentMode} onChange={(e) => setForm((v) => ({ ...v, paymentMode: e.target.value as LedgerPaymentMode }))}><option>Cash</option><option>UPI</option><option>Bank</option><option>Cheque</option><option>Other</option></select></label>
            <label className={styles["field"]}><span>Reference</span><input value={form.reference} onChange={(e) => setForm((v) => ({ ...v, reference: e.target.value }))} placeholder="UTR / cheque no. / reference" /></label>
            <label className={`${styles["field"]} ${styles["full"]}`}><span>Notes</span><textarea value={form.notes} onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))} placeholder="Optional note" /></label>
          </div>

          {form.invoiceId && <div className={styles["ledger-due-hint"]}>Current invoice due: <b>₹ {money(selectedInvoiceDue)}</b></div>}
          <div className={styles["actions"]}><button className={styles["primary"]} disabled={saving || !form.customerName.trim() || Number(form.amount) <= 0 || (!!form.invoiceId && selectedInvoiceDue === 0) || (!!form.invoiceId && Number(form.amount) > selectedInvoiceDue)} onClick={submitReceipt}>{saving ? 'Saving…' : 'Save Receipt'}</button></div>
        </div>
      )}

      <div className={`${styles["table-card"]} ${styles["ledger-table-wrap"]}`}>
        <div className={styles["section-title"]}>Ledger Entries</div>
        {visible.length === 0 ? <div className={styles["empty"]}>No ledger transactions match the selected filters.</div> : (
          <table>
            <thead><tr><th>Date</th><th>Customer</th><th>Particulars</th><th>Invoice</th><th>Debit / Sale</th><th>Credit / Receipt</th><th>Balance</th><th>Action</th></tr></thead>
            <tbody>
              {(() => {
                let running = 0;
                const prior = filtered.slice(0, (page - 1) * pageSize);
                prior.forEach((tx) => { running += tx.debit - tx.credit; });
                return visible.map((tx) => {
                  running += tx.debit - tx.credit;
                  return (
                    <tr key={tx.id}>
                      <td>{dateDisplay(tx.date)}</td>
                      <td><b>{tx.customerName}</b></td>
                      <td>{tx.particulars}<small className={styles["ledger-note"]}>{tx.notes}</small></td>
                      <td>{tx.invoiceNo || '—'}</td>
                      <td>{tx.debit ? `₹ ${money(tx.debit)}` : '—'}</td>
                      <td>{tx.credit ? `₹ ${money(tx.credit)}` : '—'}</td>
                      <td><b className={running > 0 ? styles['due'] : styles['ledger-credit-value']}>₹ {money(running)}</b></td>
                      <td className={styles["ledger-actions"]}>
                        {tx.invoiceId && <button className={styles["table-action"]} onClick={() => openInvoiceSheet(tx.invoiceId)}>Open</button>}
                        {tx.entryId && !tx.isAuto && <button className={`${styles["danger"]} ${styles["table-action"]}`} onClick={() => onDeleteEntry(tx.entryId!)}>Delete</button>}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        )}

        <div className={styles["pagination"]}>
          <span>Page {page} of {totalPages} · {filtered.length} entries</span>
          <div><button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button><button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button></div>
        </div>
      </div>

      <div className={`${styles["table-card"]} ${styles["ledger-summary-table"]}`}>
        <div className={styles["section-title"]}>Customer Outstanding Summary</div>
        <table>
          <thead><tr><th>Customer</th><th>Total Sales</th><th>Total Received</th><th>Balance Due</th></tr></thead>
          <tbody>
            {customers.map((customer) => {
              const customerTxns = transactions.filter((tx) => tx.customerId === customer.id || tx.customerName.toLowerCase() === customer.name.toLowerCase());
              const debit = customerTxns.reduce((sum, tx) => sum + tx.debit, 0);
              const credit = customerTxns.reduce((sum, tx) => sum + tx.credit, 0);
              return (
                <tr key={customer.id}>
                  <td><b>{customer.name}</b></td>
                  <td>₹ {money(debit)}</td>
                  <td>₹ {money(credit)}</td>
                  <td><b className={debit - credit > 0 ? styles['due'] : styles['ledger-credit-value']}>₹ {money(debit - credit)}</b></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detailInvoice && (
        <div className={styles["ledger-modal-backdrop"]} role="dialog" aria-modal="true" aria-label="Invoice ledger">
          <div className={styles["ledger-modal"]}>
            <div className={styles["ledger-modal-head"]}>
              <div>
                <p className={styles["eyebrow"]}>INVOICE PAYMENT LEDGER</p>
                <h2>{detailInvoice.meta.invoiceNo}</h2>
                <p className={styles["muted"]}>{invoiceCustomer(detailInvoice).name}</p>
              </div>
              <button type="button" onClick={() => setDetailInvoice(null)}>Close</button>
            </div>

            <div className={styles["ledger-invoice-summary"]}>
              <div><span>Bill Date</span><b>{dateDisplay(detailInvoice.meta.date)}</b></div>
              <div><span>Total Amount</span><b>₹ {money(detailTotal)}</b></div>
              <div><span>Amount Paid</span><b className={styles["ledger-credit-value"]}>₹ {money(detailPaid)}</b></div>
              <div><span>Remaining Due</span><b className={detailRemaining > 0 ? styles['due'] : styles['ledger-credit-value']}>₹ {money(detailRemaining)}</b></div>
              <div><span>Status</span><b className={detailPaidStatus ? 'ledger-paid-status' : 'ledger-pending-status'}>{detailPaidStatus ? 'PAID' : 'PENDING'}</b></div>
            </div>

            <div className={styles["ledger-modal-section"]}>
              <div className={styles["section-title"]}>Invoice Items</div>
              <div className={styles["ledger-modal-table-wrap"]}>
                <table>
                  <thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
                  <tbody>
                    {detailInvoice.items.map((item, index) => (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td><b>{item.description || 'Item'}</b>{item.hsn && <small className={styles["ledger-note"]}>HSN: {item.hsn}</small>}</td>
                        <td>{item.quantity} {item.unit}</td>
                        <td>₹ {money(item.rate)}</td>
                        <td>₹ {money(Number(item.quantity || 0) * Number(item.rate || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles["ledger-modal-section"]}>
              <div className={styles["section-title"]}>Payment Transactions</div>
              {detailPayments.length === 0 ? (
                <div className={styles["ledger-payment-empty"]}>No payment recorded yet. Add the first payment below.</div>
              ) : (
                <div className={styles["ledger-modal-table-wrap"]}>
                  <table>
                    <thead><tr><th>Date</th><th>Payment Mode</th><th>Amount Paid / Credit</th><th>Remaining</th><th>Reference</th><th>Status</th></tr></thead>
                    <tbody>
                      {(() => {
                        let remaining = detailTotal;
                        return detailPayments.map((entry) => {
                          remaining = Math.max(0, remaining - Number(entry.amount || 0));
                          return (
                            <tr key={entry.id}>
                              <td>{dateDisplay(entry.date)}</td>
                              <td>{entry.paymentMode}</td>
                              <td className={styles["ledger-credit-value"]}><b>₹ {money(entry.amount)}</b></td>
                              <td className={remaining > 0 ? styles['due'] : styles['ledger-credit-value']}><b>₹ {money(remaining)}</b></td>
                              <td>{entry.reference || '—'}</td>
                              <td><span className={remaining <= 0.009 ? 'ledger-paid-status' : 'ledger-pending-status'}>{remaining <= 0.009 ? 'PAID' : 'PENDING'}</span></td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className={`${styles["ledger-modal-section"]} ${styles["ledger-payment-form"]}`}>
              <div className={styles["section-title"]}>Record Amount Paid</div>
              <div className={styles["ledger-form-grid"]}>
                <label className={styles["field"]}><span>Payment Date</span><input type="date" value={paymentDraft.date} onChange={(e) => setPaymentDraft((v) => ({ ...v, date: e.target.value }))} /></label>
                <label className={styles["field"]}><span>Amount Paid</span><input type="number" min="0" step="0.01" max={detailRemaining || undefined} value={paymentDraft.amount || ''} disabled={detailRemaining <= 0.009 || detailSaving} onChange={(e) => setPaymentDraft((v) => ({ ...v, amount: Number(e.target.value) || 0 }))} /></label>
                <label className={styles["field"]}><span>Payment Mode</span><select value={paymentDraft.paymentMode} disabled={detailRemaining <= 0.009 || detailSaving} onChange={(e) => setPaymentDraft((v) => ({ ...v, paymentMode: e.target.value as LedgerPaymentMode }))}><option>Cash</option><option>UPI</option><option>Bank</option><option>Cheque</option><option>Other</option></select></label>
                <label className={styles["field"]}><span>Reference</span><input value={paymentDraft.reference} disabled={detailRemaining <= 0.009 || detailSaving} onChange={(e) => setPaymentDraft((v) => ({ ...v, reference: e.target.value }))} placeholder="UTR / cheque no. / reference" /></label>
                <label className={`${styles["field"]} ${styles["full"]}`}><span>Notes</span><textarea value={paymentDraft.notes} disabled={detailRemaining <= 0.009 || detailSaving} onChange={(e) => setPaymentDraft((v) => ({ ...v, notes: e.target.value }))} placeholder="Optional note" /></label>
              </div>

              <div className={styles["ledger-due-hint"]}>
                Current remaining due: <b>₹ {money(detailRemaining)}</b>
                {paymentDraft.amount > 0 && paymentDraft.amount <= detailRemaining && <span> · After this payment: <b>₹ {money(Math.max(0, detailRemaining - paymentDraft.amount))}</b></span>}
                {paymentDraft.amount > detailRemaining && <span className={styles["ledger-error-text"]}> · Payment exceeds the remaining due.</span>}
              </div>

              <div className={styles["actions"]}>
                <button
                  type="button"
                  className={styles["primary"]}
                  disabled={detailSaving || detailRemaining <= 0.009 || paymentDraft.amount <= 0 || paymentDraft.amount > detailRemaining}
                  onClick={savePaymentFromSheet}
                >
                  {detailSaving ? 'Saving…' : detailRemaining <= 0.009 ? 'Fully Paid' : 'Save Payment'}
                </button>
                <button type="button" onClick={() => onOpenInvoice(detailInvoice.id)}>Open Full Bill</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

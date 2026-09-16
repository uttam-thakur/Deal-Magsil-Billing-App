'use client';
import styles from "./Invoices.module.css";
import * as React from 'react';
import { dateDisplay, money } from '@/lib/format';
import { calc } from '@/lib/billing';
import { Invoice } from '@/types';

type StatusFilter = 'all' | 'pending' | 'successful';
const MONTHS = ['All months','January','February','March','April','May','June','July','August','September','October','November','December'];

type Props = {
  saved: Invoice[];
  search: string;
  setSearch: (v: string) => void;
  onNew: () => void;
  onOpen: (id: string) => void;
  onPreview: (id: string) => void;
  onDelete: (id: string) => void;
};

export function Invoices({ saved, search, setSearch, onNew, onOpen, onPreview, onDelete }: Props) {
  const [status, setStatus] = React.useState<StatusFilter>('all');
  const [month, setMonth] = React.useState('0');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');

  const list = React.useMemo(() => saved.filter((x) => {
    const needle = search.toLowerCase();
    const matchesSearch = `${x.meta.invoiceNo} ${x.buyer.name} ${x.consignee.name}`.toLowerCase().includes(needle);
    const matchesStatus = status === 'all' || (status === 'pending' && x.paymentStatus === 'Pending') || (status === 'successful' && x.paymentStatus === 'Successful');
    const matchesMonth = month === '0' || Number(x.meta.date.slice(5, 7)) === Number(month);
    const matchesFrom = !fromDate || x.meta.date >= fromDate;
    const matchesTo = !toDate || x.meta.date <= toDate;
    return matchesSearch && matchesStatus && matchesMonth && matchesFrom && matchesTo;
  }), [saved, search, status, month, fromDate, toDate]);

  return (
    <section className={styles["page"]}>
      <div className={styles["page-title"]}>
        <div>
          <p className={styles["eyebrow"]}>CLOUD INVOICE REGISTER</p>
          <h1>Saved Bills</h1>
        </div>
        <button className={styles["primary"]} onClick={onNew}>＋ New Bill</button>
      </div>

      <div className={styles["toolbar"]}>
        <input
          placeholder="Search invoice or customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={month} onChange={(e) => setMonth(e.target.value)}>{MONTHS.map((name, i) => <option key={name} value={i}>{name}</option>)}</select>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} aria-label="From date" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} aria-label="To date" />
        <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="successful">Successful</option>
        </select>
      </div>

      {list.length === 0 ? (
        <div className={styles["empty"]}>No matching bills.</div>
      ) : (
        <div className={styles["table-card"]}>
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Status</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((x) => (
                <tr key={x.id}>
                  <td><b>{x.meta.invoiceNo}</b></td>
                  <td>{dateDisplay(x.meta.date)}</td>
                  <td>{x.buyer.name || x.consignee.name || '—'}</td>
                  <td>{x.mode === 'GST' ? 'GST' : 'Non-GST'}</td>
                  <td><span className={`${styles["status"]} ${x.paymentStatus === "Pending" ? styles["pending"] : styles["successful"]}`}>{x.paymentStatus}</span></td>
                  <td>₹ {money(calc(x).grand)}</td>
                  <td>
                    <button className={`${styles["primary"]} ${styles["table-action"]}`} onClick={() => onPreview(x.id)}>Open</button>
                    <button className={styles["table-action"]} onClick={() => onOpen(x.id)}>Edit</button>
                    <button className={`${styles["danger"]} ${styles["table-action"]}`} onClick={() => onDelete(x.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

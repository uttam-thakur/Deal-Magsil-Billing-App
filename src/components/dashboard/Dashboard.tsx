'use client';

import styles from './Dashboard.module.css';
import { useMemo, useState } from 'react';
import { dateDisplay, money } from '@/lib/format';
import { calc } from '@/lib/billing';
import { Invoice, LedgerEntry, Product } from '@/types';

type Range = 'month' | 'year' | 'all';
type StatusFilter = 'all' | 'pending' | 'successful';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type Props = {
  saved: Invoice[];
  products: Product[];
  ledgerEntries: LedgerEntry[];
  onNew: () => void;
  onOpen: (id: string) => void;
};

function localDate(value: string) {
  const [y, m, d] = String(value || '').split('-').map(Number);
  if (!y || !m || !d) return new Date(value);
  return new Date(y, m - 1, d);
}

function inRange(invoice: Invoice, range: Range, year: number, month: string, fromDate: string, toDate: string, now = new Date()) {
  const d = localDate(invoice.meta.date);
  if (Number.isNaN(d.getTime())) return false;
  const key = invoice.meta.date;
  if (fromDate && key < fromDate) return false;
  if (toDate && key > toDate) return false;
  if (fromDate || toDate) return true;
  if (range === 'all' && month === '') return true;
  if (d.getFullYear() !== year) return false;
  if (month !== '' && d.getMonth() !== Number(month)) return false;
  if (month !== '') return true;
  if (range === 'year') return true;
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function shortMoney(value: number) {
  const n = Math.abs(value);
  if (n >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${Math.round(value)}`;
}

function monthSeries(invoices: Invoice[], products: Product[], selectedYear = new Date().getFullYear(), fromDate = '', toDate = '') {
  const now = new Date();
  const costMap = new Map(products.map(p => [p.id, p.costPrice]));
  return Array.from({ length: 12 }, (_, month) => {
    const date = new Date(selectedYear, month, 1);
    const rows = invoices.filter((invoice) => {
      const d = localDate(invoice.meta.date);
      return d.getFullYear() === selectedYear && d.getMonth() === month && (!fromDate || invoice.meta.date >= fromDate) && (!toDate || invoice.meta.date <= toDate);
    });
    const revenue = rows.reduce((sum, invoice) => sum + calc(invoice).grand, 0);
    const pending = rows.filter((invoice) => invoice.paymentStatus === 'Pending').reduce((sum, invoice) => sum + calc(invoice).grand, 0);
    const successful = rows.filter((invoice) => invoice.paymentStatus === 'Successful').reduce((sum, invoice) => sum + calc(invoice).grand, 0);
    const profit = rows.reduce((sum, invoice) => sum + invoice.items.reduce((itemSum, item) => { const cost = costMap.get(item.productId); return itemSum + (typeof cost === 'number' && Number.isFinite(cost) ? (item.rate - cost) * Math.max(0, item.quantity) : 0); }, 0), 0);
    return { label: date.toLocaleDateString('en-IN', { month: 'short' }), revenue, pending, successful, profit };
  });
}

function pointsFor(values: number[], width: number, height: number, pad = 18, max = Math.max(...values, 1)) {
  return values.map((value, index) => {
    const x = pad + (index * (width - pad * 2)) / Math.max(values.length - 1, 1);
    const y = height - pad - (value / max) * (height - pad * 2);
    return { x, y };
  });
}

function LineChart({ data }: { data: ReturnType<typeof monthSeries> }) {
  const width = 760;
  const height = 260;
  const maxValue = Math.max(...data.map((d) => d.revenue), 1);
  const revenue = pointsFor(data.map((d) => d.revenue), width, height, 18, maxValue);
  const successful = pointsFor(data.map((d) => d.successful), width, height, 18, maxValue);
  const path = (points: { x: number; y: number }[]) => points.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const max = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className={styles.lineWrap}>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.lineChart} role="img" aria-label="Monthly revenue and successful payment trend">
        {[0, 1, 2, 3].map((row) => {
          const y = 18 + row * 74;
          return <line key={row} x1="18" x2="742" y1={y} y2={y} className={styles.gridLine} />;
        })}
        <path d={path(revenue)} className={styles.revenueLine} />
        <path d={path(successful)} className={styles.successLine} />
        {revenue.map((point, i) => <circle key={`r-${i}`} cx={point.x} cy={point.y} r="4" className={styles.revenueDot}><title>{data[i].label}: {shortMoney(data[i].revenue)}</title></circle>)}
        {successful.map((point, i) => <circle key={`s-${i}`} cx={point.x} cy={point.y} r="3" className={styles.successDot}><title>{data[i].label}: {shortMoney(data[i].successful)}</title></circle>)}
        {data.map((d, i) => <text key={d.label} x={revenue[i].x} y="250" textAnchor="middle" className={styles.axisText}>{d.label}</text>)}
      </svg>
      <div className={styles.chartLegend}>
        <span><i className={styles.legendRevenue} /> Invoiced {shortMoney(max)}</span>
        <span><i className={styles.legendSuccess} /> Successful payments</span>
      </div>
    </div>
  );
}

function ProfitChart({ data }: { data: ReturnType<typeof monthSeries> }) {
  const max = Math.max(...data.map((d) => Math.abs(d.profit)), 1);
  return <div className={styles.profitChart}>{data.map((d) => <div className={styles.profitCol} key={d.label}><div className={styles.profitValue}>{d.profit ? shortMoney(d.profit) : ''}</div><div className={styles.profitTrack}><i className={d.profit < 0 ? styles.lossBar : styles.profitBar} style={{ height: `${Math.max(d.profit ? 5 : 0, Math.abs(d.profit) / max * 100)}%` }} /></div><span>{d.label}</span></div>)}</div>;
}

function DonutChart({ successful, pending }: { successful: number; pending: number }) {
  const total = successful + pending;
  const successPct = total ? successful / total : 0;
  const circumference = 2 * Math.PI * 48;
  const dash = successPct * circumference;
  return (
    <div className={styles.donutBox}>
      <div className={styles.donutVisual}>
        <svg viewBox="0 0 120 120" className={styles.donut} role="img" aria-label="Successful versus pending invoice amount">
          <circle cx="60" cy="60" r="48" className={styles.donutTrack} />
          <circle cx="60" cy="60" r="48" className={styles.donutSuccess} strokeDasharray={`${dash} ${circumference - dash}`} />
        </svg>
        <div className={styles.donutCenter}><strong>{total ? `${Math.round(successPct * 100)}%` : '0%'}</strong><span>successful</span></div>
      </div>
      <div className={styles.donutLegend}>
        <div><span className={styles.successDotLegend} /><span>Successful</span><b>₹ {money(successful)}</b></div>
        <div><span className={styles.pendingDotLegend} /><span>Pending</span><b>₹ {money(pending)}</b></div>
      </div>
    </div>
  );
}

export function Dashboard({ saved, products, ledgerEntries, onNew, onOpen }: Props) {
  const [range, setRange] = useState<Range>('month');
  const [status, setStatus] = useState<StatusFilter>('all');
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth()));
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const years = useMemo(() => { const set = new Set(saved.map(x => localDate(x.meta.date).getFullYear()).filter(Boolean)); set.add(now.getFullYear()); return Array.from(set).sort((a,b)=>b-a); }, [saved]);

  const filtered = useMemo(() => saved.filter((invoice) => {
    if (!inRange(invoice, range, Number(year), month, fromDate, toDate, now)) return false;
    if (status === 'pending') return invoice.paymentStatus === 'Pending';
    if (status === 'successful') return invoice.paymentStatus === 'Successful';
    return true;
  }), [saved, range, status, year, month, fromDate, toDate]);

  const revenue = filtered.reduce((sum, invoice) => sum + calc(invoice).grand, 0);
  const pendingAmount = filtered.filter((invoice) => invoice.paymentStatus === 'Pending').reduce((sum, invoice) => sum + calc(invoice).grand, 0);
  const successfulAmount = filtered.filter((invoice) => invoice.paymentStatus === 'Successful').reduce((sum, invoice) => sum + calc(invoice).grand, 0);
  const collected = ledgerEntries.filter((entry) => {
    const d = localDate(entry.date);
    if (range === 'all') return true;
    return range === 'year' ? d.getFullYear() === now.getFullYear() : d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).reduce((sum, entry) => sum + Math.max(0, entry.amount || 0), 0);

  const months = useMemo(() => monthSeries(saved, products, Number(year), fromDate, toDate), [saved, products, year, fromDate, toDate]);
  const itemSales = useMemo(() => {
    const map = new Map<string, { quantity: number; amount: number }>();
    filtered.forEach((invoice) => invoice.items.forEach((item) => {
      const name = item.description.trim() || 'Unnamed item';
      const current = map.get(name) || { quantity: 0, amount: 0 };
      current.quantity += Math.max(0, item.quantity);
      current.amount += Math.max(0, item.quantity) * Math.max(0, item.rate);
      map.set(name, current);
    }));
    return Array.from(map.entries()).map(([name, value]) => ({ name, ...value })).sort((a, b) => b.amount - a.amount).slice(0, 6);
  }, [filtered]);

  const recent = [...filtered].sort((a, b) => localDate(b.meta.date).getTime() - localDate(a.meta.date).getTime()).slice(0, 7);
  const rangeLabel = fromDate || toDate ? `${fromDate || 'Start'} → ${toDate || 'Today'}` : month !== '' ? `${MONTHS[Number(month)]} ${year}` : range === 'month' ? 'This month' : range === 'year' ? `Year ${year}` : 'All time';
  const previousRevenue = useMemo(() => {
    if (range === 'all') return 0;
    const previous = new Date(now);
    if (range === 'month') previous.setMonth(previous.getMonth() - 1);
    else previous.setFullYear(previous.getFullYear() - 1);
    return saved.filter((invoice) => {
      const d = localDate(invoice.meta.date);
      return range === 'month' ? d.getFullYear() === previous.getFullYear() && d.getMonth() === previous.getMonth() : d.getFullYear() === previous.getFullYear();
    }).reduce((sum, invoice) => sum + calc(invoice).grand, 0);
  }, [saved, range, now]);
  const changePct = previousRevenue ? ((revenue - previousRevenue) / previousRevenue) * 100 : null;

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>DEAL MAGSIL · BUSINESS OVERVIEW</div>
          <h1>Your billing, at a glance.</h1>
          <p>See revenue, collections, pending receivables and product performance without opening every bill.</p>
        </div>
        <button className={styles.primary} onClick={onNew}>＋ Create new bill</button>
      </div>

      <div className={styles.filterCard}>
        <div className={styles.filterHead}><div><span>ANALYTICS FILTERS</span><strong>{rangeLabel}</strong></div><button className={styles.clearButton} onClick={() => { setRange('month'); setYear(String(now.getFullYear())); setMonth(String(now.getMonth())); setFromDate(''); setToDate(''); setStatus('all'); }}>Reset</button></div>
        <div className={styles.filters}>
          <label><span>Period</span><select value={range} onChange={e => { const v=e.target.value as Range; setRange(v); if(v==='all') setMonth(''); }}><option value="month">Current month</option><option value="year">Full year</option><option value="all">All data</option></select></label>
          <label><span>Year</span><select value={year} onChange={e => setYear(e.target.value)}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></label>
          <label><span>Month</span><select value={month} onChange={e => setMonth(e.target.value)}><option value="">All months</option>{MONTHS.map((m,i)=><option key={m} value={i}>{m}</option>)}</select></label>
          <label><span>From date</span><input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} /></label>
          <label><span>To date</span><input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} /></label>
          <label><span>Status</span><select value={status} onChange={e=>setStatus(e.target.value as StatusFilter)}><option value="all">All status</option><option value="successful">Successful</option><option value="pending">Pending</option></select></label>
        </div>
      </div>

      <div className={styles.stats}>
        <Metric label="Invoiced" value={`₹ ${money(revenue)}`} note={changePct === null ? 'No prior period' : `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}% vs prior period`} positive={changePct === null || changePct >= 0} />
        <Metric label="Collected" value={`₹ ${money(collected)}`} note="Ledger receipts" positive />
        <Metric label="Pending" value={`₹ ${money(pendingAmount)}`} note={`${filtered.filter(i => i.paymentStatus === 'Pending').length} unpaid bills`} />
        <Metric label="Successful" value={`₹ ${money(successfulAmount)}`} note={`${filtered.filter(i => i.paymentStatus === 'Successful').length} successful bills`} positive />
      </div>

      <div className={styles.primaryGrid}>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.kicker}>PERFORMANCE</span><h2>Revenue & collection</h2><p>Monthly invoice value compared with successful payments.</p></div><strong>₹ {money(revenue)}</strong></div>
          <LineChart data={months} />
        </section>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.kicker}>RECEIVABLES</span><h2>Payment status</h2><p>Amount split, not just invoice count.</p></div></div>
          <DonutChart successful={successfulAmount} pending={pendingAmount} />
        </section>
      </div>

      <div className={styles.secondaryGrid}>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.kicker}>PRODUCT MIX</span><h2>What is selling</h2><p>Top products by billed value for {rangeLabel.toLowerCase()}.</p></div></div>
          {itemSales.length ? <div className={styles.productBars}>{itemSales.map((item, index) => { const max = itemSales[0].amount || 1; return <div className={styles.productRow} key={item.name}><div><span>{index + 1}</span><b title={item.name}>{item.name}</b><em>{item.quantity} units</em></div><strong>₹ {money(item.amount)}</strong><div className={styles.barTrack}><i style={{ width: `${Math.max(4, item.amount / max * 100)}%` }} /></div></div>; })}</div> : <Empty text="No product sales in this period." />}
        </section>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.kicker}>PROFIT / LOSS</span><h2>Monthly gross profit</h2><p>Sales value minus product cost. Taxes are excluded from margin.</p></div><strong>₹ {money(months.reduce((sum, m) => sum + m.profit, 0))}</strong></div>
          {products.some((p) => typeof p.costPrice === 'number' && p.costPrice > 0) ? <ProfitChart data={months} /> : <div className={styles.marginEmpty}><div>₹</div><strong>Add product cost prices</strong><span>Enter cost price in Product Master to unlock a true gross-profit / loss view. This prevents the dashboard from pretending revenue is profit.</span></div>}
        </section>
      </div>

      <div className={styles.bottomGrid}>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.kicker}>ACTIVITY</span><h2>Recent bills</h2><p>Open any invoice directly.</p></div></div>
          {recent.length ? recent.map((invoice) => <button className={styles.recent} key={invoice.id} onClick={() => onOpen(invoice.id)}><span><b>{invoice.meta.invoiceNo}</b><small>{invoice.buyer.name || invoice.consignee.name || 'No customer'} · {dateDisplay(invoice.meta.date)}</small></span><span className={styles.recentRight}><strong>₹ {money(calc(invoice).grand)}</strong><i className={invoice.paymentStatus === 'Successful' ? styles.successBadge : styles.pendingBadge}>{invoice.paymentStatus}</i></span></button>) : <Empty text="No bills match this filter." />}
        </section>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.kicker}>QUICK INSIGHTS</span><h2>Business snapshot</h2><p>Useful signals from the data already in your billing system.</p></div></div>
          <div className={styles.insights}>
            <Insight label="Average bill" value={`₹ ${money(filtered.length ? revenue / filtered.length : 0)}`} />
            <Insight label="Collection ratio" value={`${revenue ? Math.round(collected / revenue * 100) : 0}%`} />
            <Insight label="Products active" value={products.filter(p => p.active).length} />
            <Insight label="Customers" value="From customer master" muted />
          </div>
        </section>
      </div>
    </section>
  );
}

function Metric({ label, value, note, positive }: { label: string; value: string; note: string; positive?: boolean }) {
  return <div className={styles.metric}><span>{label}</span><strong>{value}</strong><small className={positive ? styles.good : ''}>{note}</small></div>;
}

function Insight({ label, value, muted }: { label: string; value: string | number; muted?: boolean }) {
  return <div className={styles.insight}><span>{label}</span><strong className={muted ? styles.muted : ''}>{value}</strong></div>;
}

function Empty({ text }: { text: string }) { return <div className={styles.empty}>{text}</div>; }

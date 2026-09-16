'use client';
import styles from "./Products.module.css";
import { useMemo, useState } from 'react';
import { Field } from '@/components/common/Field';
import { Product } from '@/types';

type Props = { products: Product[]; onSave: (product: Product) => Promise<void>; onDelete: (id: string) => Promise<void> };
const blank = (): Product => ({ id: '', name: '', hsn: '', unit: 'Pcs', rate: 0, costPrice: 0, gstRate: 18, category: 'Precast', active: true });

export function Products({ products, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState<Product>(blank());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const visible = useMemo(() => products.slice((page - 1) * pageSize, page * pageSize), [products, page]);

  const submit = async () => {
    if (!draft.name.trim() || busy) return;
    setBusy(true);
    try { await onSave({ ...draft, id: draft.id || crypto.randomUUID(), name: draft.name.trim() }); setDraft(blank()); setEditingId(null); }
    finally { setBusy(false); }
  };
  const edit = (product: Product) => { setEditingId(product.id); setDraft({ ...product }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const remove = async (id: string) => { if (!window.confirm('Delete this product?')) return; setBusy(true); try { await onDelete(id); if (page > 1 && visible.length === 1) setPage(page - 1); } finally { setBusy(false); } };

  return <section className={styles["page"]}>
    <div className={styles["page-title"]}><div><p className={styles["eyebrow"]}>PRODUCT MASTER</p><h1>Deal Magsil Products</h1><p>Select these items directly while making a bill.</p></div></div>
    <div className={`${styles["product-add"]} ${styles["panel"]}`}>
      <Field label="Product Name" value={draft.name} onChange={v=>setDraft({...draft,name:v})}/>
      <Field label="HSN" value={draft.hsn} onChange={v=>setDraft({...draft,hsn:v})}/>
      <Field label="Unit" value={draft.unit} onChange={v=>setDraft({...draft,unit:v})}/>
      <Field label="Selling Rate" value={draft.rate} onChange={v=>setDraft({...draft,rate:Number(v)})}/>
      <Field label="Cost Price" value={draft.costPrice ?? 0} onChange={v=>setDraft({...draft,costPrice:Number(v)})}/>
      <Field label="GST %" value={draft.gstRate} onChange={v=>setDraft({...draft,gstRate:Number(v)})}/>
      <Field label="Category" value={draft.category} onChange={v=>setDraft({...draft,category:v})}/>
      <button className={styles["primary"]} disabled={busy} onClick={submit}>{editingId ? 'Update Product' : 'Add Product'}</button>
      {editingId && <button onClick={()=>{setEditingId(null);setDraft(blank())}}>Cancel</button>}
    </div>
    <div className={styles["table-card"]}><table><thead><tr><th>Product</th><th>Category</th><th>HSN</th><th>Unit</th><th>Sell</th><th>Cost</th><th>GST</th><th>Active</th><th>Actions</th></tr></thead><tbody>
      {visible.map(p=><tr key={p.id}><td>{p.name}</td><td>{p.category}</td><td>{p.hsn}</td><td>{p.unit}</td><td>₹ {p.rate.toFixed(2)}</td><td>₹ {(p.costPrice ?? 0).toFixed(2)}</td><td>{p.gstRate}%</td><td>{p.active?'Yes':'No'}</td><td><button onClick={()=>edit(p)}>Edit</button> <button className={styles["danger"]} disabled={busy} onClick={()=>remove(p.id)}>Delete</button></td></tr>)}
    </tbody></table></div>
    {products.length > pageSize && <div className={styles["pagination"]}><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page} of {totalPages}</span><button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>Next</button></div>}
  </section>;
}

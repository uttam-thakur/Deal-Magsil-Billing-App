"use client";
import styles from "./Billing.module.css";
import { Dispatch, SetStateAction } from "react";
import { Field } from "@/components/common/Field";
import { money } from "@/lib/format";
import { calc } from "@/lib/billing";
import { CompanySettings, Invoice, Item, Party, Product } from "@/types";
import { PartyBox } from "@/components/billing/PartyBox";

export function Billing({
  invoice,
  setInvoice,
  products,
  totals,
  company,
  onNew,
  onSave,
  onPrint,
  updateItem,
  chooseProduct,
  partySet,
  saveCustomer,
}: {
  invoice: Invoice;
  setInvoice: Dispatch<SetStateAction<Invoice>>;
  products: Product[];
  totals: ReturnType<typeof calc>;
  company: CompanySettings;
  onNew: () => void;
  onSave: () => void;
  onPrint: () => void;
  updateItem: (id: string, key: keyof Item, value: string) => void;
  chooseProduct: (id: string, p: string) => void;
  partySet: (w: "buyer" | "consignee", p: Party) => void;
  saveCustomer: (p: Party) => void;
}) {
  const addItem = () =>
    setInvoice((v) => ({
      ...v,
      items: [
        ...v.items,
        {
          id: crypto.randomUUID(),
          productId: "",
          description: "",
          hsn: "",
          quantity: 1,
          unit: "Pcs",
          rate: 0,
          gstRate: 18,
        },
      ],
    }));
  return (
    <div className={styles["billing-layout"]}>
      <aside className={styles["controls"]}>
        <div className={styles["control-card"]}>
          <h3>Bill Type</h3>
          <div className={styles["seg"]}>
            <button
              className={invoice.mode === "GST" ? styles["selected"] : ""}
              onClick={() => setInvoice({ ...invoice, mode: "GST" })}
            >
              GST Bill
            </button>
            <button
              className={invoice.mode === "NON_GST" ? styles["selected"] : ""}
              onClick={() => setInvoice({ ...invoice, mode: "NON_GST" })}
            >
              Non-GST
            </button>
          </div>
          {invoice.mode === "GST" && (
            <>
              <h3>Tax Type</h3>
              <div className={styles["seg"]}>
                <button
                  className={invoice.taxMode === "INTRA" ? styles["selected"] : ""}
                  onClick={() => setInvoice({ ...invoice, taxMode: "INTRA" })}
                >
                  CGST + SGST
                </button>
                <button
                  className={invoice.taxMode === "INTER" ? styles["selected"] : ""}
                  onClick={() => setInvoice({ ...invoice, taxMode: "INTER" })}
                >
                  IGST
                </button>
              </div>
            </>
          )}
          <h3>Invoice Details</h3>
          <Field
            label="Invoice No"
            value={invoice.meta.invoiceNo}
            onChange={(v) =>
              setInvoice({
                ...invoice,
                meta: { ...invoice.meta, invoiceNo: v },
              })
            }
          />
          <Field
            label="Date"
            type="date"
            value={invoice.meta.date}
            onChange={(v) =>
              setInvoice({ ...invoice, meta: { ...invoice.meta, date: v } })
            }
          />
          <Field
            label="Terms of Payment"
            value={invoice.meta.termsOfPayment}
            onChange={(v) =>
              setInvoice({
                ...invoice,
                meta: { ...invoice.meta, termsOfPayment: v },
              })
            }
          />
          <Field
            label="Buyer Order No"
            value={invoice.meta.buyerOrderNo}
            onChange={(v) =>
              setInvoice({
                ...invoice,
                meta: { ...invoice.meta, buyerOrderNo: v },
              })
            }
          />
          <Field
            label="Buyer Order Date"
            type="date"
            value={invoice.meta.buyerOrderDate}
            onChange={(v) =>
              setInvoice({
                ...invoice,
                meta: { ...invoice.meta, buyerOrderDate: v },
              })
            }
          />
          <Field
            label="Destination"
            value={invoice.meta.destination}
            onChange={(v) =>
              setInvoice({
                ...invoice,
                meta: { ...invoice.meta, destination: v },
              })
            }
          />
          <label className={styles["field"]}>
            <span>Payment Status</span>
            <select
              value={invoice.paymentStatus}
              onChange={(e) =>
                setInvoice({
                  ...invoice,
                  paymentStatus: e.target.value as Invoice["paymentStatus"],
                })
              }
            >
              <option value="Pending">Pending</option>
              <option value="Successful">Successful</option>
            </select>
          </label>
          <div className={styles["actions"]}>
  {(() => {
    // Bill can only be saved when at least one item
    // has been added to the invoice.
    const hasValidItems = invoice.items.some(
  (item) =>
    item.description.trim() !== "" &&
    Number(item.quantity) > 0 &&
    Number(item.rate) > 0
);
    return (
      <button
  type="button"
  className={styles["primary"]}
  disabled={!hasValidItems}
  title={
    !hasValidItems
      ? "Add at least one valid item before saving the bill."
      : "Save bill"
  }
  onClick={() => {
    if (!hasValidItems) return;
    onSave();
  }}
>
  Save Bill
</button>
    );
  })()}

  <button
    type="button"
    onClick={onPrint}
  >
    Print / Save PDF
  </button>

  <button
    type="button"
    onClick={onNew}
  >
    New Bill
  </button>
</div>
        </div>
      </aside>
      <section className={styles["editor"]}>
        <div className={styles["editor-head"]}>
          <div>
            <p className={styles["eyebrow"]}>A4 INVOICE EDITOR</p>
            <h2>{invoice.mode === "GST" ? "Tax Invoice" : "Invoice"}</h2>
          </div>
          <span>
            Format follows the uploaded A2Z-style invoice structure, rebranded
            for Deal Magsil.
          </span>
        </div>
        <PartyBox
          title="Consignee (Ship to)"
          party={invoice.consignee}
          onChange={(p) => partySet("consignee", p)}
          onSave={saveCustomer}
        />
        <PartyBox
          title="Buyer (Bill to)"
          party={invoice.buyer}
          onChange={(p) => partySet("buyer", p)}
          onSave={saveCustomer}
          sameAsConsignee={invoice.buyerSameAsConsignee}
          onSameAsConsigneeChange={(checked) => {
            if (checked)
              setInvoice((v) => ({
                ...v,
                buyer: { ...v.consignee },
                buyerSameAsConsignee: true,
              }));
            else setInvoice((v) => ({ ...v, buyerSameAsConsignee: false }));
          }}
        />
        <section className={styles["items-editor"]}>
          <div className={styles["section-title"]}>Description of Goods</div>
          <div className={styles["item-head"]}>
            <span>#</span>
            <span>Product / Description</span>
            <span>HSN</span>
            <span>Qty</span>
            <span>Unit</span>
            <span>Rate</span>
            <span>GST</span>
            <span></span>
          </div>
          {invoice.items.map((i, idx) => (
            <div className={styles["item-row"]} key={i.id}>
              <span>{idx + 1}</span>
              <div className={styles["product-cell"]}>
                <select
                  value={i.productId || ""}
                  onChange={(e) => chooseProduct(i.id, e.target.value)}
                >
                  <option value="">Custom item…</option>
                  {products
                    .filter((p) => p.active)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
                <input
                  value={i.description}
                  onChange={(e) =>
                    updateItem(i.id, "description", e.target.value)
                  }
                  placeholder="Cement Block / RCC Pillar"
                />
              </div>
              <input
                value={i.hsn}
                onChange={(e) => updateItem(i.id, "hsn", e.target.value)}
                placeholder="HSN"
              />
              <input
                type="number"
                min="0"
                value={i.quantity}
                onChange={(e) => updateItem(i.id, "quantity", e.target.value)}
              />
              <input
                value={i.unit}
                onChange={(e) => updateItem(i.id, "unit", e.target.value)}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={i.rate}
                onChange={(e) => updateItem(i.id, "rate", e.target.value)}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                disabled={invoice.mode === "NON_GST"}
                value={i.gstRate}
                onChange={(e) => updateItem(i.id, "gstRate", e.target.value)}
              />
              <button
                className={styles["danger"]}
                onClick={() =>
                  setInvoice({
                    ...invoice,
                    items: invoice.items.filter((x) => x.id !== i.id),
                  })
                }
              >
                ×
              </button>
            </div>
          ))}
          <button className={styles["add"]} onClick={addItem}>
            ＋ Add Item
          </button>
          <div className={styles["item-total"]}>
            <span>Taxable Value</span>
            <b>₹ {money(totals.subtotal)}</b>
            <span>GST</span>
            <b>₹ {money(totals.tax)}</b>
            <span>Grand Total</span>
            <b>₹ {money(totals.grand)}</b>
          </div>
        </section>
        <div className={styles["extra-grid"]}>
          <Field
            label="Delivery Note"
            value={invoice.meta.deliveryNote}
            onChange={(v) =>
              setInvoice({
                ...invoice,
                meta: { ...invoice.meta, deliveryNote: v },
              })
            }
          />
          <Field
            label="Delivery Note Date"
            type="date"
            value={invoice.meta.deliveryNoteDate}
            onChange={(v) =>
              setInvoice({
                ...invoice,
                meta: { ...invoice.meta, deliveryNoteDate: v },
              })
            }
          />
          <Field
            label="Dispatched Through"
            value={invoice.meta.dispatchedThrough}
            onChange={(v) =>
              setInvoice({
                ...invoice,
                meta: { ...invoice.meta, dispatchedThrough: v },
              })
            }
          />
          <Field
            label="Reference No."
            value={invoice.meta.referenceNo}
            onChange={(v) =>
              setInvoice({
                ...invoice,
                meta: { ...invoice.meta, referenceNo: v },
              })
            }
          />
          <Field
            label="Reference Date"
            type="date"
            value={invoice.meta.referenceDate}
            onChange={(v) =>
              setInvoice({
                ...invoice,
                meta: { ...invoice.meta, referenceDate: v },
              })
            }
          />
          <Field
            label="Other References"
            value={invoice.meta.otherReferences}
            onChange={(v) =>
              setInvoice({
                ...invoice,
                meta: { ...invoice.meta, otherReferences: v },
              })
            }
          />
          <Field
            label="Dispatch Doc No."
            value={invoice.meta.dispatchDocNo}
            onChange={(v) =>
              setInvoice({
                ...invoice,
                meta: { ...invoice.meta, dispatchDocNo: v },
              })
            }
          />
          <Field
            label="Terms of Delivery"
            value={invoice.meta.termsOfDelivery}
            onChange={(v) =>
              setInvoice({
                ...invoice,
                meta: { ...invoice.meta, termsOfDelivery: v },
              })
            }
          />
        </div>
        <section className={styles["terms-editor"]}>
          <div className={styles["section-title"]}>
            Terms &amp; Conditions{" "}
            <span className={styles["optional-label"]}>
              (Optional — add up to 5 bullet points)
            </span>
          </div>
          <div className={styles["terms-fields"]}>
            {invoice.meta.termsAndConditions.map((term, idx) => (
              <Field
                key={idx}
                label={`Bullet ${idx + 1}`}
                value={term}
                onChange={(v) =>
                  setInvoice({
                    ...invoice,
                    meta: {
                      ...invoice.meta,
                      termsAndConditions: invoice.meta.termsAndConditions.map(
                        (x, i) => (i === idx ? v : x),
                      ),
                    },
                  })
                }
                placeholder={
                  idx < 3 ? "Optional term…" : "Additional optional term…"
                }
              />
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}

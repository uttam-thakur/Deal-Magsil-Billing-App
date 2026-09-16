"use client";
import styles from "./Customers.module.css";
import { useEffect, useMemo, useState } from "react";
import { Field } from "@/components/common/Field";
import { Customer } from "@/types";

type Props = {
  customers: Customer[];
  onSave: (customer: Customer) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUse: (p: Customer) => void;
};
const blank = (): Customer => ({
  id: "",
  name: "",
  address: "",
  contact: "",
  gstin: "",
  state: "WEST BENGAL",
  stateCode: "19",
});
export function Customers({ customers, onSave, onDelete, onUse }: Props) {
  const [draft, setDraft] = useState<Customer>(blank());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(customers.length / pageSize));
  const visible = useMemo(
    () => customers.slice((page - 1) * pageSize, page * pageSize),
    [customers, page],
  );
  const submit = async () => {
    if (!draft.name.trim() || busy) return;
    setBusy(true);
    try {
      await onSave({
        ...draft,
        id: draft.id || crypto.randomUUID(),
        name: draft.name.trim(),
      });
      setDraft(blank());
      setEditingId(null);
    } finally {
      setBusy(false);
    }
  };
  const edit = (c: Customer) => {
    setEditingId(c.id);
    setDraft({ ...c });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const remove = async (id: string) => {
    if (!window.confirm("Delete this customer?")) return;
    setBusy(true);
    try {
      await onDelete(id);
      if (page > 1 && visible.length === 1) setPage((p) => p - 1);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={styles["page"]}>
      <div className={styles["page-title"]}>
        <div>
          <p className={styles["eyebrow"]}>CUSTOMER MASTER</p>
          <h1>Customers</h1>
        </div>
      </div>
      <div className={`${styles["customer-form"]} ${styles["panel"]}`}>
        <Field
          label="Name"
          value={draft.name}
          onChange={(v) => setDraft({ ...draft, name: v })}
        />
        <Field
          label="Contact"
          value={draft.contact}
          onChange={(v) => setDraft({ ...draft, contact: v })}
        />
        <Field
          label="GSTIN"
          value={draft.gstin}
          onChange={(v) => setDraft({ ...draft, gstin: v })}
        />
        <Field
          label="State"
          value={draft.state}
          onChange={(v) => setDraft({ ...draft, state: v })}
        />
        <Field
          label="State Code"
          value={draft.stateCode}
          onChange={(v) => setDraft({ ...draft, stateCode: v })}
        />
        <label className={`${styles["field"]} ${styles["full"]}`}>
          <span>Address</span>
          <textarea
            value={draft.address}
            onChange={(e) => setDraft({ ...draft, address: e.target.value })}
          />
        </label>
        <button className={styles["primary"]} disabled={busy} onClick={submit}>
          {editingId ? "Update Customer" : "Save Customer"}
        </button>
        {editingId && (
          <button
            onClick={() => {
              setEditingId(null);
              setDraft(blank());
            }}
          >
            Cancel
          </button>
        )}
      </div>
      <div className={styles["customer-grid"]}>
        {visible.length === 0 ? (
          <div className={styles["empty"]}>No saved customers.</div>
        ) : (
          visible.map((c) => (
            <div className={styles["customer-card"]} key={c.id}>
              <b>{c.name}</b>
              <span>{c.contact}</span>
              <span>{c.gstin || "No GSTIN"}</span>
              <small>{c.address}</small>
              <div>
                <button className={styles["primary"]} onClick={() => onUse(c)}>
                  Use in Bill
                </button>
                <button onClick={() => edit(c)}>Edit</button>
                <button
                  className={styles["danger"]}
                  disabled={busy}
                  onClick={() => remove(c.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {customers.length > pageSize && (
        <div className={styles["pagination"]}>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}

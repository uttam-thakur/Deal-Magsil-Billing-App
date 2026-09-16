'use client';
import styles from "./PartyBox.module.css";
import { Field } from '@/components/common/Field';
import { Party } from '@/types';

export function PartyBox({
  title,
  party,
  onChange,
  onSave,
  sameAsConsignee = false,
  onSameAsConsigneeChange,
}: {
  title: string;
  party: Party;
  onChange: (p: Party) => void;
  onSave: (p: Party) => void;
  sameAsConsignee?: boolean;
  onSameAsConsigneeChange?: (checked: boolean) => void;
}) {
  const set = (k: keyof Party, v: string) => onChange({ ...party, [k]: v });
  const isBuyer = title.startsWith('Buyer');

  return (
    <section className={`${styles["party"]} ${sameAsConsignee ? styles["linked-party"] : ""}`}>
      <div className={`${styles["section-title"]} ${styles["party-title"]}`}>
        <span>{title}</span>
        {isBuyer && onSameAsConsigneeChange && (
          <label className={styles["same-check"]}>
            <input
              type="checkbox"
              checked={sameAsConsignee}
              onChange={(e) => onSameAsConsigneeChange(e.target.checked)}
            />{' '}
            Same as Consignee (Ship to)
          </label>
        )}
      </div>
      <div className={styles["grid2"]}>
        <Field label="Name" value={party.name} onChange={(v) => set('name', v)} />
        <Field label="Contact No" value={party.contact} onChange={(v) => set('contact', v)} />
        <Field label="GSTIN / UIN" value={party.gstin} onChange={(v) => set('gstin', v)} />
        <Field label="State" value={party.state} onChange={(v) => set('state', v)} />
        <Field label="State Code" value={party.stateCode} onChange={(v) => set('stateCode', v)} />
        <label className={`${styles["field"]} ${styles["full"]}`}>
          <span>Address</span>
          <textarea
            disabled={sameAsConsignee}
            value={party.address}
            onChange={(e) => set('address', e.target.value)}
          />
        </label>
      </div>
      <div className={styles["party-actions"]}>
        {party.name.trim() && (
          <button className={styles["save-mini"]} onClick={() => onSave(party)}>
            ＋ Save customer only
          </button>
        )}
        {sameAsConsignee && <span className={styles["same-note"]}>Buyer details are linked to Consignee.</span>}
      </div>
    </section>
  );
}

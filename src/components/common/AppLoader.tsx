'use client';

import styles from './AppLoader.module.css';

export function AppLoader({ label = 'Loading…', overlay = false }: { label?: string; overlay?: boolean }) {
  return (
    <div className={overlay ? styles.overlay : styles.page} role="status" aria-live="polite" aria-label={label}>
      <span className={styles.spinner} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </div>
  );
}

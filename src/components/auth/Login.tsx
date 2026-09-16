'use client';
import styles from "./Login.module.css";
import { useState, type FormEvent } from 'react';
import { login } from '@/lib/cloudApi';

export function Login({ onLoggedIn }: { onLoggedIn: (user: { username: string }) => void }) {
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (!url.trim()) return setError('Paste the Google Apps Script Web App URL first.');
    if (!username.trim() || !password) return setError('Enter username and password.');
    setBusy(true);
    try { onLoggedIn(await login(url.trim(), username.trim(), password)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Login failed.'); }
    finally { setBusy(false); }
  };
  return <main className={styles["login-shell"]}><form className={styles["login-card"]} onSubmit={submit}>
    <div className={`${styles["brand"]} ${styles["login-brand"]}`}><div>DEAL MAGSIL</div><small>Precast Concrete &amp; Paving Solutions</small></div>
    <p className={styles["eyebrow"]}>CLOUD BILLING LOGIN</p><h1>Sign in to Billing</h1>
    <p className={styles["muted"]}>Bills, customers, products and company settings are stored in your Google Sheet. Nothing is saved in browser localStorage.</p>
    <label className={styles["field"]}><span>Google Sheets Web App URL</span><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" /></label>
    <label className={styles["field"]}><span>Username</span><input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" /></label>
    <label className={styles["field"]}><span>Password</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" /></label>
    {error && <p className={styles["error-message"]}>{error}</p>}
    <button className={`${styles["primary"]} ${styles["big"]}`} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    <p className={styles["login-note"]}>Initial credentials and Google Sheet setup are documented in the bundled Google Apps Script README.</p>
  </form></main>;
}

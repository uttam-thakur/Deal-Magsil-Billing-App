// "use client";

// import styles from "./Home.module.css";
// import dynamic from "next/dynamic";
// import {
//   useCallback,
//   useEffect,
//   useMemo,
//   useState,
//   startTransition,
// } from "react";
// import toast, { Toaster } from "react-hot-toast";
// const Dashboard = dynamic(
//   () => import("@/components/dashboard/Dashboard").then((m) => m.Dashboard),
//   { loading: () => <AppLoader label="Loading dashboard…" /> },
// );
// const Billing = dynamic(
//   () => import("@/components/billing/Billing").then((m) => m.Billing),
//   { loading: () => <AppLoader label="Opening bill editor…" /> },
// );
// const Invoices = dynamic(
//   () => import("@/components/invoices/Invoices").then((m) => m.Invoices),
//   { loading: () => <AppLoader label="Loading bills…" /> },
// );
// const Ledger = dynamic(
//   () => import("@/components/ledger/Ledger").then((m) => m.Ledger),
//   { loading: () => <AppLoader label="Loading ledger…" /> },
// );
// const Products = dynamic(
//   () => import("@/components/products/Products").then((m) => m.Products),
//   { loading: () => <AppLoader label="Loading products…" /> },
// );
// const Customers = dynamic(
//   () => import("@/components/customers/Customers").then((m) => m.Customers),
//   { loading: () => <AppLoader label="Loading customers…" /> },
// );
// const Settings = dynamic(
//   () => import("@/components/settings/Settings").then((m) => m.Settings),
//   { loading: () => <AppLoader label="Loading company settings…" /> },
// );
// const InvoicePreview = dynamic(() =>
//   import("@/components/invoice/InvoicePreview").then((m) => m.InvoicePreview),
// );
// const BillPreviewModal = dynamic(() =>
//   import("@/components/invoice/BillPreviewModal").then(
//     (m) => m.BillPreviewModal,
//   ),
// );
// import { Login } from "@/components/auth/Login";
// import { AppLoader } from "@/components/common/AppLoader";
// import {
//   companyDefaults,
//   createInvoice,
//   emptyParty,
//   starterProducts,
// } from "@/lib/defaults";
// import { calc, normalizeInvoice } from "@/lib/billing";
// import {
//   bootstrap,
//   clearCloudSession,
//   getCloudUrl,
//   getStamp,
//   getToken,
//   nextInvoiceNumber,
//   saveEntity,
// } from "@/lib/cloudApi";
// import {
//   CompanySettings,
//   Customer,
//   Invoice,
//   Item,
//   LedgerEntry,
//   Party,
//   Product,
// } from "@/types";

// const Dashboard = dynamic(
//   () => import("@/components/dashboard/Dashboard").then((m) => m.Dashboard),
//   { loading: () => <AppLoader label="Loading dashboard…" /> },
// );
// const Billing = dynamic(
//   () => import("@/components/billing/Billing").then((m) => m.Billing),
//   { loading: () => <AppLoader label="Opening bill editor…" /> },
// );
// const Invoices = dynamic(
//   () => import("@/components/invoices/Invoices").then((m) => m.Invoices),
//   { loading: () => <AppLoader label="Loading bills…" /> },
// );
// const Ledger = dynamic(
//   () => import("@/components/ledger/Ledger").then((m) => m.Ledger),
//   { loading: () => <AppLoader label="Loading ledger…" /> },
// );
// const Products = dynamic(
//   () => import("@/components/products/Products").then((m) => m.Products),
//   { loading: () => <AppLoader label="Loading products…" /> },
// );
// const Customers = dynamic(
//   () => import("@/components/customers/Customers").then((m) => m.Customers),
//   { loading: () => <AppLoader label="Loading customers…" /> },
// );
// const Settings = dynamic(
//   () => import("@/components/settings/Settings").then((m) => m.Settings),
//   { loading: () => <AppLoader label="Loading company settings…" /> },
// );
// const InvoicePreview = dynamic(() =>
//   import("@/components/invoice/InvoicePreview").then((m) => m.InvoicePreview),
// );
// const BillPreviewModal = dynamic(() =>
//   import("@/components/invoice/BillPreviewModal").then(
//     (m) => m.BillPreviewModal,
//   ),
// );

// type Tab =
//   | "dashboard"
//   | "billing"
//   | "invoices"
//   | "ledger"
//   | "products"
//   | "customers"
//   | "settings";

// type CloudState = {
//   company: CompanySettings;
//   products: Product[];
//   customers: Customer[];
//   invoices: Invoice[];
//   ledgerEntries: LedgerEntry[];
//   user: { username: string };
// };

// const emptyCloud: CloudState = {
//   company: companyDefaults,
//   products: starterProducts,
//   customers: [],
//   invoices: [],
//   ledgerEntries: [],
//   user: { username: "" },
// };

// export default function Home() {
//   const [tab, setTab] = useState<Tab>("dashboard");
//   const [cloud, setCloud] = useState<CloudState>(emptyCloud);
//   const [invoice, setInvoice] = useState<Invoice>(() => createInvoice());
//   const [hydrated, setHydrated] = useState(false);
//   const [search, setSearch] = useState("");
//   const [error, setError] = useState("");
//   const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
//   const [busy, setBusy] = useState(false);
//   const [busyLabel, setBusyLabel] = useState("Working…");

//   const runBusy = useCallback(
//     async <T,>(label: string, task: () => Promise<T>) => {
//       setBusy(true);
//       setBusyLabel(label);
//       try {
//         return await task();
//       } finally {
//         setBusy(false);
//       }
//     },
//     [],
//   );

//   const loadCloud = useCallback(async () => {
//     const data = await bootstrap();
//     const company = { ...companyDefaults, ...data.company };
//     setCloud({
//       company,
//       products: data.products,
//       customers: data.customers,
//       invoices: data.invoices.map(normalizeInvoice),
//       ledgerEntries: data.ledgerEntries || [],
//       user: data.user,
//     });
//     setHydrated(true);
//     try {
//       if (company.stampDriveFileId && !company.stampImage) {
//         const stamp = await getStamp();
//         if (stamp?.url) {
//           const nextCompany = {
//             ...company,
//             stampImage: stamp.url,
//             stampDriveFileId: stamp.fileId,
//             stampDriveFolderId: stamp.folderId,
//           };
//           setCloud((current) => ({ ...current, company: nextCompany }));
//         }
//       }
//     } catch (_) {}
//   }, []);

//   useEffect(() => {
//     if (!getToken() || !getCloudUrl()) {
//       setHydrated(true);
//       return;
//     }
//     loadCloud().catch((err) => {
//       clearCloudSession();
//       setError(err instanceof Error ? err.message : "Cloud session expired.");
//       setHydrated(true);
//     });
//   }, [loadCloud]);

//   const onLoggedIn = async () => {
//     setError("");
//     try {
//       await runBusy("Loading your workspace…", loadCloud);
//       startTransition(() => setTab("dashboard"));
//     } catch (err) {
//       clearCloudSession();
//       setError(
//         err instanceof Error ? err.message : "Unable to load cloud data.",
//       );
//     }
//   };

//   useEffect(() => {
//     const warm = () => {
//       void Promise.all([
//         import("@/components/billing/Billing"),
//         import("@/components/invoices/Invoices"),
//         import("@/components/ledger/Ledger"),
//         import("@/components/products/Products"),
//         import("@/components/customers/Customers"),
//         import("@/components/settings/Settings"),
//       ]);
//     };
//     const w = window as Window & {
//       requestIdleCallback?: (cb: () => void) => number;
//       cancelIdleCallback?: (id: number) => void;
//     };
//     if (w.requestIdleCallback) {
//       const id = w.requestIdleCallback(warm);
//       return () => w.cancelIdleCallback?.(id);
//     }
//     const id = window.setTimeout(warm, 1200);
//     return () => window.clearTimeout(id);
//   }, []);

//   const totals = useMemo(() => calc(invoice), [invoice]);

//   const newNumber = () => {
//     const now = new Date();
//     const year = now.getFullYear();
//     const fy =
//       now.getMonth() + 1 >= 4
//         ? `${String(year).slice(2)}-${String(year + 1).slice(2)}`
//         : `${String(year - 1).slice(2)}-${String(year).slice(2)}`;
//     const max = cloud.invoices.reduce((highest, current) => {
//       const number = Number(current.meta.invoiceNo.split("/").pop());
//       return Number.isFinite(number) ? Math.max(highest, number) : highest;
//     }, 0);
//     return `DM/${fy}/${String(max + 1).padStart(3, "0")}`;
//   };

//   const newBill = async () => {
//     try {
//       const number = await runBusy("Preparing new bill…", nextInvoiceNumber);
//       setInvoice(createInvoice(number));
//     } catch (_) {
//       setInvoice(createInvoice(newNumber()));
//     }
//     startTransition(() => setTab("billing"));
//   };
//   const findBill = (id: string) =>
//     cloud.invoices.find((item) => item.id === id);
//   const openBill = (id: string) => {
//     const existing = findBill(id);
//     if (!existing) return;
//     setInvoice(normalizeInvoice(existing));
//     startTransition(() => setTab("billing"));
//   };
//   const previewBill = (id: string) => {
//     const existing = findBill(id);
//     if (!existing) return;
//     setPreviewInvoice(normalizeInvoice(existing));
//   };
//   const printPreviewBill = () => {
//     if (!previewInvoice) return;
//     setInvoice(previewInvoice);
//     setPreviewInvoice(null);
//     window.setTimeout(() => window.print(), 100);
//   };

//   const saveBill = async () => {
//     setError("");
//     try {
//       await runBusy("Saving bill…", async () => {
//         await saveEntity("saveInvoice", invoice);
//       });
//       setCloud((current) => ({
//         ...current,
//         invoices: [
//           ...current.invoices.filter((i) => i.id !== invoice.id),
//           normalizeInvoice(invoice),
//         ],
//       }));
//       startTransition(() => setTab("invoices"));
//       toast.success(`Bill ${invoice.meta.invoiceNo} saved successfully.`);
//     } catch (err) {
//       const message =
//         err instanceof Error ? err.message : "Unable to save bill.";
//       setError(message);
//       toast.error(message);
//     }
//   };
//   const removeBill = async (id: string) => {
//     try {
//       await runBusy("Deleting bill…", async () => {
//         await saveEntity("deleteInvoice", { id });
//       });
//       setCloud((current) => ({
//         ...current,
//         invoices: current.invoices.filter((i) => i.id !== id),
//       }));
//       toast.success("Bill deleted.");
//     } catch (err) {
//       const message =
//         err instanceof Error ? err.message : "Unable to delete bill.";
//       setError(message);
//       toast.error(message);
//     }
//   };

//   const saveProduct = async (product: Product) => {
//     const duplicate = cloud.products.find(
//       (p) =>
//         p.id !== product.id &&
//         p.name.trim().toLowerCase() === product.name.trim().toLowerCase() &&
//         p.hsn.trim().toLowerCase() === product.hsn.trim().toLowerCase(),
//     );
//     if (duplicate) {
//       toast.error("A product with the same name and HSN already exists.");
//       throw new Error("Duplicate product.");
//     }
//     const isUpdate = cloud.products.some((p) => p.id === product.id);
//     try {
//       await runBusy(
//         isUpdate ? "Updating product…" : "Saving product…",
//         async () => {
//           await saveEntity("saveProduct", product);
//         },
//       );
//       setCloud((current) => ({
//         ...current,
//         products: [
//           ...current.products.filter((p) => p.id !== product.id),
//           product,
//         ],
//       }));
//       toast.success(isUpdate ? "Product updated." : "Product saved.");
//     } catch (err) {
//       const message =
//         err instanceof Error ? err.message : "Unable to save product.";
//       toast.error(message);
//       throw err;
//     }
//   };
//   const deleteProduct = async (id: string) => {
//     try {
//       await runBusy("Deleting product…", async () => {
//         await saveEntity("deleteProduct", { id });
//       });
//       setCloud((current) => ({
//         ...current,
//         products: current.products.filter((p) => p.id !== id),
//       }));
//       toast.success("Product deleted.");
//     } catch (err) {
//       const message =
//         err instanceof Error ? err.message : "Unable to delete product.";
//       toast.error(message);
//       throw err;
//     }
//   };

//   const updateItem = (id: string, key: keyof Item, value: string) =>
//     setInvoice((current) => ({
//       ...current,
//       items: current.items.map((item) =>
//         item.id === id
//           ? {
//               ...item,
//               [key]:
//                 key === "quantity" || key === "rate" || key === "gstRate"
//                   ? Number(value)
//                   : value,
//             }
//           : item,
//       ),
//     }));
//   const chooseProduct = (id: string, productId: string) => {
//     const product = cloud.products.find((item) => item.id === productId);
//     if (!product) return;
//     setInvoice((current) => ({
//       ...current,
//       items: current.items.map((item) =>
//         item.id === id
//           ? {
//               ...item,
//               productId: product.id,
//               description: product.name,
//               hsn: product.hsn,
//               unit: product.unit,
//               rate: product.rate,
//               gstRate: product.gstRate,
//             }
//           : item,
//       ),
//     }));
//   };

//   const companySet = (key: keyof CompanySettings, value: string) => {
//     setCloud((current) => ({
//       ...current,
//       company: { ...current.company, [key]: value },
//     }));
//   };
//   const saveCompany = async (company: CompanySettings) => {
//     try {
//       await runBusy("Saving company settings…", async () => {
//         await saveEntity("saveCompany", company);
//       });
//       setCloud((current) => ({ ...current, company }));
//       toast.success("Company settings updated.");
//     } catch (err) {
//       const message =
//         err instanceof Error ? err.message : "Unable to save company settings.";
//       setError(message);
//       toast.error(message);
//       throw err;
//     }
//   };

//   const partySet = (which: "buyer" | "consignee", party: Party) =>
//     setInvoice((current) => {
//       if (which === "consignee" && current.buyerSameAsConsignee)
//         return { ...current, consignee: party, buyer: { ...party } };
//       if (which === "buyer" && current.buyerSameAsConsignee)
//         return { ...current, buyer: party, consignee: { ...party } };
//       return { ...current, [which]: party };
//     });

//   const saveCustomer = async (party: Party) => {
//     if (!party.name.trim()) return;
//     const existing = cloud.customers.find(
//       (customer) =>
//         customer.name.trim().toLowerCase() ===
//           party.name.trim().toLowerCase() &&
//         customer.gstin.trim().toLowerCase() ===
//           party.gstin.trim().toLowerCase(),
//     );
//     const customer: Customer = {
//       ...party,
//       id: existing?.id || crypto.randomUUID(),
//     };
//     try {
//       await runBusy(
//         existing ? "Updating customer…" : "Saving customer…",
//         async () => {
//           await saveEntity("saveCustomer", customer);
//         },
//       );
//       setCloud((current) => ({
//         ...current,
//         customers: [
//           ...current.customers.filter((c) => c.id !== customer.id),
//           customer,
//         ],
//       }));
//       toast.success(existing ? "Customer updated." : "Customer saved.");
//     } catch (err) {
//       const message =
//         err instanceof Error ? err.message : "Unable to save customer.";
//       setError(message);
//       toast.error(message);
//     }
//   };

//   const saveCustomerEntity = async (customer: Customer) => {
//     const existing = cloud.customers.find(
//       (c) =>
//         c.id !== customer.id &&
//         c.name.trim().toLowerCase() === customer.name.trim().toLowerCase() &&
//         c.gstin.trim().toLowerCase() === customer.gstin.trim().toLowerCase(),
//     );
//     if (existing) {
//       toast.error("A customer with the same name and GSTIN already exists.");
//       throw new Error("Duplicate customer.");
//     }
//     const isUpdate = cloud.customers.some((c) => c.id === customer.id);
//     try {
//       await runBusy(
//         isUpdate ? "Updating customer…" : "Saving customer…",
//         async () => {
//           await saveEntity("saveCustomer", customer);
//         },
//       );
//       setCloud((current) => ({
//         ...current,
//         customers: [
//           ...current.customers.filter((c) => c.id !== customer.id),
//           customer,
//         ],
//       }));
//       toast.success(isUpdate ? "Customer updated." : "Customer saved.");
//     } catch (err) {
//       const message =
//         err instanceof Error ? err.message : "Unable to save customer.";
//       toast.error(message);
//       throw err;
//     }
//   };
//   const deleteCustomer = async (id: string) => {
//     try {
//       await runBusy("Deleting customer…", async () => {
//         await saveEntity("deleteCustomer", { id });
//       });
//       setCloud((current) => ({
//         ...current,
//         customers: current.customers.filter((c) => c.id !== id),
//       }));
//       toast.success("Customer deleted.");
//     } catch (err) {
//       const message =
//         err instanceof Error ? err.message : "Unable to delete customer.";
//       toast.error(message);
//       throw err;
//     }
//   };
//   const useCustomerInFreshBill = async (customer: Customer) => {
//     const number = await runBusy("Preparing customer bill…", nextInvoiceNumber);
//     const fresh = createInvoice(number);
//     setInvoice({
//       ...fresh,
//       consignee: { ...customer },
//       buyer: emptyParty(),
//       buyerSameAsConsignee: false,
//     });
//     startTransition(() => setTab("billing"));
//   };

//   const saveLedgerEntry = async (entry: LedgerEntry) => {
//     try {
//       await runBusy("Saving ledger receipt…", async () => {
//         await saveEntity("saveLedgerEntry", entry);
//       });
//       setCloud((current) => ({
//         ...current,
//         ledgerEntries: [
//           ...current.ledgerEntries.filter((e) => e.id !== entry.id),
//           entry,
//         ],
//       }));
//       toast.success("Ledger receipt saved.");
//     } catch (err) {
//       const message =
//         err instanceof Error ? err.message : "Unable to save ledger entry.";
//       setError(message);
//       toast.error(message);
//       throw err;
//     }
//   };

//   const deleteLedgerEntry = async (id: string) => {
//     try {
//       await runBusy("Deleting ledger receipt…", async () => {
//         await saveEntity("deleteLedgerEntry", { id });
//       });
//       setCloud((current) => ({
//         ...current,
//         ledgerEntries: current.ledgerEntries.filter((e) => e.id !== id),
//       }));
//       toast.success("Ledger receipt deleted.");
//     } catch (err) {
//       const message =
//         err instanceof Error ? err.message : "Unable to delete ledger entry.";
//       setError(message);
//       toast.error(message);
//       throw err;
//     }
//   };

//   const logout = () => {
//     clearCloudSession();
//     setHydrated(false);
//     setCloud(emptyCloud);
//     setInvoice(createInvoice());
//     setError("");
//     setHydrated(true);
//   };

//   if (!hydrated) return <AppLoader label="Loading Deal Magsil…" />;
//   if (!getToken())
//     return (
//       <>
//         <Login onLoggedIn={onLoggedIn} />
//         {error && <div className={styles["login-error-banner"]}>{error}</div>}
//       </>
//     );

//   return (
//     <main>
//       <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
//       {busy && <AppLoader label={busyLabel} overlay />}
//       <header className={styles["topbar"]}>
//         <div className={styles["brand"]}>
//           <div>DEAL MAGSIL</div>
//           <small>Precast Concrete &amp; Paving Solutions</small>
//         </div>
//         <nav>
//           {[
//             ["dashboard", "Dashboard"],
//             ["billing", "New Bill"],
//             ["invoices", `Bills (${cloud.invoices.length})`],
//             ["ledger", "Ledger"],
//             ["products", "Products"],
//             ["customers", "Customers"],
//             ["settings", "Company"],
//           ].map(([key, label]) => (
//             <button
//               key={key}
//               className={tab === key ? styles["active"] : ""}
//               disabled={busy}
//               onClick={() => startTransition(() => setTab(key as Tab))}
//             >
//               {label}
//             </button>
//           ))}
//           <button disabled={busy} onClick={logout}>
//             Logout
//           </button>
//         </nav>
//       </header>
//       {error && (
//         <div className={styles["error-banner"]}>
//           {error}
//           <button onClick={() => setError("")}>×</button>
//         </div>
//       )}
//       {tab === "dashboard" && (
//         <Dashboard
//           saved={cloud.invoices}
//           products={cloud.products}
//           ledgerEntries={cloud.ledgerEntries}
//           onNew={newBill}
//           onOpen={openBill}
//         />
//       )}
//       {tab === "billing" && (
//         <Billing
//           invoice={invoice}
//           setInvoice={setInvoice}
//           products={cloud.products}
//           totals={totals}
//           company={cloud.company}
//           onNew={newBill}
//           onSave={saveBill}
//           onPrint={() => window.print()}
//           updateItem={updateItem}
//           chooseProduct={chooseProduct}
//           partySet={partySet}
//           saveCustomer={saveCustomer}
//         />
//       )}
//       {tab === "invoices" && (
//         <Invoices
//           saved={cloud.invoices}
//           search={search}
//           setSearch={setSearch}
//           onNew={newBill}
//           onOpen={openBill}
//           onPreview={previewBill}
//           onDelete={removeBill}
//         />
//       )}
//       {tab === "ledger" && (
//         <Ledger
//           invoices={cloud.invoices}
//           customers={cloud.customers}
//           entries={cloud.ledgerEntries}
//           onSaveEntry={saveLedgerEntry}
//           onDeleteEntry={deleteLedgerEntry}
//           onOpenInvoice={openBill}
//         />
//       )}
//       {tab === "products" && (
//         <Products
//           products={cloud.products}
//           onSave={saveProduct}
//           onDelete={deleteProduct}
//         />
//       )}
//       {tab === "customers" && (
//         <Customers
//           customers={cloud.customers}
//           onSave={saveCustomerEntity}
//           onDelete={deleteCustomer}
//           onUse={useCustomerInFreshBill}
//         />
//       )}
//       {tab === "settings" && (
//         <Settings
//           company={cloud.company}
//           set={companySet}
//           onSave={saveCompany}
//           username={cloud.user.username}
//           onPasswordChanged={() => {}}
//         />
//       )}
//       <div className={styles["print-area"]}>
//         <InvoicePreview
//           invoice={invoice}
//           company={cloud.company}
//           totals={totals}
//         />
//       </div>
//       {previewInvoice && (
//         <BillPreviewModal
//           invoice={previewInvoice}
//           company={cloud.company}
//           onClose={() => setPreviewInvoice(null)}
//           onPrint={printPreviewBill}
//         />
//       )}
//     </main>
//   );
// }

"use client";

import styles from "./Home.module.css";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  startTransition,
} from "react";
import toast, { Toaster } from "react-hot-toast";

/* =========================================================
   COMMON COMPONENTS
   ========================================================= */

import { Login } from "@/components/auth/Login";
import { AppLoader } from "@/components/common/AppLoader";

/* =========================================================
   LIBRARIES
   ========================================================= */

import {
  companyDefaults,
  createInvoice,
  emptyParty,
  starterProducts,
} from "@/lib/defaults";

import { calc, normalizeInvoice } from "@/lib/billing";

import {
  bootstrap,
  clearCloudSession,
  getCloudUrl,
  getStamp,
  getToken,
  nextInvoiceNumber,
  saveEntity,
} from "@/lib/cloudApi";

/* =========================================================
   TYPES
   ========================================================= */

import {
  CompanySettings,
  Customer,
  Invoice,
  Item,
  LedgerEntry,
  Party,
  Product,
} from "@/types";

/* =========================================================
   DYNAMIC COMPONENTS
   IMPORTANT:
   Each component is declared ONLY ONCE.
   ========================================================= */

const Dashboard = dynamic(
  () =>
    import("@/components/dashboard/Dashboard").then(
      (m) => m.Dashboard,
    ),
  {
    loading: () => <AppLoader label="Loading dashboard…" />,
  },
);

const Billing = dynamic(
  () =>
    import("@/components/billing/Billing").then(
      (m) => m.Billing,
    ),
  {
    loading: () => <AppLoader label="Opening bill editor…" />,
  },
);

const Invoices = dynamic(
  () =>
    import("@/components/invoices/Invoices").then(
      (m) => m.Invoices,
    ),
  {
    loading: () => <AppLoader label="Loading bills…" />,
  },
);

const Ledger = dynamic(
  () =>
    import("@/components/ledger/Ledger").then(
      (m) => m.Ledger,
    ),
  {
    loading: () => <AppLoader label="Loading ledger…" />,
  },
);

const Products = dynamic(
  () =>
    import("@/components/products/Products").then(
      (m) => m.Products,
    ),
  {
    loading: () => <AppLoader label="Loading products…" />,
  },
);

const Customers = dynamic(
  () =>
    import("@/components/customers/Customers").then(
      (m) => m.Customers,
    ),
  {
    loading: () => <AppLoader label="Loading customers…" />,
  },
);

const Settings = dynamic(
  () =>
    import("@/components/settings/Settings").then(
      (m) => m.Settings,
    ),
  {
    loading: () => <AppLoader label="Loading company settings…" />,
  },
);

const InvoicePreview = dynamic(() =>
  import("@/components/invoice/InvoicePreview").then(
    (m) => m.InvoicePreview,
  ),
);

const BillPreviewModal = dynamic(() =>
  import("@/components/invoice/BillPreviewModal").then(
    (m) => m.BillPreviewModal,
  ),
);

/* =========================================================
   TAB TYPE
   ========================================================= */

type Tab =
  | "dashboard"
  | "billing"
  | "invoices"
  | "ledger"
  | "products"
  | "customers"
  | "settings";

/* =========================================================
   CLOUD STATE
   ========================================================= */

type CloudState = {
  company: CompanySettings;
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  ledgerEntries: LedgerEntry[];
  user: {
    username: string;
  };
};

/* =========================================================
   EMPTY CLOUD STATE
   ========================================================= */

const emptyCloud: CloudState = {
  company: companyDefaults,
  products: starterProducts,
  customers: [],
  invoices: [],
  ledgerEntries: [],
  user: {
    username: "",
  },
};

/* =========================================================
   HOME COMPONENT
   ========================================================= */

export default function Home() {
  /* =======================================================
     STATE
     ======================================================= */

  const [tab, setTab] = useState<Tab>("dashboard");

  const [cloud, setCloud] = useState<CloudState>(emptyCloud);

  const [invoice, setInvoice] = useState<Invoice>(() =>
    createInvoice(),
  );

  const [hydrated, setHydrated] = useState(false);

  const [search, setSearch] = useState("");

  const [error, setError] = useState("");

  const [previewInvoice, setPreviewInvoice] =
    useState<Invoice | null>(null);

  const [busy, setBusy] = useState(false);

  const [busyLabel, setBusyLabel] =
    useState("Working…");

  /* =======================================================
     BUSY / LOADER HANDLER
     ======================================================= */

  const runBusy = useCallback(
    async <T,>(
      label: string,
      task: () => Promise<T>,
    ) => {
      setBusy(true);
      setBusyLabel(label);

      try {
        return await task();
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  /* =======================================================
     LOAD CLOUD DATA
     ======================================================= */

  const loadCloud = useCallback(async () => {
    const data = await bootstrap();

    const company = {
      ...companyDefaults,
      ...data.company,
    };

    setCloud({
      company,
      products: data.products,
      customers: data.customers,
      invoices: data.invoices.map(normalizeInvoice),
      ledgerEntries: data.ledgerEntries || [],
      user: data.user,
    });

    setHydrated(true);

    /* -------------------------------------------------------
       Load stamp image if required
       ------------------------------------------------------- */

    try {
      if (
        company.stampDriveFileId &&
        !company.stampImage
      ) {
        const stamp = await getStamp();

        if (stamp?.url) {
          const nextCompany = {
            ...company,
            stampImage: stamp.url,
            stampDriveFileId: stamp.fileId,
            stampDriveFolderId: stamp.folderId,
          };

          setCloud((current) => ({
            ...current,
            company: nextCompany,
          }));
        }
      }
    } catch (_) {
      /* Ignore stamp loading errors */
    }
  }, []);

  /* =======================================================
     INITIAL CLOUD SESSION
     ======================================================= */

  useEffect(() => {
    if (!getToken() || !getCloudUrl()) {
      setHydrated(true);
      return;
    }

    loadCloud().catch((err) => {
      clearCloudSession();

      setError(
        err instanceof Error
          ? err.message
          : "Cloud session expired.",
      );

      setHydrated(true);
    });
  }, [loadCloud]);

  /* =======================================================
     LOGIN SUCCESS
     ======================================================= */

  const onLoggedIn = async () => {
    setError("");

    try {
      await runBusy(
        "Loading your workspace…",
        loadCloud,
      );

      startTransition(() => {
        setTab("dashboard");
      });
    } catch (err) {
      clearCloudSession();

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load cloud data.",
      );
    }
  };

  /* =======================================================
     WARM UP COMPONENTS IN IDLE TIME
     ======================================================= */

  useEffect(() => {
    const warm = () => {
      void Promise.all([
        import("@/components/billing/Billing"),
        import("@/components/invoices/Invoices"),
        import("@/components/ledger/Ledger"),
        import("@/components/products/Products"),
        import("@/components/customers/Customers"),
        import("@/components/settings/Settings"),
      ]);
    };

    const w = window as Window & {
      requestIdleCallback?: (
        cb: () => void,
      ) => number;

      cancelIdleCallback?: (
        id: number,
      ) => void;
    };

    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(warm);

      return () => {
        w.cancelIdleCallback?.(id);
      };
    }

    const id = window.setTimeout(
      warm,
      1200,
    );

    return () => {
      window.clearTimeout(id);
    };
  }, []);

  /* =======================================================
     INVOICE TOTALS
     ======================================================= */

  const totals = useMemo(
    () => calc(invoice),
    [invoice],
  );

  /* =======================================================
     FALLBACK INVOICE NUMBER
     ======================================================= */

  const newNumber = () => {
    const now = new Date();

    const year = now.getFullYear();

    const fy =
      now.getMonth() + 1 >= 4
        ? `${String(year).slice(2)}-${String(
            year + 1,
          ).slice(2)}`
        : `${String(year - 1).slice(2)}-${String(
            year,
          ).slice(2)}`;

    const max = cloud.invoices.reduce(
      (highest, current) => {
        const number = Number(
          current.meta.invoiceNo
            .split("/")
            .pop(),
        );

        return Number.isFinite(number)
          ? Math.max(highest, number)
          : highest;
      },
      0,
    );

    return `DM/${fy}/${String(max + 1).padStart(
      3,
      "0",
    )}`;
  };

  /* =======================================================
     CREATE NEW BILL
     ======================================================= */

  const newBill = async () => {
    try {
      const number = await runBusy(
        "Preparing new bill…",
        nextInvoiceNumber,
      );

      setInvoice(createInvoice(number));
    } catch (_) {
      setInvoice(
        createInvoice(newNumber()),
      );
    }

    startTransition(() => {
      setTab("billing");
    });
  };

  /* =======================================================
     FIND BILL
     ======================================================= */

  const findBill = (id: string) =>
    cloud.invoices.find(
      (item) => item.id === id,
    );

  /* =======================================================
     OPEN BILL
     ======================================================= */

  const openBill = (id: string) => {
    const existing = findBill(id);

    if (!existing) return;

    setInvoice(
      normalizeInvoice(existing),
    );

    startTransition(() => {
      setTab("billing");
    });
  };

  /* =======================================================
     PREVIEW BILL
     ======================================================= */

  const previewBill = (id: string) => {
    const existing = findBill(id);

    if (!existing) return;

    setPreviewInvoice(
      normalizeInvoice(existing),
    );
  };

  /* =======================================================
     PRINT PREVIEW
     ======================================================= */

  const printPreviewBill = () => {
    if (!previewInvoice) return;

    setInvoice(previewInvoice);

    setPreviewInvoice(null);

    window.setTimeout(() => {
      window.print();
    }, 100);
  };

  /* =======================================================
     SAVE BILL
     ======================================================= */

  const saveBill = async () => {
    setError("");

    try {
      await runBusy(
        "Saving bill…",
        async () => {
          await saveEntity(
            "saveInvoice",
            invoice,
          );
        },
      );

      setCloud((current) => ({
        ...current,

        invoices: [
          ...current.invoices.filter(
            (i) => i.id !== invoice.id,
          ),

          normalizeInvoice(invoice),
        ],
      }));

      startTransition(() => {
        setTab("invoices");
      });

      toast.success(
        `Bill ${invoice.meta.invoiceNo} saved successfully.`,
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to save bill.";

      setError(message);

      toast.error(message);
    }
  };

  /* =======================================================
     DELETE BILL
     ======================================================= */

  const removeBill = async (
    id: string,
  ) => {
    try {
      await runBusy(
        "Deleting bill…",
        async () => {
          await saveEntity(
            "deleteInvoice",
            { id },
          );
        },
      );

      setCloud((current) => ({
        ...current,

        invoices:
          current.invoices.filter(
            (i) => i.id !== id,
          ),
      }));

      toast.success("Bill deleted.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to delete bill.";

      setError(message);

      toast.error(message);
    }
  };

  /* =======================================================
     SAVE PRODUCT
     ======================================================= */

  const saveProduct = async (
    product: Product,
  ) => {
    const duplicate =
      cloud.products.find(
        (p) =>
          p.id !== product.id &&
          p.name.trim().toLowerCase() ===
            product.name.trim().toLowerCase() &&
          p.hsn.trim().toLowerCase() ===
            product.hsn.trim().toLowerCase(),
      );

    if (duplicate) {
      toast.error(
        "A product with the same name and HSN already exists.",
      );

      throw new Error(
        "Duplicate product.",
      );
    }

    const isUpdate =
      cloud.products.some(
        (p) => p.id === product.id,
      );

    try {
      await runBusy(
        isUpdate
          ? "Updating product…"
          : "Saving product…",
        async () => {
          await saveEntity(
            "saveProduct",
            product,
          );
        },
      );

      setCloud((current) => ({
        ...current,

        products: [
          ...current.products.filter(
            (p) => p.id !== product.id,
          ),

          product,
        ],
      }));

      toast.success(
        isUpdate
          ? "Product updated."
          : "Product saved.",
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to save product.";

      toast.error(message);

      throw err;
    }
  };

  /* =======================================================
     DELETE PRODUCT
     ======================================================= */

  const deleteProduct = async (
    id: string,
  ) => {
    try {
      await runBusy(
        "Deleting product…",
        async () => {
          await saveEntity(
            "deleteProduct",
            { id },
          );
        },
      );

      setCloud((current) => ({
        ...current,

        products:
          current.products.filter(
            (p) => p.id !== id,
          ),
      }));

      toast.success(
        "Product deleted.",
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to delete product.";

      toast.error(message);

      throw err;
    }
  };

  /* =======================================================
     UPDATE INVOICE ITEM
     ======================================================= */

  const updateItem = (
    id: string,
    key: keyof Item,
    value: string,
  ) =>
    setInvoice((current) => ({
      ...current,

      items: current.items.map(
        (item) =>
          item.id === id
            ? {
                ...item,

                [key]:
                  key === "quantity" ||
                  key === "rate" ||
                  key === "gstRate"
                    ? Number(value)
                    : value,
              }
            : item,
      ),
    }));

  /* =======================================================
     CHOOSE PRODUCT FOR INVOICE ITEM
     ======================================================= */

  const chooseProduct = (
    id: string,
    productId: string,
  ) => {
    const product =
      cloud.products.find(
        (item) =>
          item.id === productId,
      );

    if (!product) return;

    setInvoice((current) => ({
      ...current,

      items: current.items.map(
        (item) =>
          item.id === id
            ? {
                ...item,

                productId: product.id,

                description:
                  product.name,

                hsn: product.hsn,

                unit: product.unit,

                rate: product.rate,

                gstRate:
                  product.gstRate,
              }
            : item,
      ),
    }));
  };

  /* =======================================================
     COMPANY FIELD UPDATE
     ======================================================= */

  const companySet = (
    key: keyof CompanySettings,
    value: string,
  ) => {
    setCloud((current) => ({
      ...current,

      company: {
        ...current.company,
        [key]: value,
      },
    }));
  };

  /* =======================================================
     SAVE COMPANY
     ======================================================= */

  const saveCompany = async (
    company: CompanySettings,
  ) => {
    try {
      await runBusy(
        "Saving company settings…",
        async () => {
          await saveEntity(
            "saveCompany",
            company,
          );
        },
      );

      setCloud((current) => ({
        ...current,
        company,
      }));

      toast.success(
        "Company settings updated.",
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to save company settings.";

      setError(message);

      toast.error(message);

      throw err;
    }
  };

  /* =======================================================
     PARTY UPDATE
     ======================================================= */

  const partySet = (
    which:
      | "buyer"
      | "consignee",
    party: Party,
  ) =>
    setInvoice((current) => {
      if (
        which === "consignee" &&
        current.buyerSameAsConsignee
      ) {
        return {
          ...current,

          consignee: party,

          buyer: {
            ...party,
          },
        };
      }

      if (
        which === "buyer" &&
        current.buyerSameAsConsignee
      ) {
        return {
          ...current,

          buyer: party,

          consignee: {
            ...party,
          },
        };
      }

      return {
        ...current,
        [which]: party,
      };
    });

  /* =======================================================
     SAVE CUSTOMER FROM BILLING
     ======================================================= */

  const saveCustomer = async (
    party: Party,
  ) => {
    if (!party.name.trim()) return;

    const existing =
      cloud.customers.find(
        (customer) =>
          customer.name
            .trim()
            .toLowerCase() ===
            party.name
              .trim()
              .toLowerCase() &&
          customer.gstin
            .trim()
            .toLowerCase() ===
            party.gstin
              .trim()
              .toLowerCase(),
      );

    const customer: Customer = {
      ...party,

      id:
        existing?.id ||
        crypto.randomUUID(),
    };

    try {
      await runBusy(
        existing
          ? "Updating customer…"
          : "Saving customer…",
        async () => {
          await saveEntity(
            "saveCustomer",
            customer,
          );
        },
      );

      setCloud((current) => ({
        ...current,

        customers: [
          ...current.customers.filter(
            (c) =>
              c.id !== customer.id,
          ),

          customer,
        ],
      }));

      toast.success(
        existing
          ? "Customer updated."
          : "Customer saved.",
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to save customer.";

      setError(message);

      toast.error(message);
    }
  };

  /* =======================================================
     SAVE CUSTOMER ENTITY
     ======================================================= */

  const saveCustomerEntity =
    async (
      customer: Customer,
    ) => {
      const existing =
        cloud.customers.find(
          (c) =>
            c.id !== customer.id &&
            c.name
              .trim()
              .toLowerCase() ===
              customer.name
                .trim()
                .toLowerCase() &&
            c.gstin
              .trim()
              .toLowerCase() ===
              customer.gstin
                .trim()
                .toLowerCase(),
        );

      if (existing) {
        toast.error(
          "A customer with the same name and GSTIN already exists.",
        );

        throw new Error(
          "Duplicate customer.",
        );
      }

      const isUpdate =
        cloud.customers.some(
          (c) => c.id === customer.id,
        );

      try {
        await runBusy(
          isUpdate
            ? "Updating customer…"
            : "Saving customer…",
          async () => {
            await saveEntity(
              "saveCustomer",
              customer,
            );
          },
        );

        setCloud((current) => ({
          ...current,

          customers: [
            ...current.customers.filter(
              (c) =>
                c.id !== customer.id,
            ),

            customer,
          ],
        }));

        toast.success(
          isUpdate
            ? "Customer updated."
            : "Customer saved.",
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to save customer.";

        toast.error(message);

        throw err;
      }
    };

  /* =======================================================
     DELETE CUSTOMER
     ======================================================= */

  const deleteCustomer = async (
    id: string,
  ) => {
    try {
      await runBusy(
        "Deleting customer…",
        async () => {
          await saveEntity(
            "deleteCustomer",
            { id },
          );
        },
      );

      setCloud((current) => ({
        ...current,

        customers:
          current.customers.filter(
            (c) => c.id !== id,
          ),
      }));

      toast.success(
        "Customer deleted.",
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to delete customer.";

      toast.error(message);

      throw err;
    }
  };

  /* =======================================================
     USE CUSTOMER IN NEW BILL
     ======================================================= */

  const useCustomerInFreshBill =
    async (
      customer: Customer,
    ) => {
      const number =
        await runBusy(
          "Preparing customer bill…",
          nextInvoiceNumber,
        );

      const fresh =
        createInvoice(number);

      setInvoice({
        ...fresh,

        consignee: {
          ...customer,
        },

        buyer: emptyParty(),

        buyerSameAsConsignee:
          false,
      });

      startTransition(() => {
        setTab("billing");
      });
    };

  /* =======================================================
     SAVE LEDGER ENTRY
     ======================================================= */

  const saveLedgerEntry =
    async (
      entry: LedgerEntry,
    ) => {
      try {
        await runBusy(
          "Saving ledger receipt…",
          async () => {
            await saveEntity(
              "saveLedgerEntry",
              entry,
            );
          },
        );

        setCloud((current) => ({
          ...current,

          ledgerEntries: [
            ...current.ledgerEntries.filter(
              (e) => e.id !== entry.id,
            ),

            entry,
          ],
        }));

        toast.success(
          "Ledger receipt saved.",
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to save ledger entry.";

        setError(message);

        toast.error(message);

        throw err;
      }
    };

  /* =======================================================
     DELETE LEDGER ENTRY
     ======================================================= */

  const deleteLedgerEntry =
    async (
      id: string,
    ) => {
      try {
        await runBusy(
          "Deleting ledger receipt…",
          async () => {
            await saveEntity(
              "deleteLedgerEntry",
              { id },
            );
          },
        );

        setCloud((current) => ({
          ...current,

          ledgerEntries:
            current.ledgerEntries.filter(
              (e) => e.id !== id,
            ),
        }));

        toast.success(
          "Ledger receipt deleted.",
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to delete ledger entry.";

        setError(message);

        toast.error(message);

        throw err;
      }
    };

  /* =======================================================
     LOGOUT
     ======================================================= */

  const logout = () => {
    clearCloudSession();

    setHydrated(false);

    setCloud(emptyCloud);

    setInvoice(
      createInvoice(),
    );

    setError("");

    setHydrated(true);
  };

  /* =======================================================
     INITIAL LOADING SCREEN
     ======================================================= */

  if (!hydrated) {
    return (
      <AppLoader
        label="Loading Deal Magsil…"
      />
    );
  }

  /* =======================================================
     LOGIN SCREEN
     ======================================================= */

  if (!getToken()) {
    return (
      <>
        <Login
          onLoggedIn={onLoggedIn}
        />

        {error && (
          <div
            className={
              styles[
                "login-error-banner"
              ]
            }
          >
            {error}
          </div>
        )}
      </>
    );
  }

  /* =======================================================
     MAIN APPLICATION
     ======================================================= */

  return (
    <main>
      {/* ===================================================
          TOASTER
          =================================================== */}

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
        }}
      />

      {/* ===================================================
          GLOBAL BUSY LOADER
          =================================================== */}

      {busy && (
        <AppLoader
          label={busyLabel}
          overlay
        />
      )}

      {/* ===================================================
          TOP NAVIGATION
          =================================================== */}

      <header
        className={
          styles["topbar"]
        }
      >
        {/* -----------------------------------------------
            BRAND
            ----------------------------------------------- */}

        <div
          className={
            styles["brand"]
          }
        >
          <div>
            DEAL MAGSIL
          </div>

          <small>
            Precast Concrete &amp;
            Paving Solutions
          </small>
        </div>

        {/* -----------------------------------------------
            NAVIGATION
            ----------------------------------------------- */}

        <nav>
          {[
            [
              "dashboard",
              "Dashboard",
            ],

            [
              "billing",
              "New Bill",
            ],

            [
              "invoices",
              `Bills (${cloud.invoices.length})`,
            ],

            // [
            //   "ledger",
            //   "Ledger",
            // ],
            [
              "products",
              "Products",
            ],

            [
              "customers",
              "Customers",
            ],

            [
              "settings",
              "Company",
            ],
          ].map(
            ([key, label]) => (
              <button
                key={key}
                className={
                  tab === key
                    ? styles[
                        "active"
                      ]
                    : ""
                }
                disabled={busy}
                onClick={() =>
                  startTransition(
                    () =>
                      setTab(
                        key as Tab,
                      ),
                  )
                }
              >
                {label}
              </button>
            ),
          )}

          {/* -------------------------------------------
              LOGOUT
              ------------------------------------------- */}

          <button
            disabled={busy}
            onClick={logout}
          >
            Logout
          </button>
        </nav>
      </header>

      {/* ===================================================
          ERROR BANNER
          =================================================== */}

      {error && (
        <div
          className={
            styles["error-banner"]
          }
        >
          {error}

          <button
            onClick={() =>
              setError("")
            }
          >
            ×
          </button>
        </div>
      )}

      {/* ===================================================
          DASHBOARD
          =================================================== */}

      {tab === "dashboard" && (
        <Dashboard
          saved={cloud.invoices}
          products={cloud.products}
          ledgerEntries={
            cloud.ledgerEntries
          }
          onNew={newBill}
          onOpen={openBill}
        />
      )}

      {/* ===================================================
          BILLING
          =================================================== */}

      {tab === "billing" && (
        <Billing
          invoice={invoice}
          setInvoice={setInvoice}
          products={cloud.products}
          totals={totals}
          company={cloud.company}
          onNew={newBill}
          onSave={saveBill}
          onPrint={() =>
            window.print()
          }
          updateItem={updateItem}
          chooseProduct={
            chooseProduct
          }
          partySet={partySet}
          saveCustomer={
            saveCustomer
          }
        />
      )}

      {/* ===================================================
          INVOICES
          =================================================== */}

      {tab === "invoices" && (
        <Invoices
          saved={cloud.invoices}
          search={search}
          setSearch={setSearch}
          onNew={newBill}
          onOpen={openBill}
          onPreview={
            previewBill
          }
          onDelete={
            removeBill
          }
        />
      )}

      {/* ===================================================
          LEDGER
          =================================================== */}

      {tab === "ledger" && (
        <Ledger
          invoices={
            cloud.invoices
          }
          customers={
            cloud.customers
          }
          entries={
            cloud.ledgerEntries
          }
          onSaveEntry={
            saveLedgerEntry
          }
          onDeleteEntry={
            deleteLedgerEntry
          }
          onOpenInvoice={
            openBill
          }
        />
      )}

      {/* ===================================================
          PRODUCTS
          =================================================== */}

      {tab === "products" && (
        <Products
          products={
            cloud.products
          }
          onSave={
            saveProduct
          }
          onDelete={
            deleteProduct
          }
        />
      )}

      {/* ===================================================
          CUSTOMERS
          =================================================== */}

      {tab === "customers" && (
        <Customers
          customers={
            cloud.customers
          }
          onSave={
            saveCustomerEntity
          }
          onDelete={
            deleteCustomer
          }
          onUse={
            useCustomerInFreshBill
          }
        />
      )}

      {/* ===================================================
          SETTINGS
          =================================================== */}

      {tab === "settings" && (
        <Settings
          company={
            cloud.company
          }
          set={companySet}
          onSave={
            saveCompany
          }
          username={
            cloud.user.username
          }
          onPasswordChanged={() => {}}
        />
      )}

      {/* ===================================================
          PRINT AREA
          =================================================== */}

      <div
        className={
          styles["print-area"]
        }
      >
        <InvoicePreview
          invoice={invoice}
          company={
            cloud.company
          }
          totals={totals}
        />
      </div>

      {/* ===================================================
          BILL PREVIEW MODAL
          =================================================== */}

      {previewInvoice && (
        <BillPreviewModal
          invoice={
            previewInvoice
          }
          company={
            cloud.company
          }
          onClose={() =>
            setPreviewInvoice(
              null,
            )
          }
          onPrint={
            printPreviewBill
          }
        />
      )}
    </main>
  );
}
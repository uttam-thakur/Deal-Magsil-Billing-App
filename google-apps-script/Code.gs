/**
 * Deal Magsil Cloud Billing + Google Drive Stamp Backup
 *
 * Deploy as a Web App:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * The same Web App URL is used by the Next.js frontend for:
 *   - Login/session
 *   - Google Sheets cloud storage
 *   - Google Drive stamp backup
 *
 * Spreadsheet tabs created automatically:
 *   Users, Company, Products, Customers, Invoices, Ledger
 */

const FOLDER_NAME = "Deal Magsil Billing";
const STAMP_NAME = "deal-magsil-stamp";
const INITIAL_ADMIN_USERNAME = "admin";
const INITIAL_ADMIN_PASSWORD_HASH =
  "14bd6bbc0615236c3f8b3c63df4aafa7587bec300159e7b9b03d21bfb045ae83"; // DealMagsil@123
const SESSION_TTL_SECONDS = 21600;
const PROP_SPREADSHEET_ID = "DEAL_MAGSIL_SPREADSHEET_ID";
https://script.google.com/macros/s/AKfycbwOIMjqQAKM0tKB5uzIX4PcaKnwCGw3NNCMDQ71ylc11XIeUUcqzMMqrHAXY0TwO_zYeA/exec
const HEADERS = {
  Users: ["id", "username", "passwordHash", "createdAt", "updatedAt"],
  Company: ["key", "value"],
  Products: [
    "id",
    "name",
    "hsn",
    "unit",
    "rate",
    "gstRate",
    "category",
    "active",
  ],
  Customers: [
    "id",
    "name",
    "address",
    "contact",
    "gstin",
    "state",
    "stateCode",
  ],
  Invoices: [
    "id",
    "invoiceNo",
    "date",
    "mode",
    "taxMode",
    "buyerSameAsConsignee",
    "paymentStatus",
    "createdAt",
    "metaJson",
    "buyerJson",
    "consigneeJson",
    "itemsJson",
    "roundOff",
  ],
  Ledger: [
    "id",
    "date",
    "type",
    "customerId",
    "customerName",
    "invoiceId",
    "invoiceNo",
    "itemSummary",
    "debit",
    "credit",
    "amount",
    "balance",
    "status",
    "paymentMode",
    "reference",
    "notes",
    "createdAt",
  ],
};

function doGet(e) {
  try {
    const p = e && e.parameter ? e.parameter : {};
    const result = routeGet_(p);
    return jsonp_(result, p.callback);
  } catch (err) {
    return jsonp_(
      { ok: false, error: String(err && err.message ? err.message : err) },
      e && e.parameter ? e.parameter.callback : "",
    );
  }
}

function doPost(e) {
  const p = e && e.parameter ? e.parameter : {};
  const requestId = String(p.requestId || "");
  try {
    const result = routePost_(p);
    if (requestId)
      CacheService.getScriptCache().put(
        "mutation:" + requestId,
        JSON.stringify({ ok: true, result: result || {} }),
        60,
      );
    return jsonp_(result, "");
  } catch (err) {
    const error = String(err && err.message ? err.message : err);
    if (requestId)
      CacheService.getScriptCache().put(
        "mutation:" + requestId,
        JSON.stringify({ ok: false, error: error }),
        60,
      );
    return jsonp_({ ok: false, error: error }, "");
  }
}

function routeGet_(p) {
  const action = String(p.action || "health");
  if (action === "health")
    return { ok: true, service: "Deal Magsil Cloud Billing" };
  if (action === "mutationStatus") {
    requireSession_(p.token);
    const raw = CacheService.getScriptCache().get(
      "mutation:" + String(p.requestId || ""),
    );
    return raw
      ? JSON.parse(raw)
      : { ok: false, error: "Mutation is still processing." };
  }
  if (action === "login")
    return login_(String(p.username || ""), String(p.passwordHash || ""));
  if (action === "nextInvoiceNumber") {
    requireSession_(p.token);
    return { ok: true, invoiceNo: nextInvoiceNumber_() };
  }
  if (action === "bootstrap") {
    const username = requireSession_(p.token);
    const data = readAll_();
    data.user = { username: username };
    return { ok: true, data: data };
  }
  if (action === "stamp") {
    requireSession_(p.token);
    return { ok: true, stamp: readStamp_() };
  }
  throw new Error("Unknown GET action.");
}

function routePost_(p) {
  const action = String(p.action || "");
  requireSession_(p.token);
  const payload = decodePayload_(p.payload || "");
  if (action === "uploadStamp") return uploadStamp_(payload);
  if (action === "saveCompany") {
    saveCompany_(payload.entity || payload);
    return { ok: true };
  }
  if (action === "saveInvoice") {
    saveInvoice_(payload.entity || payload);
    return { ok: true };
  }
  if (action === "deleteInvoice") {
    deleteById_(
      "Invoices",
      payload.entity && payload.entity.id ? payload.entity.id : payload.id,
    );
    return { ok: true };
  }
  if (action === "saveProduct") {
    saveProduct_(payload.entity || payload);
    return { ok: true };
  }
  if (action === "deleteProduct") {
    deleteById_(
      "Products",
      payload.entity && payload.entity.id ? payload.entity.id : payload.id,
    );
    return { ok: true };
  }
  if (action === "replaceProducts") {
    replaceProducts_(payload.products || []);
    return { ok: true };
  }
  if (action === "replaceCustomers") {
    replaceCustomers_(payload.customers || []);
    return { ok: true };
  }
  if (action === "saveCustomer") {
    upsertCustomer_(payload.entity || payload);
    return { ok: true };
  }
  if (action === "deleteCustomer") {
    deleteById_(
      "Customers",
      payload.entity && payload.entity.id ? payload.entity.id : payload.id,
    );
    return { ok: true };
  }
  if (action === "saveLedgerEntry") {
    return saveLedgerEntry_(payload.entity || payload);
  }
  if (action === "deleteLedgerEntry") {
    deleteById_(
      "Ledger",
      payload.entity && payload.entity.id ? payload.entity.id : payload.id,
    );
    return { ok: true, message: "Ledger entry deleted." };
  }
  if (action === "changePassword") {
    changePassword_(
      p.token,
      payload.currentPasswordHash,
      payload.newPasswordHash,
    );
    return { ok: true };
  }
  throw new Error("Unknown POST action.");
}

// function login_(username, passwordHash) {
//   const ss = getSpreadsheet_();
//   ensureSheets_(ss);
//   const sheet = ss.getSheetByName('Users');
//   if (sheet.getLastRow() < 2) {
//     sheet.appendRow([Utilities.getUuid(), INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_PASSWORD_HASH, new Date().toISOString(), new Date().toISOString()]);
//   }
//   const rows = getRows_(sheet);
//   const user = rows.find(r => String(r.username).toLowerCase() === username.toLowerCase() && String(r.passwordHash) === passwordHash);
//   if (!user) return { ok:false, error:'Invalid username or password.' };
//   const token = Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,'');
//   CacheService.getScriptCache().put('session:' + token, String(user.username), SESSION_TTL_SECONDS);
//   return { ok:true, token:token, user:{ username:String(user.username) } };
// }

// function requireSession_(token) {
//   if (!token) throw new Error('Not signed in.');
//   const username = CacheService.getScriptCache().get('session:' + token);
//   if (!username) throw new Error('Session expired. Please sign in again.');
//   return username;
// }
function login_(username, passwordHash) {
  const ss = getSpreadsheet_();
  ensureSheets_(ss);

  const sheet = ss.getSheetByName("Users");

  // Create default admin account on first use.
  if (sheet.getLastRow() < 2) {
    const now = new Date().toISOString();

    sheet.appendRow([
      Utilities.getUuid(),
      INITIAL_ADMIN_USERNAME,
      INITIAL_ADMIN_PASSWORD_HASH,
      now,
      now,
    ]);
  }

  const rows = getRows_(sheet);

  const user = rows.find(
    (r) =>
      String(r.username || "")
        .trim()
        .toLowerCase() ===
        String(username || "")
          .trim()
          .toLowerCase() &&
      String(r.passwordHash || "").trim() === String(passwordHash || "").trim(),
  );

  if (!user) {
    return {
      ok: false,
      error: "Invalid username or password.",
    };
  }

  const token =
    Utilities.getUuid().replace(/-/g, "") +
    Utilities.getUuid().replace(/-/g, "");

  const session = {
    username: String(user.username),
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };

  // Primary persistent session store.
  PropertiesService.getScriptProperties().setProperty(
    "SESSION_" + token,
    JSON.stringify(session),
  );

  // Also keep CacheService as a fast secondary store.
  CacheService.getScriptCache().put(
    "session:" + token,
    String(user.username),
    21600,
  );

  return {
    ok: true,
    token: token,
    user: {
      username: String(user.username),
    },
  };
}

function requireSession_(token) {
  if (!token) {
    throw new Error("SESSION_EXPIRED");
  }

  const key = "SESSION_" + String(token);

  const props = PropertiesService.getScriptProperties();

  const raw = props.getProperty(key);

  /*
   * Primary persistent session.
   */
  if (raw) {
    try {
      const session = JSON.parse(raw);

      if (
        session &&
        session.username &&
        Number(session.expiresAt) > Date.now()
      ) {
        /*
         * Extend session for another 7 days
         * whenever the user is active.
         */
        session.expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

        props.setProperty(key, JSON.stringify(session));

        /*
         * Refresh the short-lived cache too.
         */
        CacheService.getScriptCache().put(
          "session:" + token,
          String(session.username),
          21600,
        );

        return String(session.username);
      }

      /*
       * Expired persistent session.
       */
      props.deleteProperty(key);
    } catch (_) {
      props.deleteProperty(key);
    }
  }

  /*
   * Backward compatibility:
   * accept an older CacheService-only session.
   */
  const cachedUsername = CacheService.getScriptCache().get("session:" + token);

  if (cachedUsername) {
    const session = {
      username: String(cachedUsername),
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };

    props.setProperty(key, JSON.stringify(session));

    return String(cachedUsername);
  }

  throw new Error("SESSION_EXPIRED");
}

function nextInvoiceNumber_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const fy =
      month >= 4
        ? String(year).slice(2) + "-" + String(year + 1).slice(2)
        : String(year - 1).slice(2) + "-" + String(year).slice(2);
    const key = "COUNTER_" + fy.replace("-", "_");
    const props = PropertiesService.getScriptProperties();
    let counter = Number(props.getProperty(key) || 0);
    const rows = getRows_(getSpreadsheet_().getSheetByName("Invoices"));
    rows.forEach((r) => {
      const n = Number(
        String(r.invoiceNo || "")
          .split("/")
          .pop(),
      );
      if (isFinite(n)) counter = Math.max(counter, n);
    });
    counter += 1;
    props.setProperty(key, String(counter));
    return "DM/" + fy + "/" + String(counter).padStart(3, "0");
  } finally {
    lock.releaseLock();
  }
}

function changePassword_(token, currentHash, newHash) {
  const username = requireSession_(token);
  if (!newHash) throw new Error("New password is required.");
  const sheet = getSpreadsheet_().getSheetByName("Users");
  const rows = getRows_(sheet);
  const idx = rows.findIndex((r) => String(r.username) === String(username));
  if (idx < 0 || String(rows[idx].passwordHash) !== String(currentHash))
    throw new Error("Current password is incorrect.");
  sheet.getRange(idx + 2, 3).setValue(String(newHash));
  sheet.getRange(idx + 2, 5).setValue(new Date().toISOString());
}

function readAll_() {
  const ss = getSpreadsheet_();
  ensureSheets_(ss);
  const company = {};
  const companyRows = getRows_(ss.getSheetByName("Company"));
  if (!companyRows.length) saveCompany_(starterCompany_());
  getRows_(ss.getSheetByName("Company")).forEach(
    (r) => (company[r.key] = r.value),
  );
  const productRows = getRows_(ss.getSheetByName("Products"));
  if (!productRows.length) replaceProducts_(starterProducts_());
  const products = getRows_(ss.getSheetByName("Products")).map((r) => ({
    id: String(r.id),
    name: String(r.name || ""),
    hsn: String(r.hsn || ""),
    unit: String(r.unit || "Pcs"),
    rate: Number(r.rate) || 0,
    gstRate: Number(r.gstRate) || 0,
    category: String(r.category || ""),
    active: String(r.active).toLowerCase() !== "false",
  }));
  const customers = getRows_(ss.getSheetByName("Customers")).map((r) => ({
    id: String(r.id),
    name: String(r.name || ""),
    address: String(r.address || ""),
    contact: String(r.contact || ""),
    gstin: String(r.gstin || ""),
    state: String(r.state || ""),
    stateCode: String(r.stateCode || ""),
  }));
  const invoices = getRows_(ss.getSheetByName("Invoices")).map((r) => ({
    id: String(r.id),
    mode: String(r.mode || "GST"),
    taxMode: String(r.taxMode || "INTRA"),
    meta: parseJson_(r.metaJson, {}),
    buyer: parseJson_(r.buyerJson, {}),
    consignee: parseJson_(r.consigneeJson, {}),
    buyerSameAsConsignee:
      String(r.buyerSameAsConsignee).toLowerCase() === "true",
    items: parseJson_(r.itemsJson, []),
    roundOff: Number(r.roundOff) || 0,
    paymentStatus: String(r.paymentStatus || "Pending"),
    createdAt: String(r.createdAt || ""),
  }));
  syncLedgerSales_(ss);
  const ledgerEntries = getRows_(ss.getSheetByName("Ledger")).map((r) => ({
    id: String(r.id || ""),
    date: String(r.date || ""),
    type: String(r.type || "Receipt"),
    customerId: String(r.customerId || ""),
    customerName: String(r.customerName || ""),
    invoiceId: String(r.invoiceId || ""),
    invoiceNo: String(r.invoiceNo || ""),
    itemSummary: String(r.itemSummary || ""),
    debit: Number(r.debit) || 0,
    credit: Number(r.credit) || 0,
    amount: Number(r.amount) || 0,
    balance: Number(r.balance) || 0,
    status: String(r.status || "Pending"),
    paymentMode: String(r.paymentMode || "Cash"),
    reference: String(r.reference || ""),
    notes: String(r.notes || ""),
    createdAt: String(r.createdAt || ""),
  }));
  return {
    company: company,
    products: products.length ? products : starterProducts_(),
    customers: customers,
    invoices: invoices,
    ledgerEntries: ledgerEntries,
    user: { username: "" },
  };
}

function saveCompany_(entity) {
  const sheet = getSpreadsheet_().getSheetByName("Company");
  const existing = getRows_(sheet);
  const incoming = entity || {};
  Object.keys(incoming).forEach((key) => {
    const value = incoming[key] == null ? "" : String(incoming[key]);
    const idx = existing.findIndex((r) => String(r.key) === key);
    if (idx >= 0) sheet.getRange(idx + 2, 2).setValue(value);
    else sheet.appendRow([key, value]);
  });
}

function saveInvoice_(invoice) {
  if (!invoice || !invoice.id) throw new Error("Invoice ID is required.");
  const sheet = getSpreadsheet_().getSheetByName("Invoices");
  const rows = getRows_(sheet);
  const invoiceNo = String(
    (invoice.meta && invoice.meta.invoiceNo) || "",
  ).trim();
  const duplicateNo = rows.find(
    (r) =>
      String(r.invoiceNo || "")
        .trim()
        .toLowerCase() === invoiceNo.toLowerCase() &&
      String(r.id) !== String(invoice.id),
  );
  if (duplicateNo)
    throw new Error(
      "Invoice number already exists. Open that bill and edit it instead of creating another bill.",
    );
  const row = [
    invoice.id,
    invoiceNo,
    (invoice.meta && invoice.meta.date) || "",
    invoice.mode || "GST",
    invoice.taxMode || "INTRA",
    String(!!invoice.buyerSameAsConsignee),
    invoice.paymentStatus || "Pending",
    invoice.createdAt || new Date().toISOString(),
    JSON.stringify(invoice.meta || {}),
    JSON.stringify(invoice.buyer || {}),
    JSON.stringify(invoice.consignee || {}),
    JSON.stringify(invoice.items || []),
    Number(invoice.roundOff) || 0,
  ];
  const idx = rows.findIndex((r) => String(r.id) === String(invoice.id));
  if (idx >= 0) sheet.getRange(idx + 2, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);
}

function saveProduct_(product) {
  if (!product || !String(product.name || "").trim())
    throw new Error("Product name is required.");
  const sheet = getSpreadsheet_().getSheetByName("Products");
  const rows = getRows_(sheet);
  const name = String(product.name || "")
    .trim()
    .toLowerCase();
  const hsn = String(product.hsn || "")
    .trim()
    .toLowerCase();
  const duplicate = rows.find(
    (r) =>
      String(r.id) !== String(product.id) &&
      String(r.name || "")
        .trim()
        .toLowerCase() === name &&
      String(r.hsn || "")
        .trim()
        .toLowerCase() === hsn,
  );
  if (duplicate)
    throw new Error("A product with the same name and HSN already exists.");
  const id = String(product.id || Utilities.getUuid());
  const row = [
    id,
    String(product.name || "").trim(),
    String(product.hsn || ""),
    String(product.unit || "Pcs"),
    Number(product.rate) || 0,
    Number(product.gstRate) || 0,
    String(product.category || ""),
    String(product.active !== false),
  ];
  const idx = rows.findIndex((r) => String(r.id) === id);
  if (idx >= 0) sheet.getRange(idx + 2, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);
}

function saveLedgerEntry_(entry) {
  if (!entry || !String(entry.customerName || "").trim())
    throw new Error("Customer is required for a ledger receipt.");
  const amount = Number(entry.amount) || 0;
  if (amount <= 0) throw new Error("Receipt amount must be greater than zero.");

  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName("Ledger");
  const rows = getRows_(sheet);
  const id = String(entry.id || Utilities.getUuid());

  let invoice = null;
  let invoiceTotal = 0;
  if (entry.invoiceId) {
    const invoiceRows = getRows_(ss.getSheetByName("Invoices"));
    const invoiceRow = invoiceRows.find(
      (r) => String(r.id) === String(entry.invoiceId),
    );
    if (!invoiceRow) throw new Error("Linked invoice was not found.");

    invoice = {
      mode: String(invoiceRow.mode || "GST"),
      roundOff: Number(invoiceRow.roundOff) || 0,
      paymentStatus: String(invoiceRow.paymentStatus || "Pending"),
      items: parseJson_(invoiceRow.itemsJson, []),
    };
    invoiceTotal = invoiceTotal_(invoice);

    if (invoice.paymentStatus === "Successful") {
      throw new Error(
        "This invoice is already marked Successful, so its outstanding due is zero.",
      );
    }

    const alreadyReceived = rows
      .filter(
        (r) =>
          String(r.invoiceId) === String(entry.invoiceId) &&
          String(r.type).toLowerCase() === "receipt" &&
          String(r.id) !== id,
      )
      .reduce((sum, r) => sum + (Number(r.credit || r.amount) || 0), 0);
    const due = Math.max(0, invoiceTotal - alreadyReceived);
    if (amount > due + 0.01)
      throw new Error(
        "Receipt amount cannot be greater than the outstanding invoice due of " +
          due.toFixed(2) +
          ".",
      );
  }

  const priorReceipts = entry.invoiceId
    ? rows
        .filter(
          (r) =>
            String(r.invoiceId) === String(entry.invoiceId) &&
            String(r.type).toLowerCase() === "receipt" &&
            String(r.id) !== id,
        )
        .reduce((sum, r) => sum + (Number(r.credit || r.amount) || 0), 0)
    : 0;

  const remaining = entry.invoiceId
    ? Math.max(0, invoiceTotal - priorReceipts - amount)
    : 0;
  const status = entry.invoiceId && remaining <= 0.01 ? "Paid" : "Pending";

  const row = [
    id,
    String(entry.date || new Date().toISOString().slice(0, 10)),
    "Receipt",
    String(entry.customerId || ""),
    String(entry.customerName || "").trim(),
    String(entry.invoiceId || ""),
    String(entry.invoiceNo || ""),
    "",
    0,
    amount,
    amount,
    remaining,
    status,
    String(entry.paymentMode || "Cash"),
    String(entry.reference || ""),
    String(entry.notes || ""),
    String(entry.createdAt || new Date().toISOString()),
  ];

  const idx = rows.findIndex((r) => String(r.id) === id);
  if (idx >= 0) sheet.getRange(idx + 2, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);

  if (entry.invoiceId && remaining <= 0.01)
    syncInvoicePaymentStatus_(ss, entry.invoiceId, "Successful");
  syncLedgerSales_(ss);

  return {
    ok: true,
    message: idx >= 0 ? "Ledger receipt updated." : "Ledger receipt saved.",
    entry: {
      ...entry,
      id,
      type: "Receipt",
      amount,
      credit: amount,
      balance: remaining,
      status,
    },
  };
}

function syncLedgerSales_(ss) {
  const ledgerSheet = ss.getSheetByName("Ledger");
  const invoiceRows = getRows_(ss.getSheetByName("Invoices"));
  const ledgerRows = getRows_(ledgerSheet);

  invoiceRows.forEach((invoiceRow) => {
    const invoiceId = String(invoiceRow.id || "");
    if (!invoiceId) return;

    const exists = ledgerRows.some(
      (r) =>
        String(r.type).toLowerCase() === "sale" &&
        String(r.invoiceId) === invoiceId,
    );
    if (exists) return;

    const buyer = parseJson_(invoiceRow.buyerJson, {});
    const consignee = parseJson_(invoiceRow.consigneeJson, {});
    const party = buyer.name ? buyer : consignee;
    const items = parseJson_(invoiceRow.itemsJson, []);
    const invoice = {
      mode: String(invoiceRow.mode || "GST"),
      roundOff: Number(invoiceRow.roundOff) || 0,
      items: items,
    };
    const total = invoiceTotal_(invoice);
    const itemSummary = items
      .map((i) => String(i.description || i.name || "Item"))
      .filter(Boolean)
      .join(", ");

    ledgerSheet.appendRow([
      "sale-" + invoiceId,
      String(invoiceRow.date || new Date().toISOString().slice(0, 10)),
      "Sale",
      "",
      String(party.name || ""),
      invoiceId,
      String(invoiceRow.invoiceNo || ""),
      itemSummary,
      total,
      0,
      total,
      total,
      String(invoiceRow.paymentStatus || "Pending") === "Successful"
        ? "Paid"
        : "Pending",
      "",
      "",
      "Invoice sale",
      String(invoiceRow.createdAt || new Date().toISOString()),
    ]);
  });
}

function syncInvoicePaymentStatus_(ss, invoiceId, status) {
  const sheet = ss.getSheetByName("Invoices");
  const rows = getRows_(sheet);
  const idx = rows.findIndex((r) => String(r.id) === String(invoiceId));
  if (idx >= 0) sheet.getRange(idx + 2, 7).setValue(status);
}

function invoiceTotal_(invoice) {
  if (!invoice) return 0;
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const subtotal = items.reduce(
    (sum, item) =>
      sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0),
    0,
  );
  if (String(invoice.mode || "GST") === "NON_GST")
    return Math.round((subtotal + (Number(invoice.roundOff) || 0)) * 100) / 100;
  const tax = items.reduce((sum, item) => {
    const line = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
    return sum + line * ((Number(item.gstRate) || 0) / 100);
  }, 0);
  return (
    Math.round((subtotal + tax + (Number(invoice.roundOff) || 0)) * 100) / 100
  );
}

function deleteById_(sheetName, id) {
  if (!id) return;
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  const rows = getRows_(sheet);
  const idx = rows.findIndex((r) => String(r.id) === String(id));
  if (idx >= 0) sheet.deleteRow(idx + 2);
}

function replaceProducts_(products) {
  const sheet = getSpreadsheet_().getSheetByName("Products");
  clearData_(sheet);
  const rows = products.map((p) => [
    p.id,
    p.name,
    p.hsn,
    p.unit,
    Number(p.rate) || 0,
    Number(p.gstRate) || 0,
    p.category,
    String(!!p.active),
  ]);
  if (rows.length) sheet.getRange(2, 1, rows.length, 8).setValues(rows);
}

function replaceCustomers_(customers) {
  const sheet = getSpreadsheet_().getSheetByName("Customers");
  clearData_(sheet);
  const rows = customers.map((c) => [
    c.id,
    c.name,
    c.address,
    c.contact,
    c.gstin,
    c.state,
    c.stateCode,
  ]);
  if (rows.length) sheet.getRange(2, 1, rows.length, 7).setValues(rows);
}

function upsertCustomer_(customer) {
  if (!customer || !String(customer.name || "").trim())
    throw new Error("Customer name is required.");
  const sheet = getSpreadsheet_().getSheetByName("Customers");
  const rows = getRows_(sheet);
  const name = String(customer.name || "")
    .trim()
    .toLowerCase();
  const gstin = String(customer.gstin || "")
    .trim()
    .toLowerCase();
  const duplicate = rows.find(
    (r) =>
      String(r.id) !== String(customer.id) &&
      String(r.name || "")
        .trim()
        .toLowerCase() === name &&
      String(r.gstin || "")
        .trim()
        .toLowerCase() === gstin,
  );
  if (duplicate)
    throw new Error("A customer with the same name and GSTIN already exists.");
  const id = String(customer.id || Utilities.getUuid());
  const row = [
    id,
    String(customer.name || "").trim(),
    customer.address || "",
    customer.contact || "",
    customer.gstin || "",
    customer.state || "",
    customer.stateCode || "",
  ];
  const idx = rows.findIndex((r) => String(r.id) === id);
  if (idx >= 0) sheet.getRange(idx + 2, 1, 1, 7).setValues([row]);
  else sheet.appendRow(row);
}

function uploadStamp_(p) {
  if (!p || !p.dataUrl) throw new Error("No image received.");

  const folder = getOrCreateFolder_();
  const mimeType = String(p.mimeType || "image/png");
  const dataUrl = String(p.dataUrl);
  const base64 = dataUrl.replace(/^data:[^;]+;base64,/, "");

  if (!base64) throw new Error("Invalid image data.");

  const bytes = Utilities.base64Decode(base64);
  const ext = extension_(mimeType);
  const filename = STAMP_NAME + ext;

  // Remove older copies so the Drive folder always contains the latest stamp.
  const old = folder.getFiles();
  while (old.hasNext()) {
    const oldFile = old.next();
    if (
      String(oldFile.getName()).indexOf(STAMP_NAME) === 0 &&
      !oldFile.isTrashed()
    ) {
      try {
        oldFile.setTrashed(true);
      } catch (_) {}
    }
  }

  const file = folder.createFile(Utilities.newBlob(bytes, mimeType, filename));

  // Sharing can be blocked by a Workspace administrator. The Drive file is still
  // successfully stored, so do not fail the upload if sharing is unavailable.
  let sharingEnabled = false;
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    sharingEnabled = true;
  } catch (_) {}

  const result = {
    ok: true,
    fileId: file.getId(),
    folderId: folder.getId(),
    url: "https://drive.google.com/uc?export=view&id=" + file.getId(),
    sharingEnabled: sharingEnabled,
  };

  // Persist the Drive reference immediately in Google Sheets. This means the
  // stamp remains linked even if the browser closes after the upload.
  saveCompany_({
    stampDriveFileId: result.fileId,
    stampDriveFolderId: result.folderId,
    stampImage: result.url,
  });

  return result;
}

function readStamp_() {
  const folder = getOrCreateFolder_();
  const candidates = [];
  const it = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (String(f.getName()).indexOf(STAMP_NAME) === 0 && !f.isTrashed())
      candidates.push(f);
  }
  if (!candidates.length) return null;
  const file = candidates[candidates.length - 1];
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (_) {}
  return {
    fileId: file.getId(),
    folderId: folder.getId(),
    url: "https://drive.google.com/uc?export=view&id=" + file.getId(),
  };
}

function getOrCreateFolder_() {
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  return folders.hasNext()
    ? folders.next()
    : DriveApp.createFolder(FOLDER_NAME);
}

function getSpreadsheet_() {
  // Prefer the spreadsheet the Apps Script project is bound to. This makes the
  // client setup simple: create one blank Google Sheet and open Extensions > Apps Script.
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) {
      PropertiesService.getScriptProperties().setProperty(
        PROP_SPREADSHEET_ID,
        active.getId(),
      );
      return active;
    }
  } catch (_) {}
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(PROP_SPREADSHEET_ID);
  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (_) {}
  }
  const ss = SpreadsheetApp.create("Deal Magsil Billing Data");
  props.setProperty(PROP_SPREADSHEET_ID, ss.getId());
  return ss;
}

function ensureSheets_(ss) {
  Object.keys(HEADERS).forEach((name) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    const headers = HEADERS[name];
    if (sheet.getLastRow() === 0)
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  });
  const first = ss.getSheets()[0];
  if (
    first.getName() === "Sheet1" &&
    Object.keys(HEADERS).indexOf(first.getName()) < 0 &&
    ss.getSheets().length > 1
  )
    ss.deleteSheet(first);
}

function getRows_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values
    .slice(1)
    .filter((row) => row.some((v) => v !== ""))
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });
}

function clearData_(sheet) {
  if (sheet.getLastRow() > 1)
    sheet
      .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
      .clearContent();
}
function parseJson_(value, fallback) {
  try {
    return value ? JSON.parse(String(value)) : fallback;
  } catch (_) {
    return fallback;
  }
}
function decodePayload_(value) {
  if (!value) return {};
  const text = Utilities.newBlob(
    Utilities.base64DecodeWebSafe(value),
  ).getDataAsString("UTF-8");
  return JSON.parse(text);
}
function starterCompany_() {
  return {
    name: "DEAL MAGSIL",
    tagline: "PRECAST CONCRETE & PAVING SOLUTIONS",
    address: "Plot A/7, A/8 ADDA Industrial Estate, Kanyapur, Asansol - 713305",
    phone: "+91 9332331442",
    email: "abhradey11@gmail.com",
    gstin: "",
    state: "WEST BENGAL",
    stateCode: "19",
    pan: "",
    bankHolder: "DEAL MAGSIL",
    bankName: "",
    accountNo: "",
    branch: "",
    ifsc: "",
    jurisdiction: "ASANSOL",
    stampImage: "",
    stampDriveFileId: "",
    stampDriveFolderId: "",
    googleDriveUploadUrl: "",
  };
}

function starterProducts_() {
  return [
    ["paving-blocks", "Paving Blocks", "", "Pcs", 0, 18, "Paving", "true"],
    [
      "concrete-cobbles",
      "Concrete Cobbles",
      "",
      "Pcs",
      0,
      18,
      "Paving",
      "true",
    ],
    ["flagstones", "Flagstones", "", "Pcs", 0, 18, "Paving", "true"],
    ["kerbstones", "Kerbstones", "", "Pcs", 0, 18, "Precast", "true"],
    ["drain-covers", "Drain Covers", "", "Pcs", 0, 18, "Precast", "true"],
    [
      "grass-pavers",
      "Grass Pavers & Grids",
      "",
      "Pcs",
      0,
      18,
      "Paving",
      "true",
    ],
    [
      "landscaping-tiles",
      "Landscaping Tiles",
      "",
      "Pcs",
      0,
      18,
      "Paving",
      "true",
    ],
    ["paveit", "PAVEIT", "", "Pcs", 0, 18, "Paving", "true"],
    ["cement-block", "Cement Block", "", "Pcs", 0, 18, "Precast", "true"],
    ["rcc-pillar", "RCC Pillar", "", "Pcs", 0, 18, "Precast", "true"],
  ].map((r) => ({
    id: r[0],
    name: r[1],
    hsn: r[2],
    unit: r[3],
    rate: r[4],
    gstRate: r[5],
    category: r[6],
    active: true,
  }));
}
function extension_(mimeType) {
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/webp") return ".webp";
  return ".png";
}
function jsonp_(data, callback) {
  const json = JSON.stringify(data).replace(/<\//g, "<\\/");
  if (!callback)
    return ContentService.createTextOutput(json).setMimeType(
      ContentService.MimeType.JSON,
    );
  return ContentService.createTextOutput(
    String(callback).replace(/[^a-zA-Z0-9_$]/g, "") + "(" + json + ")",
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}
function html_(message) {
  return HtmlService.createHtmlOutput(
    "<!doctype html><html><body><pre>" +
      escapeHtml_(message) +
      "</pre></body></html>",
  );
}
function escapeHtml_(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

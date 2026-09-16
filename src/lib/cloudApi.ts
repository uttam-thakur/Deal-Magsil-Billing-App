// export type CloudPayload = {
//   company: import("@/types").CompanySettings;
//   products: import("@/types").Product[];
//   customers: import("@/types").Customer[];
//   invoices: import("@/types").Invoice[];
//   ledgerEntries: import("@/types").LedgerEntry[];
//   user: { username: string };
// };

// const SESSION_TOKEN = "deal-magsil-cloud-token";
// const SESSION_URL = "deal-magsil-cloud-url";

// export function getCloudUrl() {
//   if (typeof window === "undefined") return "";
//   return sessionStorage.getItem(SESSION_URL) || "";
// }
// export function setCloudUrl(url: string) {
//   if (typeof window !== "undefined")
//     sessionStorage.setItem(SESSION_URL, url.trim());
// }
// export function getToken() {
//   if (typeof window === "undefined") return "";
//   return sessionStorage.getItem(SESSION_TOKEN) || "";
// }
// function setToken(token: string) {
//   if (typeof window !== "undefined")
//     sessionStorage.setItem(SESSION_TOKEN, token);
// }
// export function clearCloudSession() {
//   if (typeof window === "undefined") return;
//   sessionStorage.removeItem(SESSION_TOKEN);
//   sessionStorage.removeItem(SESSION_URL);
// }

// function encode(value: unknown) {
//   const bytes = new TextEncoder().encode(JSON.stringify(value));
//   let binary = "";
//   bytes.forEach((b) => {
//     binary += String.fromCharCode(b);
//   });
//   return btoa(binary)
//     .replace(/\+/g, "-")
//     .replace(/\//g, "_")
//     .replace(/=+$/g, "");
// }

// export async function sha256(value: string) {
//   const data = new TextEncoder().encode(value);
//   const hash = await crypto.subtle.digest("SHA-256", data);
//   return Array.from(new Uint8Array(hash))
//     .map((b) => b.toString(16).padStart(2, "0"))
//     .join("");
// }

// function jsonp<T>(url: string, params: Record<string, string>): Promise<T> {
//   return new Promise((resolve, reject) => {
//     const callback = `dm_jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
//     const script = document.createElement("script");
//     const query = new URLSearchParams({ ...params, callback });
//     let timer: number | undefined;
//     const cleanup = () => {
//       if (timer) window.clearTimeout(timer);
//       delete (window as unknown as Record<string, unknown>)[callback];
//       script.remove();
//     };
//     (window as unknown as Record<string, unknown>)[callback] = (result: T) => {
//       cleanup();
//       resolve(result);
//     };
//     script.onerror = () => {
//       cleanup();
//       reject(new Error("Unable to reach Google Sheets Web App."));
//     };
//     script.src = `${url.replace(/\/$/, "")}?${query.toString()}`;
//     document.body.appendChild(script);
//     timer = window.setTimeout(() => {
//       cleanup();
//       reject(new Error("Google Sheets request timed out."));
//     }, 20000);
//   });
// }

// export async function login(url: string, username: string, password: string) {
//   setCloudUrl(url);
//   const passwordHash = await sha256(password);
//   const result = await jsonp<{
//     ok: boolean;
//     token?: string;
//     user?: { username: string };
//     error?: string;
//   }>(url, { action: "login", username, passwordHash });
//   if (!result.ok || !result.token)
//     throw new Error(result.error || "Invalid username or password.");
//   setToken(result.token);
//   return result.user || { username };
// }

// export async function nextInvoiceNumber(url = getCloudUrl()) {
//   const result = await jsonp<{
//     ok: boolean;
//     invoiceNo?: string;
//     error?: string;
//   }>(url, { action: "nextInvoiceNumber", token: getToken() });
//   if (!result.ok || !result.invoiceNo)
//     throw new Error(result.error || "Unable to generate invoice number.");
//   return result.invoiceNo;
// }

// export async function bootstrap(url = getCloudUrl()) {
//   const result = await jsonp<{
//     ok: boolean;
//     data?: CloudPayload;
//     error?: string;
//   }>(url, { action: "bootstrap", token: getToken() });
//   if (!result.ok || !result.data)
//     throw new Error(result.error || "Unable to load cloud data.");
//   return result.data;
// }

// /**
//  * Apps Script Web Apps do not expose permissive CORS headers for browser POSTs.
//  * We therefore send a simple no-cors POST (no iframe, so no X-Frame-Options error)
//  * and then poll a JSONP GET endpoint for the server-side mutation result.
//  */
// export async function postCloud<T = Record<string, unknown>>(
//   action: string,
//   payload: Record<string, unknown>,
//   url = getCloudUrl(),
// ): Promise<T> {
//   if (!url || !getToken()) throw new Error("Cloud session is not connected.");
//   const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
//   const body = new URLSearchParams({
//     action,
//     token: getToken(),
//     requestId,
//     payload: encode(payload),
//   });
//   try {
//     await fetch(url, {
//       method: "POST",
//       mode: "no-cors",
//       headers: {
//         "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
//       },
//       body,
//     });
//   } catch (_) {
//     throw new Error("Unable to reach Google Sheets Web App.");
//   }
//   const started = Date.now();
//   while (Date.now() - started < 20000) {
//     try {
//       const result = await jsonp<{ ok: boolean; result?: T; error?: string }>(
//         url,
//         { action: "mutationStatus", token: getToken(), requestId },
//       );
//       if (result.ok) return (result.result || {}) as T;
//       if (result.error && result.error !== "Mutation is still processing.")
//         throw new Error(result.error);
//     } catch (error) {
//       if (
//         error instanceof Error &&
//         !/Mutation is still processing/.test(error.message)
//       )
//         throw error;
//     }
//     await new Promise((resolve) => window.setTimeout(resolve, 350));
//   }
//   throw new Error(
//     "Google Sheets save timed out. Please check your Apps Script deployment.",
//   );
// }

// export async function saveEntity(
//   action:
//     | "saveCompany"
//     | "saveProduct"
//     | "saveCustomer"
//     | "saveInvoice"
//     | "deleteProduct"
//     | "deleteCustomer"
//     | "deleteInvoice"
//     | "saveLedgerEntry"
//     | "deleteLedgerEntry",
//   entity: unknown,
// ) {
//   return postCloud(action, { entity });
// }

// export async function changePassword(
//   currentPassword: string,
//   newPassword: string,
// ) {
//   await postCloud("changePassword", {
//     currentPasswordHash: await sha256(currentPassword),
//     newPasswordHash: await sha256(newPassword),
//   });
// }

// export async function getStamp(url = getCloudUrl()) {
//   const result = await jsonp<{
//     ok: boolean;
//     stamp?: { fileId: string; folderId: string; url: string };
//     error?: string;
//   }>(url, { action: "stamp", token: getToken() });
//   if (!result.ok)
//     throw new Error(result.error || "Unable to load company stamp.");
//   return result.stamp || null;
// }



export type CloudPayload = {
  company: import("@/types").CompanySettings;
  products: import("@/types").Product[];
  customers: import("@/types").Customer[];
  invoices: import("@/types").Invoice[];
  ledgerEntries: import("@/types").LedgerEntry[];
  user: { username: string };
};

const SESSION_TOKEN = "deal-magsil-cloud-token";
const SESSION_URL = "deal-magsil-cloud-url";

export function getCloudUrl(): string {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem(SESSION_URL) ||
    sessionStorage.getItem(SESSION_URL) ||
    ""
  );
}

export function setCloudUrl(url: string): void {
  if (typeof window === "undefined") return;

  const value = url.trim();

  localStorage.setItem(SESSION_URL, value);
  sessionStorage.setItem(SESSION_URL, value);
}

export function getToken(): string {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem(SESSION_TOKEN) ||
    sessionStorage.getItem(SESSION_TOKEN) ||
    ""
  );
}

function setToken(token: string): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(SESSION_TOKEN, token);
  sessionStorage.setItem(SESSION_TOKEN, token);
}

export function clearCloudSession(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(SESSION_TOKEN);
  localStorage.removeItem(SESSION_URL);
  sessionStorage.removeItem(SESSION_TOKEN);
  sessionStorage.removeItem(SESSION_URL);
}

function isSessionExpiredError(error?: string): boolean {
  const message = String(error || "").toLowerCase();

  return (
    message.includes("session_expired") ||
    message.includes("session expired") ||
    message.includes("not signed in")
  );
}

function encode(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function jsonp<T>(
  url: string,
  params: Record<string, string>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error("Google Sheets Web App URL is not configured."));
      return;
    }

    const callback = `dm_jsonp_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

    const script = document.createElement("script");
    const query = new URLSearchParams({ ...params, callback });

    let timer: number | undefined;

    const cleanup = () => {
      if (timer) window.clearTimeout(timer);

      delete (window as unknown as Record<string, unknown>)[callback];
      script.remove();
    };

    (window as unknown as Record<string, unknown>)[callback] = (
      result: T,
    ) => {
      cleanup();
      resolve(result);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Unable to reach Google Sheets Web App."));
    };

    script.src = `${url.replace(/\/$/, "")}?${query.toString()}`;
    document.body.appendChild(script);

    timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Google Sheets request timed out."));
    }, 20000);
  });
}

export async function login(
  url: string,
  username: string,
  password: string,
) {
  const cleanUrl = url.trim();

  if (!cleanUrl) {
    throw new Error("Google Apps Script Web App URL is required.");
  }

  if (!cleanUrl.includes("/exec")) {
    throw new Error(
      "Please use the deployed Google Apps Script Web App URL ending with /exec.",
    );
  }

  setCloudUrl(cleanUrl);

  const passwordHash = await sha256(password);

  const result = await jsonp<{
    ok: boolean;
    token?: string;
    user?: { username: string };
    error?: string;
  }>(cleanUrl, {
    action: "login",
    username: username.trim(),
    passwordHash,
  });

  if (!result.ok || !result.token) {
    throw new Error(
      result.error || "Invalid username or password.",
    );
  }

  setToken(result.token);

  return result.user || { username: username.trim() };
}

export async function nextInvoiceNumber(
  url = getCloudUrl(),
): Promise<string> {
  const token = getToken();

  if (!token) {
    clearCloudSession();
    throw new Error("SESSION_EXPIRED");
  }

  const result = await jsonp<{
    ok: boolean;
    invoiceNo?: string;
    error?: string;
  }>(url, {
    action: "nextInvoiceNumber",
    token,
  });

  if (!result.ok || !result.invoiceNo) {
    if (isSessionExpiredError(result.error)) {
      clearCloudSession();
    }

    throw new Error(
      result.error || "Unable to generate invoice number.",
    );
  }

  return result.invoiceNo;
}

export async function bootstrap(
  url = getCloudUrl(),
): Promise<CloudPayload> {
  const cleanUrl = url.trim();
  const token = getToken();

  if (!cleanUrl) {
    throw new Error("Google Sheets Web App URL is not configured.");
  }

  if (!token) {
    clearCloudSession();
    throw new Error("SESSION_EXPIRED");
  }

  const result = await jsonp<{
    ok: boolean;
    data?: CloudPayload;
    error?: string;
  }>(cleanUrl, {
    action: "bootstrap",
    token,
  });

  if (!result.ok || !result.data) {
    if (isSessionExpiredError(result.error)) {
      clearCloudSession();
    }

    throw new Error(
      result.error || "Unable to load cloud data.",
    );
  }

  return result.data;
}

/**
 * Apps Script Web Apps do not expose permissive CORS headers for
 * browser POSTs. We therefore send a no-cors POST and then poll
 * mutationStatus through JSONP GET.
 */
export async function postCloud<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown>,
  url = getCloudUrl(),
): Promise<T> {
  const cleanUrl = url.trim();
  const token = getToken();

  if (!cleanUrl) {
    throw new Error("Google Sheets Web App URL is not configured.");
  }

  if (!token) {
    clearCloudSession();
    throw new Error("SESSION_EXPIRED");
  }

  const requestId = `req_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}`;

  const body = new URLSearchParams({
    action,
    token,
    requestId,
    payload: encode(payload),
  });

  try {
    await fetch(cleanUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body,
    });
  } catch {
    throw new Error("Unable to reach Google Sheets Web App.");
  }

  const started = Date.now();

  while (Date.now() - started < 20000) {
    try {
      const result = await jsonp<{
        ok: boolean;
        pending?: boolean;
        result?: T;
        error?: string;
      }>(cleanUrl, {
        action: "mutationStatus",
        token: getToken(),
        requestId,
      });

      if (result.ok) {
        return (result.result || {}) as T;
      }

      if (
        result.error &&
        result.error !== "Mutation is still processing."
      ) {
        if (isSessionExpiredError(result.error)) {
          clearCloudSession();
        }

        throw new Error(result.error);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (isSessionExpiredError(error.message)) {
          clearCloudSession();
          throw error;
        }

        if (
          !/Mutation is still processing/i.test(error.message)
        ) {
          throw error;
        }
      }
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 350);
    });
  }

  throw new Error(
    "Google Sheets save timed out. Please check your Apps Script deployment.",
  );
}

export async function saveEntity(
  action:
    | "saveCompany"
    | "saveProduct"
    | "saveCustomer"
    | "saveInvoice"
    | "deleteProduct"
    | "deleteCustomer"
    | "deleteInvoice"
    | "saveLedgerEntry"
    | "deleteLedgerEntry",
  entity: unknown,
) {
  return postCloud(action, { entity });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
) {
  await postCloud("changePassword", {
    currentPasswordHash: await sha256(currentPassword),
    newPasswordHash: await sha256(newPassword),
  });
}

export async function getStamp(
  url = getCloudUrl(),
) {
  const token = getToken();

  if (!token) {
    clearCloudSession();
    throw new Error("SESSION_EXPIRED");
  }

  const result = await jsonp<{
    ok: boolean;
    stamp?: {
      fileId: string;
      folderId: string;
      url: string;
    };
    error?: string;
  }>(url, {
    action: "stamp",
    token,
  });

  if (!result.ok) {
    if (isSessionExpiredError(result.error)) {
      clearCloudSession();
    }

    throw new Error(
      result.error || "Unable to load company stamp.",
    );
  }

  return result.stamp || null;
}

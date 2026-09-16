# Deal Magsil Google Sheets Cloud Backend

This Apps Script is the backend for the Deal Magsil billing app. It uses one Google Spreadsheet workbook and separate sheets for each data area.

## Deploy

1. Open https://script.google.com/ while signed in to the Google account that should own Deal Magsil data.
2. Create a new project.
3. Replace the editor code with `Code.gs`.
4. Save.
5. Deploy → New deployment → Web app.
6. Execute as: **Me**.
7. Who has access: **Anyone**.
8. Authorize Google Sheets and Drive access.
9. Copy the `/exec` Web App URL.
10. Paste it into the Deal Magsil login screen.

The script automatically creates **Deal Magsil Billing Data** in the owner's Google Drive and these tabs:

- `Users` — login accounts and password hashes
- `Company` — company settings
- `Products` — product master
- `Customers` — customer master
- `Invoices` — complete invoice records, including metadata, parties and line items

## Initial login

- Username: `admin`
- Password: `DealMagsil@123`

Change it after first login from **Company → Account → Change Password**.

## Important

The Web App is deliberately accessible from the browser without Google OAuth because the Next.js frontend uses JSONP for reads and hidden-form POSTs for writes. The backend validates a short-lived session token before returning or changing data.

For a higher-security multi-user deployment, replace the bundled login layer with Google Identity/OAuth or another proper identity provider.

## Important update for the latest version

This version no longer submits POST requests through a hidden iframe. The frontend uses a `no-cors` POST and then polls the Apps Script for the mutation result. This removes the browser console error:

`Refused to display 'https://script.google.com/' in a frame because it set 'X-Frame-Options' to 'sameorigin'.`

It also adds dedicated product save/update/delete operations and server-side duplicate protection.

### If you already deployed an older Apps Script

Replace the old `Code.gs` with this version and then:

1. Click **Deploy → Manage deployments**.
2. Open the existing Web App deployment.
3. Choose **Edit**.
4. Select **New version**.
5. Deploy.
6. Keep the same `/exec` URL in the billing app.

The latest script prefers the spreadsheet that the Apps Script is bound to. Therefore the recommended setup is one Google Sheet → **Extensions → Apps Script** → paste `Code.gs` → deploy as Web App.

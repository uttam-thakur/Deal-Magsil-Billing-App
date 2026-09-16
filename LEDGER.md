# Deal Magsil Ledger

The Ledger page is a Tally-style party ledger added to the billing application.

## Ledger model

- **Sales / Debit** comes from saved invoices.
- **Receipt / Credit** comes from entries recorded through `Record Payment`.
- An invoice marked **Successful** is treated as fully received when there is no explicit receipt entry for it.
- A **Pending** invoice reduces the customer balance only when a receipt is recorded.
- On-account receipts can be recorded without linking an invoice and reduce the customer's outstanding balance.
- The page supports customer, invoice and date filters.
- Date filters show an opening balance before the selected start date when an explicit From Date is used.
- Invoice-linked receipts cannot exceed the current outstanding amount; successful invoices cannot receive another linked receipt.

## Google Sheets

The Apps Script automatically creates a `Ledger` sheet with these columns:

`id, date, type, customerId, customerName, invoiceId, invoiceNo, amount, paymentMode, reference, notes, createdAt`

Replace the deployed `Code.gs` with the version in `google-apps-script/Code.gs`, then create a new Web App deployment version.

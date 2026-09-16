export type BillMode = 'GST' | 'NON_GST';
export type TaxMode = 'INTRA' | 'INTER';
export type PaymentStatus = 'Successful' | 'Pending';

export interface CompanySettings {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  state: string;
  stateCode: string;
  pan: string;
  bankHolder: string;
  bankName: string;
  accountNo: string;
  branch: string;
  ifsc: string;
  jurisdiction: string;
  stampImage: string;
  stampDriveFileId: string;
  stampDriveFolderId: string;
  googleDriveUploadUrl: string;
}

export interface Party {
  name: string;
  address: string;
  contact: string;
  gstin: string;
  state: string;
  stateCode: string;
}

export interface Product {
  id: string;
  name: string;
  hsn: string;
  unit: string;
  rate: number;
  costPrice?: number;
  gstRate: number;
  category: string;
  active: boolean;
}

export interface Item {
  id: string;
  productId?: string;
  description: string;
  hsn: string;
  quantity: number;
  unit: string;
  rate: number;
  costPrice?: number;
  gstRate: number;
}

export interface InvoiceMeta {
  invoiceNo: string;
  date: string;
  deliveryNote: string;
  paymentTerms: string;
  termsOfPayment: string;
  referenceNo: string;
  referenceDate: string;
  otherReferences: string;
  buyerOrderNo: string;
  buyerOrderDate: string;
  dispatchDocNo: string;
  deliveryNoteDate: string;
  dispatchedThrough: string;
  destination: string;
  termsOfDelivery: string;
  termsAndConditions: string[];
}

export interface Invoice {
  id: string;
  mode: BillMode;
  taxMode: TaxMode;
  meta: InvoiceMeta;
  consignee: Party;
  buyer: Party;
  buyerSameAsConsignee: boolean;
  items: Item[];
  roundOff: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

export interface Customer extends Party {
  id: string;
}

export type LedgerEntryType = 'Receipt';
export type LedgerPaymentMode = 'Cash' | 'UPI' | 'Bank' | 'Cheque' | 'Other';

export interface LedgerEntry {
  id: string;
  date: string;
  type: LedgerEntryType;
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNo: string;
  amount: number;
  paymentMode: LedgerPaymentMode;
  reference: string;
  notes: string;
  createdAt: string;
}

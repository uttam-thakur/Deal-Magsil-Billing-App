import { CompanySettings, Customer, Invoice, Product } from '@/types';

export const companyDefaults: CompanySettings = {
  name: 'DEAL MAGSIL',
  tagline: 'PRECAST CONCRETE & PAVING SOLUTIONS',
  address: 'Plot A/7, A/8 ADDA Industrial Estate, Kanyapur, Asansol - 713305',
  phone: '+91 9332331442',
  email: 'abhradey11@gmail.com',
  gstin: '',
  state: 'WEST BENGAL',
  stateCode: '19',
  pan: '',
  bankHolder: 'DEAL MAGSIL',
  bankName: '',
  accountNo: '',
  branch: '',
  ifsc: '',
  jurisdiction: 'ASANSOL',
  stampImage: '',
  stampDriveFileId: '',
  stampDriveFolderId: '',
  googleDriveUploadUrl: '',
};

export const starterProducts: Product[] = [
  { id:'paving-blocks', name:'Paving Blocks', hsn:'', unit:'Pcs', rate:0, costPrice:0, gstRate:18, category:'Paving', active:true },
  { id:'concrete-cobbles', name:'Concrete Cobbles', hsn:'', unit:'Pcs', rate:0, costPrice:0, gstRate:18, category:'Paving', active:true },
  { id:'flagstones', name:'Flagstones', hsn:'', unit:'Pcs', rate:0, costPrice:0, gstRate:18, category:'Paving', active:true },
  { id:'kerbstones', name:'Kerbstones', hsn:'', unit:'Pcs', rate:0, costPrice:0, gstRate:18, category:'Precast', active:true },
  { id:'drain-covers', name:'Drain Covers', hsn:'', unit:'Pcs', rate:0, costPrice:0, gstRate:18, category:'Precast', active:true },
  { id:'grass-pavers', name:'Grass Pavers & Grids', hsn:'', unit:'Pcs', rate:0, costPrice:0, gstRate:18, category:'Paving', active:true },
  { id:'landscaping-tiles', name:'Landscaping Tiles', hsn:'', unit:'Pcs', rate:0, costPrice:0, gstRate:18, category:'Paving', active:true },
  { id:'paveit', name:'PAVEIT', hsn:'', unit:'Pcs', rate:0, costPrice:0, gstRate:18, category:'Paving', active:true },
  { id:'cement-block', name:'Cement Block', hsn:'', unit:'Pcs', rate:0, costPrice:0, gstRate:18, category:'Precast', active:true },
  { id:'rcc-pillar', name:'RCC Pillar', hsn:'', unit:'Pcs', rate:0, costPrice:0, gstRate:18, category:'Precast', active:true },
];

export const emptyParty = (): Customer => ({ id: crypto.randomUUID(), name:'', address:'', contact:'', gstin:'', state:'WEST BENGAL', stateCode:'19' });

export const createInvoice = (number = 'DM/26-27/001'): Invoice => ({
  id: crypto.randomUUID(), mode:'GST', taxMode:'INTRA',
  meta:{ invoiceNo:number, date:new Date().toISOString().slice(0,10), deliveryNote:'', paymentTerms:'', termsOfPayment:'', referenceNo:'', referenceDate:'', otherReferences:'', buyerOrderNo:'', buyerOrderDate:'', dispatchDocNo:'', deliveryNoteDate:'', dispatchedThrough:'', destination:'', termsOfDelivery:'', termsAndConditions:['','','','',''] },
  consignee:emptyParty(), buyer:emptyParty(), buyerSameAsConsignee:false,
  items:[{id:crypto.randomUUID(), productId:'', description:'', hsn:'', quantity:1, unit:'Pcs', rate:0, costPrice:0, gstRate:18}],
  roundOff:0, paymentStatus:'Pending', createdAt:new Date().toISOString()
});

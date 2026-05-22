export const RECEIPT_RUSH_REWARD_BLUE = 2000;

export type ReceiptRushCategory = {
  id: string;
  label: string;
  description: string;
  taxTypes: string[];
};

export const RECEIPT_RUSH_CATEGORIES: ReceiptRushCategory[] = [
  {
    id: 'etax-domestic',
    label: 'eTax Domestic Taxes',
    description: 'PAYE, VAT, income tax, and local domestic obligations.',
    taxTypes: ['VAT', 'PAYE', 'Withholding Tax', 'Income Tax', 'Rental Tax'],
  },
  {
    id: 'customs-ascyuda',
    label: 'Customs (ASYCUDA)',
    description: 'Import/export customs entries and customs duty receipts.',
    taxTypes: ['Import Duty', 'Excise (Imports)', 'Import VAT', 'Processing Fee'],
  },
  {
    id: 'efris-invoicing',
    label: 'EFRIS Invoicing',
    description: 'E-invoicing and fiscal receipts generated via EFRIS.',
    taxTypes: ['EFRIS Fiscal Receipt', 'Sales Invoice', 'Credit Note'],
  },
  {
    id: 'motor-transport',
    label: 'Motor Vehicle & Transport',
    description: 'Motor vehicle registration and transport-related URA payments.',
    taxTypes: ['Motor Vehicle Registration', 'Road User Fees', 'Permit Charges'],
  },
  {
    id: 'stamp-duty',
    label: 'Stamp Duty & Fees',
    description: 'Stamp duty and related transactional tax payments.',
    taxTypes: ['Stamp Duty', 'Transfer Duty', 'Document Processing Fee'],
  },
  {
    id: 'excise-domestic',
    label: 'Excise & Specialized Taxes',
    description: 'Sector-specific excise and special tax categories.',
    taxTypes: ['Excise Duty (Domestic)', 'Gaming & Betting Tax', 'Digital Service Tax'],
  },
];

export function findReceiptRushCategory(categoryId: string): ReceiptRushCategory | null {
  return RECEIPT_RUSH_CATEGORIES.find((c) => c.id === categoryId) ?? null;
}

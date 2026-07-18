/** Client-safe receipt branding shapes (no server imports). */

export type ReceiptBrandingBlock = {
  name: string;
  logoUrl: string | null;
  phone: string;
  email: string;
  address: string;
  website: string;
};

export type ReceiptBranding = {
  platform: ReceiptBrandingBlock;
  school: ReceiptBrandingBlock;
  periodLabel: string;
};

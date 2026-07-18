"use client";

import type { ReceiptBrandingBlock } from "@/lib/receipt-branding-types";

export function ReceiptLetterhead({
  platform,
  school,
}: {
  platform: ReceiptBrandingBlock;
  school: ReceiptBrandingBlock;
}) {
  return (
    <div className="space-y-4 border-b border-slate-200 pb-4 text-left">
      <div className="flex items-start gap-3">
        {platform.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={platform.logoUrl} alt={platform.name} className="h-12 w-12 object-contain" />
        ) : null}
        <div className="min-w-0">
          <p className="text-base font-bold tracking-tight text-slate-900">{platform.name}</p>
          <p className="text-xs text-slate-500">Official receipt platform</p>
          <ContactLines phone={platform.phone} email={platform.email} />
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
        {school.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={school.logoUrl} alt={school.name} className="h-12 w-12 rounded object-contain bg-white" />
        ) : null}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{school.name}</p>
          <ContactLines phone={school.phone} email={school.email} address={school.address} website={school.website} />
        </div>
      </div>
    </div>
  );
}

function ContactLines({
  phone,
  email,
  address,
  website,
}: {
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
}) {
  const lines = [phone, email, address, website].filter((x) => x?.trim());
  if (!lines.length) return null;
  return (
    <ul className="mt-1 space-y-0.5 text-[11px] leading-snug text-slate-600">
      {phone?.trim() ? <li>{phone.trim()}</li> : null}
      {email?.trim() ? <li>{email.trim()}</li> : null}
      {address?.trim() ? <li>{address.trim()}</li> : null}
      {website?.trim() ? <li className="break-all">{website.trim()}</li> : null}
    </ul>
  );
}

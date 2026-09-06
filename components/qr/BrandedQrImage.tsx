"use client";

import { useEffect, useState } from "react";
import { buildBrandedQrDataUrl } from "@/lib/branded-qr";

/** Client QR with OPGB center mark (ECC H); for receipt pages / modals. */
export function BrandedQrImage({
  payload,
  alt,
  className,
  size = 180,
}: {
  payload: string;
  alt: string;
  className?: string;
  size?: number;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void buildBrandedQrDataUrl(payload, { size, margin: 1 })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [payload, size]);

  if (!src) {
    return <p className="text-center text-xs text-slate-500">Generating QR…</p>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} width={size} height={size} />
  );
}

"use client";

import Image from "next/image";
import type { ProductLogoId } from "@/lib/platform-brand";

/** Renders a MAC-uploaded product logo when present. */
export function ProductBrandMark({
  product,
  url,
  label,
  size = 48,
  className = "",
}: {
  product: ProductLogoId;
  url: string | null | undefined;
  label: string;
  size?: number;
  className?: string;
}) {
  if (!url) return null;
  return (
    <Image
      src={url}
      alt={`${label} logo`}
      width={size}
      height={size}
      unoptimized
      data-product-logo={product}
      className={`object-contain ${className}`}
    />
  );
}

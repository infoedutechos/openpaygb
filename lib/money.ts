/** Round TON to 4 decimal places for display and storage consistency. */
export function ugxToTon(ugx: number, ugxPerTon: number): number {
  if (ugxPerTon <= 0) throw new Error("Invalid rate");
  const raw = ugx / ugxPerTon;
  return Math.round(raw * 10_000) / 10_000;
}

export function feeTotal(tuition: number, functional: number): number {
  return tuition + functional;
}

/** Integer nanotons as string for wallet / TON Connect (avoids float drift). */
export function tonToNanotonString(ton: number): string {
  const nano = BigInt(Math.round(Number(ton) * 1e9));
  return nano.toString();
}

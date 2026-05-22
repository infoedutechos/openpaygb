/** Maps POST /api/pearls/me JSON into game store fields (lifetime points, white balance, blue total). */

export type PearlsMeClientSync = {
  setPoints: (n: number) => void;
  setPointsBalance: (n: number) => void;
  setBluePearlsTotal: (n: number) => void;
};

export function applyPearlsMeClientPayload(data: unknown, sync: PearlsMeClientSync): void {
  if (!data || typeof data !== 'object') return;
  const record = data as Record<string, unknown>;
  const balances = record.balances;
  if (!balances || typeof balances !== 'object') return;
  const b = balances as Record<string, unknown>;
  const bp = Math.floor(Number(b.bluePending ?? 0));
  const ba = Math.floor(Number(b.blueApprovedTotal ?? 0));
  const btRaw = b.blueTotal;
  const bt =
    typeof btRaw === 'number' && Number.isFinite(btRaw)
      ? Math.floor(btRaw)
      : Number.isFinite(bp) && Number.isFinite(ba)
        ? bp + ba
        : 0;
  sync.setBluePearlsTotal(Math.max(0, bt));
  const white = Math.floor(Number(b.white ?? 0));
  if (Number.isFinite(white)) sync.setPointsBalance(white);
  const lifetime = Number(b.points);
  if (Number.isFinite(lifetime)) sync.setPoints(Math.floor(lifetime));
}

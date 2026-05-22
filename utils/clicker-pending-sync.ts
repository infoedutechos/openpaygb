export const PENDING_SYNC_KEY = 'clicker_pending_sync';
export const BEACON_SYNC_KEY = 'clicker_beacon_sync';

export type PendingSyncPayload = {
  unsynchronizedPoints?: number;
  points?: number;
  pointsBalance?: number;
  totalTaps?: number;
  savedAt?: number;
};

export type BeaconSyncPayload = {
  unsynchronizedPoints: number;
  sentAt: number;
};

export function readPendingSync(): PendingSyncPayload | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(PENDING_SYNC_KEY) : null;
    if (!raw) return null;
    return JSON.parse(raw) as PendingSyncPayload;
  } catch {
    return null;
  }
}

export function clearPendingSyncKeys() {
  try {
    localStorage.removeItem(PENDING_SYNC_KEY);
    localStorage.removeItem(BEACON_SYNC_KEY);
  } catch {
    /* ignore */
  }
}

export function markBeaconSync(points: number) {
  try {
    const payload: BeaconSyncPayload = { unsynchronizedPoints: points, sentAt: Date.now() };
    localStorage.setItem(BEACON_SYNC_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

/** Skip restoring tap queue if a beacon recently sent the same batch (avoids double credit). */
export function shouldSkipPendingRestore(points: number, maxAgeMs = 5 * 60 * 1000): boolean {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(BEACON_SYNC_KEY) : null;
    if (!raw) return false;
    const beacon = JSON.parse(raw) as BeaconSyncPayload;
    const age = beacon.sentAt != null ? Date.now() - beacon.sentAt : Infinity;
    return (
      age < maxAgeMs &&
      typeof beacon.unsynchronizedPoints === 'number' &&
      beacon.unsynchronizedPoints === points
    );
  } catch {
    return false;
  }
}

// Shared seen-state for in-app notifications (banner + notification center)

const SEEN_IDS_KEY = 'notification_seen_ids';
const SEEN_IDS_MAX = 200;

export function getNotificationSeenIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(SEEN_IDS_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    const list = Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
    return new Set(list.slice(-SEEN_IDS_MAX));
  } catch {
    return new Set();
  }
}

export function markNotificationsAsSeen(ids: string[]) {
  if (typeof window === 'undefined' || ids.length === 0) return;
  try {
    const seen = getNotificationSeenIds();
    ids.forEach((id) => seen.add(id));
    const list = [...seen].slice(-SEEN_IDS_MAX);
    localStorage.setItem(SEEN_IDS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

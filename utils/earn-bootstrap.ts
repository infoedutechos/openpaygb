/**
 * One-shot payload when navigating to Earn from Home (ecosystem overlay) so popups/tabs open correctly.
 */
export const EARN_BOOTSTRAP_KEY = 'ura:earn-bootstrap';

export type EarnBootstrapPayload = {
  activeTabAll?: boolean;
  openReceiptRush?: boolean;
  openDailyCipher?: boolean;
  openDailyCombo?: boolean;
  openWeeklyEvent?: boolean;
  openGlobalTasks?: boolean;
  openMitrolabsQuiz?: boolean;
  openDailyLogin?: boolean;
  openMiniGamesHub?: boolean;
  openLuckySpin?: boolean;
};

export function queueEarnBootstrap(payload: EarnBootstrapPayload): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(EARN_BOOTSTRAP_KEY, JSON.stringify(payload));
}

export function consumeEarnBootstrap(): EarnBootstrapPayload | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(EARN_BOOTSTRAP_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(EARN_BOOTSTRAP_KEY);
  try {
    return JSON.parse(raw) as EarnBootstrapPayload;
  } catch {
    return null;
  }
}

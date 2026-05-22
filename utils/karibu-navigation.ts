const STORAGE_KEY = 'karibu-daily-back';

export type KaribuDailyBackView = 'home' | 'earn' | 'game';

export function navigateToKaribuDaily(
  setCurrentView: (view: string) => void,
  back: KaribuDailyBackView
): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(STORAGE_KEY, back);
  }
  setCurrentView('karibu-daily');
}

export function consumeKaribuDailyBack(): KaribuDailyBackView {
  if (typeof window === 'undefined') return 'home';
  const v = window.sessionStorage.getItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
  if (v === 'earn' || v === 'game' || v === 'home') return v;
  return 'home';
}

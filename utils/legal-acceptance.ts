// Legal acceptance (Privacy Policy & Terms of Service) – persisted in localStorage

const LEGAL_ACCEPTED_KEY = 'afrolumens_legal_accepted';

export function hasAcceptedLegal(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(LEGAL_ACCEPTED_KEY) === '1';
  } catch {
    return false;
  }
}

export function setLegalAccepted(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LEGAL_ACCEPTED_KEY, '1');
  } catch {
    // ignore
  }
}

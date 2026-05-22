'use client';

import { useState, useEffect, useCallback } from 'react';
import { triggerHapticFeedback } from '@/utils/ui';

const SEEN_PREFIX = 'milestoneBannerSeen_';

interface MilestoneBannerData {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  isActive: boolean;
}

function getStorageKey(bannerId: string): string {
  return `${SEEN_PREFIX}${bannerId}`;
}

function getHasSeen(bannerId: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const key = getStorageKey(bannerId);
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function markAsSeen(bannerId: string): void {
  try {
    localStorage.setItem(getStorageKey(bannerId), '1');
  } catch {
    // ignore
  }
}

const FLOWER_COUNT = 24;
const flowers = Array.from({ length: FLOWER_COUNT }, (_, i) => ({
  id: i,
  left: `${(i * 7 + 3) % 94 + 2}%`,
  delay: `${(i * 0.35) % 3}s`,
  duration: `${4 + (i % 3)}s`,
  size: 8 + (i % 4) * 4,
  hue: [320, 45, 350, 30, 330, 55][i % 6],
}));

export default function CongratulationsBanner() {
  const [banner, setBanner] = useState<MilestoneBannerData | null>(null);
  const [visible, setVisible] = useState(false);
  const [messageVisible, setMessageVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    fetch('/api/milestone-banner', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && typeof data.id === 'string' && data.title) {
          setBanner({
            id: data.id,
            title: data.title,
            subtitle: data.subtitle ?? '',
            body: data.body ?? '',
            isActive: data.isActive === true,
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mounted]);

  useEffect(() => {
    if (!banner) return;
    if (getHasSeen(banner.id)) return;
    setVisible(true);
    const t = setTimeout(() => setMessageVisible(true), 2200);
    return () => clearTimeout(t);
  }, [banner]);

  const handleClose = useCallback(() => {
    if (typeof window !== 'undefined') triggerHapticFeedback(window);
    if (banner) markAsSeen(banner.id);
    setVisible(false);
  }, [banner]);

  if (!visible || !banner) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-5 py-6 tg-safe-area-padding"
      style={{
        background:
          'linear-gradient(180deg, rgba(15,18,25,0.97) 0%, rgba(25,28,38,0.98) 50%, rgba(15,18,25,0.97) 100%)',
        backdropFilter: 'blur(8px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="congratulations-title"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {flowers.map((f) => (
          <div
            key={f.id}
            className="absolute rounded-full flower-fall"
            style={{
              left: f.left,
              top: '-5%',
              width: f.size,
              height: f.size,
              animationDelay: f.delay,
              animationDuration: f.duration,
              background: `radial-gradient(circle at 30% 30%, hsl(${f.hue}, 75%, 85%), hsl(${f.hue}, 70%, 55%))`,
              boxShadow: `
                0 0 ${f.size * 1.5}px hsl(${f.hue}, 80%, 70%),
                0 0 ${f.size * 2.5}px hsl(${f.hue}, 70%, 50%),
                inset 0 0 ${f.size * 0.5}px rgba(255,255,255,0.5)
              `,
            }}
          />
        ))}
      </div>

      <div
        className={`relative z-10 w-full max-w-md rounded-3xl px-6 py-8 text-center shadow-2xl transition-all duration-700 ${
          messageVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{
          background:
            'linear-gradient(145deg, rgba(45,48,58,0.95) 0%, rgba(30,33,42,0.98) 100%)',
          border: '1px solid rgba(243, 186, 47, 0.25)',
          boxShadow:
            '0 0 40px rgba(243, 186, 47, 0.08), 0 25px 50px rgba(0,0,0,0.4)',
        }}
      >
        <div className="mb-4 flex justify-center">
          <span className="text-4xl" aria-hidden>
            🎉
          </span>
        </div>
        <h2
          id="congratulations-title"
          className="text-xl sm:text-2xl font-bold text-white leading-tight mb-3"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
        >
          {banner.title}
        </h2>
        {banner.subtitle ? (
          <p className="text-[#f3ba2f] font-semibold text-base sm:text-lg mb-4">
            {banner.subtitle}
          </p>
        ) : null}
        {banner.body ? (
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-6">
            {banner.body}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleClose}
          className="min-h-[48px] w-full rounded-xl px-6 py-3.5 font-semibold text-[#1d2025] transition-all duration-200 hover:opacity-95 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#f3ba2f] focus:ring-offset-2 focus:ring-offset-[#1d2025]"
          style={{
            background: 'linear-gradient(135deg, #f3ba2f 0%, #e5a82a 100%)',
            boxShadow: '0 4px 20px rgba(243, 186, 47, 0.35)',
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

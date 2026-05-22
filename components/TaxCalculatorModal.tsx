'use client';

import { useEffect, useMemo, useState } from 'react';
import { triggerHapticFeedback } from '@/utils/ui';

const DEFAULT_VAT_RATE = 0.18;

type Mode = 'exclusive' | 'inclusive';

function formatUgx(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `UGX ${Math.round(n).toLocaleString('en-UG')}`;
}

type Props = {
  onClose: () => void;
  /** Official reference link (URA domestic taxes) */
  referenceUrl: string;
};

export default function TaxCalculatorModal({ onClose, referenceUrl }: Props) {
  const [mode, setMode] = useState<Mode>('exclusive');
  const [rawInput, setRawInput] = useState('');

  const amount = useMemo(() => {
    const cleaned = rawInput.replace(/,/g, '').trim();
    const n = parseFloat(cleaned);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [rawInput]);

  const result = useMemo(() => {
    if (amount == null) return null;
    const r = DEFAULT_VAT_RATE;
    if (mode === 'exclusive') {
      const vat = amount * r;
      const total = amount + vat;
      return { exclusive: amount, vat, total };
    }
    const total = amount;
    const exclusive = total / (1 + r);
    const vat = total - exclusive;
    return { exclusive, vat, total };
  }, [amount, mode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const openRef = () => {
    triggerHapticFeedback(window);
    if (typeof window === 'undefined') return;
    const tg = (window as unknown as { Telegram?: { WebApp?: { openLink?: (u: string, o?: { try_instant_view?: boolean }) => void } } })
      .Telegram?.WebApp;
    if (tg?.openLink) tg.openLink(referenceUrl, { try_instant_view: false });
    else window.open(referenceUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-ura-navy/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tax-calc-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#2d323c] bg-[#13161d] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#2d323c] shrink-0">
          <h2 id="tax-calc-title" className="text-lg font-bold text-white">
            Tax calculator
          </h2>
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(window);
              onClose();
            }}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-400 hover:bg-white/5 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Quick <span className="text-sky-300 font-semibold">VAT</span> helper using Uganda’s standard rated{' '}
            <span className="text-white font-semibold">18%</span> factor. Exempt or zero-rated supplies, mixed rates, and
            final liability may differ — confirm with URA or your adviser.
          </p>

          <div className="flex rounded-xl border border-[#2d323c] p-1 bg-[#0f1218]">
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(window);
                setMode('exclusive');
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors ${
                mode === 'exclusive' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              From excl. amount
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(window);
                setMode('inclusive');
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors ${
                mode === 'inclusive' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              From total (incl.)
            </button>
          </div>

          <label className="block">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              {mode === 'exclusive' ? 'Amount before VAT (UGX)' : 'Total paid / invoice (UGX)'}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="e.g. 1000000"
              className="mt-1.5 w-full rounded-xl bg-[#1a1d24] border border-[#2d323c] px-3 py-3 text-white text-base font-semibold tabular-nums placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
          </label>

          {result ? (
            <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 px-3 py-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Exclusive (net)</span>
                <span className="font-bold text-white tabular-nums">{formatUgx(result.exclusive)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">VAT (18%)</span>
                <span className="font-bold text-sky-200 tabular-nums">{formatUgx(result.vat)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                <span className="text-slate-300 font-semibold">Total (incl.)</span>
                <span className="font-bold text-white tabular-nums">{formatUgx(result.total)}</span>
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-slate-500 py-2">Enter a valid amount to see the breakdown.</p>
          )}

          <button
            type="button"
            onClick={openRef}
            className="w-full rounded-xl border border-[#2d323c] bg-[#1a1d24] py-3 text-sm font-semibold text-sky-300 hover:border-sky-500/40 transition-colors"
          >
            Official rates & guides on URA
          </button>
        </div>
      </div>
    </div>
  );
}

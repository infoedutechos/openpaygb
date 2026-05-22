// components/Settings.tsx — URA Platform profile with side navigation

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { defaultProfileAvatar, pearlBlue, pearlGolden, pearlWhite } from '@/images';
import { useGameStore } from '@/utils/game-mechanics';
import { useToast } from '@/contexts/ToastContext';
import Toggle from '@/components/Toggle';
import { triggerHapticFeedback } from '@/utils/ui';
import { UGANDA_DISTRICTS } from '@/utils/uganda-districts';
import { readStoredDistrictSlug, writeStoredDistrictSlug } from '@/utils/user-district-storage';

interface SettingsProps {
  setCurrentView: (view: string) => void;
}

type ReceiptRushSubmission = {
  id: string;
  sourceLabel: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  approvedAt?: string | null;
  rejectionReason?: string | null;
};

type SidebarKey =
  | 'profile'
  | 'notifications'
  | 'catalog'
  | 'charter'
  | 'settings'
  | 'gamify'
  | 'about';

const SIDEBAR: { key: SidebarKey; label: string; icon: React.ReactNode }[] = [
  {
    key: 'profile',
    label: 'Profile',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    key: 'notifications',
    label: 'Alerts',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    key: 'catalog',
    label: 'Catalog',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    key: 'charter',
    label: 'Charter',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
      </svg>
    ),
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
  {
    key: 'gamify',
    label: 'Gamify',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4H4v7h7V4zM4 13v7h7v-7H4zM13 4v7h7V4h-7zM13 20h7v-7h-7v7z" />
      </svg>
    ),
  },
  {
    key: 'about',
    label: 'About',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function Settings({ setCurrentView }: SettingsProps) {
  const showToast = useToast();
  const { pointsBalance, userTelegramName, userTelegramInitData } = useGameStore();
  const [active, setActive] = useState<SidebarKey>('profile');
  const [districtSlug, setDistrictSlug] = useState('');
  const [districtSaving, setDistrictSaving] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [receiptSubmissions, setReceiptSubmissions] = useState<ReceiptRushSubmission[]>([]);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [receiptFilter, setReceiptFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleteAccountBusy, setDeleteAccountBusy] = useState(false);

  useEffect(() => {
    if (active === 'profile') {
      setDistrictSlug(readStoredDistrictSlug() || '');
    }
  }, [active]);

  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [animationEnabled, setAnimationEnabled] = useState(true);

  useEffect(() => {
    const storedVibration = localStorage.getItem('vibrationEnabled');
    const storedAnimation = localStorage.getItem('animationEnabled');
    setVibrationEnabled(storedVibration !== 'false');
    setAnimationEnabled(storedAnimation !== 'false');
  }, []);

  useEffect(() => {
    if (active !== 'profile' || openAccordion !== 'receipts' || !userTelegramInitData) return;
    let cancelled = false;
    const load = async () => {
      setReceiptLoading(true);
      setReceiptError(null);
      try {
        const res = await fetch('/api/receipt-rush/my', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: userTelegramInitData }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load receipt submissions');
        if (!cancelled) {
          setReceiptSubmissions(Array.isArray(data.submissions) ? (data.submissions as ReceiptRushSubmission[]) : []);
        }
      } catch (err) {
        if (!cancelled) setReceiptError(err instanceof Error ? err.message : 'Failed to load receipt submissions');
      } finally {
        if (!cancelled) setReceiptLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [active, openAccordion, userTelegramInitData]);

  const displayName = (userTelegramName || 'Citizen').toUpperCase();

  const goHome = () => {
    triggerHapticFeedback(window);
    setCurrentView('home');
  };

  const toggleAccordion = (id: string) => {
    triggerHapticFeedback(window);
    setOpenAccordion((prev) => (prev === id ? null : id));
  };

  const AccordionRow = ({ id, title }: { id: string; title: string }) => {
    const open = openAccordion === id;
    return (
      <button
        type="button"
        onClick={() => toggleAccordion(id)}
        className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg bg-[#2a2d38] border border-ura-border/75 text-left text-white text-sm font-medium"
      >
        <span>{title}</span>
        <span className="text-gray-400">{open ? '⌄' : '›'}</span>
      </button>
    );
  };

  const renderMain = () => {
    const extractReceiptUrl = (sourceLabel: string): string | null => {
      const marker = '/uploads/receipts/';
      const start = sourceLabel.indexOf(marker);
      if (start === -1) return null;
      const tail = sourceLabel.slice(start);
      const end = tail.indexOf(' · ');
      return end === -1 ? tail : tail.slice(0, end);
    };

    const statusBadgeClass = (status: ReceiptRushSubmission['status']): string => {
      if (status === 'APPROVED') return 'border-emerald-500/45 bg-emerald-500/10 text-emerald-300';
      if (status === 'REJECTED') return 'border-rose-500/45 bg-rose-500/10 text-rose-300';
      return 'border-amber-500/45 bg-amber-500/10 text-amber-300';
    };

    switch (active) {
      case 'profile':
        return (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-start justify-between gap-3 mb-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full border-2 border-[var(--ura-blue-medium)] overflow-hidden bg-[#1a1d26] flex-shrink-0 relative">
                  <Image src={defaultProfileAvatar} alt="Profile" fill className="object-cover" sizes="48px" />
                </div>
                <h1 className="text-base font-bold tracking-wide text-white truncate">{displayName}</h1>
              </div>
              <button
                type="button"
                onClick={() => showToast('Screen reader mode coming soon', 'success')}
                className="p-2 rounded-lg border border-ura-border/75 text-[var(--ura-white)] flex-shrink-0"
                aria-label="Accessibility"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(window);
                showToast('Verification flow will be available soon.', 'success');
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg bg-gradient-to-r from-[var(--ura-blue-dark)] to-[var(--ura-blue-medium)] text-white text-sm font-semibold mb-4 border border-[var(--ura-blue-medium)]/50"
            >
              <span>Verify URA account</span>
              <span>›</span>
            </button>

            <div className="rounded-lg bg-[#1a1d26] border border-ura-border/85 p-3 mb-4">
              <h3 className="text-sm font-bold text-white mb-2">PEARL CATEGORIES</h3>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {[
                  { label: 'White', color: 'text-slate-200', image: pearlWhite },
                  { label: 'Blue', color: 'text-[#5fa8ff]', image: pearlBlue },
                  { label: 'Goldish', color: 'text-[var(--ura-yellow)]', image: pearlGolden },
                ].map((item) => (
                  <div key={item.label} className="rounded-md border border-ura-border/85 bg-ura-panel/95 p-1.5 text-center">
                    <Image src={item.image} alt={`${item.label} pearl`} width={28} height={28} className="mx-auto object-contain" />
                    <p className={`text-[10px] mt-1 font-semibold ${item.color}`}>{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 text-[11px] text-gray-300 leading-relaxed">
                <p><span className="text-white font-semibold">White</span> — no approval needed (activities like Karibu Daily, Quiz, and similar tasks).</p>
                <p><span className="text-[#5fa8ff] font-semibold">Blue</span> — earned from report-type activities and requires URA admin approval.</p>
                <p><span className="text-[var(--ura-yellow)] font-semibold">Goldish</span> — approved pearls, ready for withdrawal or transfer.</p>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                Conversion rules: <span className="text-white">50 White = 1 Goldish</span> · <span className="text-white">25 Blue = 1 Goldish</span>
              </p>
            </div>

            <div className="rounded-lg bg-[#1a1d26] border border-ura-border/85 p-3 mb-4">
              <h3 className="text-sm font-bold text-white mb-1">District (rankings)</h3>
              <p className="text-[11px] text-gray-400 mb-2">
                Required when you first open the app. You can change it here anytime. Telegram does not send your district automatically.
              </p>
              <select
                value={districtSlug}
                onChange={(e) => setDistrictSlug(e.target.value)}
                className="w-full rounded-lg bg-ura-panel text-white text-sm px-3 py-2 border border-ura-border/85 outline-none focus:border-[#f3ba2f]"
                aria-label="Uganda district for rankings"
              >
                <option value="">Not set</option>
                {[...UGANDA_DISTRICTS]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((d) => (
                    <option key={d.slug} value={d.slug}>
                      {d.name}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                disabled={districtSaving || !userTelegramInitData}
                onClick={async () => {
                  triggerHapticFeedback(window);
                  if (!userTelegramInitData) {
                    showToast('Open URAPearls from Telegram to save your district.', 'error');
                    return;
                  }
                  setDistrictSaving(true);
                  try {
                    const res = await fetch('/api/user', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        telegramInitData: userTelegramInitData,
                        district: districtSlug || '',
                      }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      throw new Error(typeof data.message === 'string' ? data.message : typeof data.error === 'string' ? data.error : 'Save failed');
                    }
                    if (typeof data.district === 'string' && data.district.trim()) {
                      writeStoredDistrictSlug(data.district.trim().toLowerCase());
                    } else {
                      writeStoredDistrictSlug(null);
                    }
                    showToast('District saved for rankings.', 'success');
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : 'Could not save district', 'error');
                  } finally {
                    setDistrictSaving(false);
                  }
                }}
                className="mt-2 w-full rounded-lg bg-ura-gold text-black text-sm font-bold py-2.5 disabled:opacity-50"
              >
                {districtSaving ? 'Saving…' : 'Save district'}
              </button>
            </div>

            <div className="rounded-lg border border-rose-500/35 bg-[#1a1618]/90 p-3 mb-4">
              <h3 className="text-sm font-bold text-rose-200 mb-1">Delete account</h3>
              <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">
                Permanently remove your game data, pearls balance, leagues, teams, and progress. This cannot be undone.
                Open URAPearls from Telegram to use this option.
              </p>
              {!deleteAccountOpen ? (
                <button
                  type="button"
                  disabled={!userTelegramInitData}
                  onClick={() => {
                    triggerHapticFeedback(window);
                    setDeleteAccountOpen(true);
                  }}
                  className="w-full rounded-lg border border-rose-500/50 bg-rose-950/40 text-rose-100 text-sm font-semibold py-2.5 disabled:opacity-45"
                >
                  Delete my account…
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-rose-300/95">
                    Type <span className="font-mono text-white">DELETE</span> to confirm.
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmInput}
                    onChange={(e) => setDeleteConfirmInput(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="DELETE"
                    className="w-full rounded-lg bg-ura-panel text-white text-sm px-3 py-2 border border-rose-500/40 outline-none focus:border-rose-400"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={deleteAccountBusy}
                      onClick={() => {
                        triggerHapticFeedback(window);
                        setDeleteAccountOpen(false);
                        setDeleteConfirmInput('');
                      }}
                      className="flex-1 rounded-lg border border-ura-border/85 text-gray-200 text-sm font-medium py-2 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={
                        deleteAccountBusy ||
                        !userTelegramInitData ||
                        deleteConfirmInput.trim() !== 'DELETE'
                      }
                      onClick={async () => {
                        triggerHapticFeedback(window);
                        if (!userTelegramInitData || deleteConfirmInput.trim() !== 'DELETE') return;
                        setDeleteAccountBusy(true);
                        try {
                          const res = await fetch('/api/user/delete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              telegramInitData: userTelegramInitData,
                              confirmation: deleteConfirmInput.trim(),
                            }),
                          });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) {
                            throw new Error(
                              typeof data.message === 'string'
                                ? data.message
                                : typeof data.error === 'string'
                                  ? data.error
                                  : 'Delete failed'
                            );
                          }
                          writeStoredDistrictSlug(null);
                          showToast('Account deleted. Reloading…', 'success');
                          setTimeout(() => {
                            window.location.reload();
                          }, 600);
                        } catch (err) {
                          showToast(err instanceof Error ? err.message : 'Could not delete account', 'error');
                        } finally {
                          setDeleteAccountBusy(false);
                        }
                      }}
                      className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold py-2 disabled:opacity-45"
                    >
                      {deleteAccountBusy ? 'Deleting…' : 'Delete forever'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto no-scrollbar pb-4">
              <AccordionRow id="personal" title="My personal details" />
              {openAccordion === 'personal' && (
                <div className="px-3 py-2 text-xs text-gray-400 rounded-lg bg-[#1a1d26] border border-ura-border/85">
                  Name and contact details will appear here once linked to your URA profile.
                </div>
              )}
              <AccordionRow id="favorites" title="My favorites" />
              {openAccordion === 'favorites' && (
                <div className="px-3 py-2 text-xs text-gray-400 rounded-lg bg-[#1a1d26] border border-ura-border/85">
                  Saved services and shortcuts will show here.
                </div>
              )}
              <AccordionRow id="addresses" title="My addresses" />
              {openAccordion === 'addresses' && (
                <div className="px-3 py-2 text-xs text-gray-400 rounded-lg bg-[#1a1d26] border border-ura-border/85">
                  No addresses on file yet.
                </div>
              )}
              <AccordionRow id="receipts" title="My receipts" />
              {openAccordion === 'receipts' && (
                <div className="px-3 py-2 text-xs text-gray-300 rounded-lg bg-[#1a1d26] border border-ura-border/85 space-y-2">
                  <p className="text-gray-400">My Receipt Rush submissions</p>
                  {receiptLoading ? (
                    <p className="text-gray-400">Loading submissions...</p>
                  ) : receiptError ? (
                    <p className="text-rose-400">{receiptError}</p>
                  ) : receiptSubmissions.length === 0 ? (
                    <p className="text-gray-500">No submissions yet.</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => {
                              triggerHapticFeedback(window);
                              setReceiptFilter(f);
                            }}
                            className={`px-2.5 py-1 rounded-full text-[10px] border transition-colors ${
                              receiptFilter === f
                                ? 'border-[#5fa8ff]/60 bg-[#5fa8ff]/20 text-[#b8d4ff]'
                                : 'border-ura-border/80 bg-ura-panel text-gray-300'
                            }`}
                          >
                            {f === 'ALL' ? 'All' : f[0] + f.slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>
                      {receiptSubmissions
                        .filter((item) => receiptFilter === 'ALL' || item.status === receiptFilter)
                        .map((item) => {
                        const receiptUrl = extractReceiptUrl(item.sourceLabel);
                        return (
                          <div key={item.id} className="rounded-lg border border-ura-border/75 bg-ura-panel/85 p-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] text-white font-semibold">+{Math.floor(item.amount)} blue pearls</p>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] border ${statusBadgeClass(item.status)}`}>
                                {item.status.toLowerCase()}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">
                              Submitted: {new Date(item.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                            {item.status === 'REJECTED' && item.rejectionReason ? (
                              <p className="text-[10px] text-rose-300 mt-1">Reason: {item.rejectionReason}</p>
                            ) : null}
                            {receiptUrl ? (
                              <a
                                href={receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex mt-1 text-[10px] text-cyan-300 underline underline-offset-2"
                              >
                                Open uploaded receipt
                              </a>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback(window);
                  showToast('Signed out of this session.', 'success');
                  setCurrentView('home');
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#c44a52] text-white text-xs font-bold tracking-wide border border-[#a33d44]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                LOG OUT
              </button>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div>
            <h2 className="text-lg font-bold text-white mb-2">Notifications</h2>
            <p className="text-sm text-gray-400">No new notifications. URA announcements will appear here.</p>
          </div>
        );

      case 'catalog':
        return (
          <div>
            <h2 className="text-lg font-bold text-white mb-2">Service catalog</h2>
            <p className="text-sm text-gray-400">Use the Services tab for categorized URA portals — eTax, EFRIS, customs, and support.</p>
          </div>
        );

      case 'charter':
        return (
          <div>
            <h2 className="text-lg font-bold text-white mb-2">Government charter</h2>
            <p className="text-sm text-gray-400">Service standards and citizen charter information will be published here.</p>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Settings</h2>
            <div className="rounded-lg border border-ura-border/75 bg-[#2a2d38] p-4 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-white">Touch vibration</p>
                <Toggle
                  enabled={vibrationEnabled}
                  setEnabled={(newValue) => {
                    if (newValue) triggerHapticFeedback(window);
                    setVibrationEnabled(newValue);
                    localStorage.setItem('vibrationEnabled', newValue.toString());
                    showToast(newValue ? 'Vibration enabled' : 'Vibration disabled', 'success');
                  }}
                />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-white">Floating points animation</p>
                <Toggle
                  enabled={animationEnabled}
                  setEnabled={(newValue) => {
                    triggerHapticFeedback(window);
                    setAnimationEnabled(newValue);
                    localStorage.setItem('animationEnabled', newValue.toString());
                    showToast(newValue ? 'Animation enabled' : 'Animation disabled', 'success');
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">Balance (PEARLS): {Math.floor(pointsBalance).toLocaleString()}</p>
            <div>
              <p className="text-gray-400 text-sm mb-2">Legal</p>
              <div className="flex flex-col gap-2">
                <Link
                  href="/clicker/privacy"
                  onClick={() => triggerHapticFeedback(window)}
                  className="flex items-center justify-between bg-[#2a2d38] rounded-lg p-3 text-left border border-ura-border/75"
                >
                  <span className="text-white text-sm">Privacy Policy</span>
                  <span className="text-[var(--ura-yellow)]">→</span>
                </Link>
                <Link
                  href="/clicker/terms"
                  onClick={() => triggerHapticFeedback(window)}
                  className="flex items-center justify-between bg-[#2a2d38] rounded-lg p-3 text-left border border-ura-border/75"
                >
                  <span className="text-white text-sm">Terms of Service</span>
                  <span className="text-[var(--ura-yellow)]">→</span>
                </Link>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(window);
                if (typeof window !== 'undefined') window.sessionStorage.setItem('openHowToPlay', '1');
                setCurrentView('game');
              }}
              className="w-full flex items-center justify-between bg-[#2a2d38] rounded-lg p-3 text-left border border-ura-border/75"
            >
              <span className="text-white text-sm">How to play</span>
              <span>📖</span>
            </button>
          </div>
        );

      case 'gamify':
        return (
          <div>
            <h2 className="text-lg font-bold text-white mb-2">Gamify</h2>
            <p className="text-sm text-gray-400 mb-4">Earn points and unlock rewards through URA learning modules.</p>
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(window);
                setCurrentView('game');
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--ura-blue-dark)] to-[var(--ura-blue-medium)] text-white font-semibold text-sm"
            >
              Open game hub
            </button>
          </div>
        );

      case 'about':
        return (
          <div>
            <h2 className="text-lg font-bold text-white mb-2">About URA Platform</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Official Uganda Revenue Authority digital experience. Play, learn, and earn while understanding fiscal responsibility.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-ura-page flex justify-center min-h-screen text-white">
      <div className="w-full max-w-xl flex min-h-screen">
        <aside className="w-[76px] flex-shrink-0 bg-ura-page border-r border-[#1f2228] flex flex-col items-center py-4 gap-1 z-20">
          {SIDEBAR.map((item) => {
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  triggerHapticFeedback(window);
                  setActive(item.key);
                }}
                className={`flex flex-col items-center gap-1 w-full px-1 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'text-[var(--ura-yellow)] bg-[#14161c]'
                    : 'text-[var(--ura-white)] text-opacity-80 hover:bg-[#14161c]'
                }`}
              >
                <span className={isActive ? 'text-[var(--ura-yellow)]' : 'text-[var(--ura-white)]'}>{item.icon}</span>
                <span className="text-[9px] leading-tight text-center font-medium px-0.5">{item.label}</span>
              </button>
            );
          })}
        </aside>

        <div className="flex-1 flex flex-col min-w-0 ura-profile-main-bg">
          <div className="flex items-center justify-between px-3 py-3 border-b border-[#2a2d38] bg-ura-navy/40 backdrop-blur-sm">
            <button
              type="button"
              onClick={goHome}
              className="text-sm font-semibold text-[var(--ura-yellow)]"
            >
              ← Home
            </button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-5 pb-28">{renderMain()}</div>
        </div>
      </div>
    </div>
  );
}

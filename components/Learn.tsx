'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { uraFiscalFunBanner, navLearn } from '@/images';
import UraStadiumPageHero from '@/components/UraStadiumPageHero';
import { triggerHapticFeedback } from '@/utils/ui';
import { LEARN_CATEGORY_DEFAULTS } from '@/data/learn-defaults';
import { useToast } from '@/contexts/ToastContext';

type LearnCategory = {
  id: string;
  slug: string;
  title: string;
  icon: string;
  section?: 'general' | 'tax-education';
  summary: string;
  topics: string[];
  lessons: Array<{ title: string; content: string }>;
  operations?: string[];
  sortOrder?: number;
  enabled?: boolean;
};

const FALLBACK_CATEGORIES: LearnCategory[] = LEARN_CATEGORY_DEFAULTS.map((x) => ({
  id: x.slug,
  slug: x.slug,
  title: x.title,
  icon: x.icon,
  summary: x.summary,
  section: x.section ?? 'tax-education',
  topics: x.topics,
  lessons: x.lessons,
  operations: x.operations ?? [],
  sortOrder: x.sortOrder,
  enabled: x.enabled ?? true,
}));

const CATEGORY_ICON_EMOJI: Record<string, string> = {
  'general-tax': '📘',
  agriculture: '🌾',
  construction: '🏗️',
  education: '🏫',
  entertainment: '🎵',
  fishing: '🐟',
  health: '🏥',
  hospitality: '🏨',
  manufacturing: '🏭',
  mining: '⛏️',
  'real-estate': '🏠',
  transportation: '🚚',
  'oil-gas': '🛢️',
  'wholesale-retail': '🛍️',
  investors: '💼',
  'tax-curriculum': '🧠',
  'government-agencies': '🏛️',
  'digital-services': '💻',
  'small-business': '🏪',
};

const GENERAL_ICON_EMOJI: Record<string, string> = {
  'general-get-tin': '🆔',
  'general-make-payment': '💳',
  'general-file-return': '🧾',
  'general-get-refund': '💸',
  'general-efris': '📠',
  'general-tax-incentives': '🎯',
  'general-objection-appeals': '⚖️',
  'general-whistle-blow': '📣',
};

export default function Learn() {
  const showToast = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'tax-education'>('general');
  const [categories, setCategories] = useState<LearnCategory[]>(FALLBACK_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedGeneralId, setSelectedGeneralId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/learn/categories');
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load');
        if (cancelled) return;
        const next = (Array.isArray(data?.categories) ? data.categories : []).map((x: any) => ({
          id: String(x.id ?? x.slug ?? ''),
          slug: String(x.slug ?? x.id ?? ''),
          title: String(x.title ?? 'Untitled'),
          icon: String(x.icon ?? 'i'),
          section: (x.section === 'general' ? 'general' : 'tax-education') as 'general' | 'tax-education',
          summary: String(x.summary ?? ''),
          topics: Array.isArray(x.topics) ? x.topics.map((t: unknown) => String(t)) : [],
          lessons: Array.isArray(x.lessons) ? x.lessons.map((l: any) => ({ title: String(l?.title ?? 'Lesson'), content: String(l?.content ?? '') })) : [],
          operations: Array.isArray(x.operations) ? x.operations.map((o: unknown) => String(o)) : [],
          sortOrder: Number(x.sortOrder ?? 0),
          enabled: x.enabled !== false,
        }));
        setCategories(next.length > 0 ? next : FALLBACK_CATEGORIES);
      } catch {
        if (!cancelled) showToast('Using offline learn content fallback', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const selectedCategory = useMemo(
    () => categories.find((x) => x.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );
  const generalServices = useMemo(
    () => categories.filter((x) => (x.section ?? 'tax-education') === 'general').sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)),
    [categories]
  );
  const taxEducationCategories = useMemo(
    () => categories.filter((x) => (x.section ?? 'tax-education') !== 'general').sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)),
    [categories]
  );
  const selectedGeneralService = useMemo(
    () => generalServices.find((x) => x.id === selectedGeneralId) ?? null,
    [generalServices, selectedGeneralId]
  );

  return (
    <div className="bg-[#0f3c86] min-h-screen pb-24">
      <UraStadiumPageHero
        title="Tax Education"
        description="Access URA guidance quickly through a clear general overview and sector-specific learning cards."
        icon={navLearn}
      />
      <div className="w-full max-w-xl mx-auto px-4 pt-2">
        <div className="rounded-xl overflow-hidden border border-[#3f6db5] bg-white">
          <Image
            src={uraFiscalFunBanner}
            alt="Fiscal Fun — Uganda Revenue Authority"
            width={1024}
            height={393}
            className="w-full h-auto object-cover"
            sizes="(max-width: 576px) 100vw, 576px"
            priority
          />
        </div>

        <div className="mt-4 rounded-xl border border-[#3f6db5] bg-[#0f315f] p-1 grid grid-cols-2 gap-1">
          {(
            [
              { key: 'general' as const, label: 'General' },
              { key: 'tax-education' as const, label: 'Tax Education' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                triggerHapticFeedback(window);
                setActiveTab(tab.key);
              }}
              className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === tab.key ? 'bg-[#f4f8ff] text-[#123f78]' : 'text-blue-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'general' ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-[#8bb4ef]/35 bg-[#f4f8ff] p-4">
              <h2 className="text-[#16427f] text-lg font-bold">General URA Services</h2>
              <p className="text-[#335f97] text-sm mt-1 leading-relaxed">
                Get key taxpayer services in one place: registration, payment, filing, compliance support, and refunds.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {generalServices.map((item) => (
                <button
                  key={item.id || item.slug}
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback(window);
                    setSelectedGeneralId(item.id);
                  }}
                  className="rounded-xl border border-[#8bb4ef]/35 bg-[#f4f8ff] p-3 text-left hover:border-[#f3ba2f] transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-[#dbe9ff] text-sm leading-none">
                      {GENERAL_ICON_EMOJI[item.slug] ?? '🧭'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[#16427f] text-sm font-semibold leading-snug">{item.title}</p>
                      <p className="text-[#335f97] text-xs mt-1 leading-relaxed">{item.summary}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-[#8bb4ef]/35 bg-[#f4f8ff] p-4">
              <h3 className="text-[#16427f] text-sm font-semibold">Support Channels</h3>
              <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-[#335f97]">
                <p>Toll Free: 0800 117 000 / 0800 217 000</p>
                <p>WhatsApp: 0772140000</p>
                <p>Email: services@ura.go.ug</p>
                <p>Headquarters: Nakawa Industrial Area, Kampala</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {taxEducationCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback(window);
                    setSelectedCategoryId(category.id);
                  }}
                  className="rounded-xl border border-[#8bb4ef]/35 bg-[#f4f8ff] px-3 py-3 text-left hover:border-[#f3ba2f] transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-[#dbe9ff] text-sm leading-none">
                      {CATEGORY_ICON_EMOJI[category.slug] ?? '📚'}
                    </span>
                    <p className="text-[#16427f] text-[15px] leading-tight font-semibold">{category.title}</p>
                  </div>
                </button>
              ))}
            </div>
            {loading ? <p className="mt-3 text-xs text-blue-100">Loading live learn content...</p> : null}
          </>
        )}
      </div>

      {selectedCategory ? (
        <div className="fixed inset-0 z-50 overflow-auto bg-[#0b1220] text-white pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="sticky top-0 flex items-center justify-between border-b border-[#25324c] bg-[#0b1220]/95 px-4 py-3 backdrop-blur">
            <h2 className="min-w-0 flex-1 truncate pr-2 text-base font-bold sm:text-lg">{selectedCategory.title}</h2>
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(window);
                setSelectedCategoryId(null);
              }}
              className="min-h-[44px] shrink-0 rounded-lg border border-[#3b4a6b] px-3 py-2 text-sm text-gray-200 hover:border-[#f3ba2f]"
            >
              Close
            </button>
          </div>

          <div className="space-y-4 px-4 py-4">
            <div className="rounded-xl border border-[#2e3d5f] bg-[#141f35] p-4">
              <p className="text-sm text-gray-200 leading-relaxed">{selectedCategory.summary}</p>
            </div>

            <div className="rounded-xl border border-[#2e3d5f] bg-[#141f35] p-4">
              <h3 className="font-semibold text-white">What you will learn</h3>
              <ul className="mt-2 space-y-2">
                {selectedCategory.topics.map((topic) => (
                  <li key={topic} className="text-sm text-gray-200 flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-ura-gold flex-shrink-0" />
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-[#2e3d5f] bg-[#141f35] p-4">
              <h3 className="font-semibold text-white">Lessons</h3>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {(selectedCategory.lessons?.length ? selectedCategory.lessons : [{ title: 'Quick guide', content: 'Content will be added by admin.' }]).map((lesson, idx) => (
                  <div key={`${lesson.title}-${idx}`} className="rounded-lg border border-[#33476d] bg-[#0f1a2f] px-3 py-2 text-left">
                    <p className="text-sm font-semibold text-white">{lesson.title}</p>
                    <p className="mt-1 text-xs text-gray-300 leading-relaxed">{lesson.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedGeneralService ? (
        <div className="fixed inset-0 z-50 overflow-auto bg-[#0b1220] text-white pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="sticky top-0 flex items-center justify-between border-b border-[#25324c] bg-[#0b1220]/95 px-4 py-3 backdrop-blur">
            <h2 className="min-w-0 flex-1 truncate pr-2 text-base font-bold sm:text-lg">{selectedGeneralService.title}</h2>
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(window);
                setSelectedGeneralId(null);
              }}
              className="min-h-[44px] shrink-0 rounded-lg border border-[#3b4a6b] px-3 py-2 text-sm text-gray-200 hover:border-[#f3ba2f]"
            >
              Close
            </button>
          </div>

          <div className="space-y-4 px-4 py-4">
            <div className="rounded-xl border border-[#2e3d5f] bg-[#141f35] p-4">
              <p className="text-sm text-gray-200 leading-relaxed">{selectedGeneralService.summary}</p>
            </div>

            <div className="rounded-xl border border-[#2e3d5f] bg-[#141f35] p-4">
              <h3 className="font-semibold text-white">Operations</h3>
              <p className="text-xs text-gray-400 mt-1">Tap an operation below to begin workflow integration.</p>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {(selectedGeneralService.operations?.length ? selectedGeneralService.operations : selectedGeneralService.topics).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback(window);
                      showToast(`${op} — integration point ready`, 'success');
                    }}
                    className="min-h-[44px] rounded-lg border border-[#33476d] bg-[#0f1a2f] px-3 py-2.5 text-left text-sm text-gray-100 hover:border-[#f3ba2f]"
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

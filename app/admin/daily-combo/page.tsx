// app/admin/daily-combo/page.tsx

/**
 * Admin page for Daily Combo (Hybrid mode)
 * Set overrides, bulk import templates, add cards
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';

interface ComboCardRecord {
  id: string;
  slug: string;
  label: string;
  image: string;
  category: string;
  order: number;
}

interface DailyComboRecord {
  id: string;
  date: string;
  cardSlugs: string[];
  isOverride: boolean;
}

interface TemplateRecord {
  id: string;
  cardSlugs: string[];
  order: number;
}

export default function AdminDailyCombo() {
  const showToast = useToast();
  const [cards, setCards] = useState<ComboCardRecord[]>([]);
  const [combos, setCombos] = useState<DailyComboRecord[]>([]);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideSlug1, setOverrideSlug1] = useState('');
  const [overrideSlug2, setOverrideSlug2] = useState('');
  const [overrideSlug3, setOverrideSlug3] = useState('');
  const [bulkTemplates, setBulkTemplates] = useState('');
  const [newCardSlug, setNewCardSlug] = useState('');
  const [newCardLabel, setNewCardLabel] = useState('');
  const [newCardImage, setNewCardImage] = useState('');
  const [newCardCategory, setNewCardCategory] = useState('Markets');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [cardsRes, combosRes, templatesRes] = await Promise.all([
        fetch('/api/admin/daily-combo?mode=cards'),
        fetch('/api/admin/daily-combo'),
        fetch('/api/admin/daily-combo?mode=templates'),
      ]);
      if (cardsRes.ok) setCards((await cardsRes.json()).cards ?? []);
      if (combosRes.ok) setCombos((await combosRes.json()).combos ?? []);
      if (templatesRes.ok) setTemplates((await templatesRes.json()).templates ?? []);
    } catch (e) {
      console.error(e);
      showToast('Failed to load', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSetOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideDate || !overrideSlug1.trim() || !overrideSlug2.trim() || !overrideSlug3.trim()) {
      showToast('Date and 3 card slugs required', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/daily-combo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setCombo',
          date: overrideDate,
          cardSlugs: [overrideSlug1.trim(), overrideSlug2.trim(), overrideSlug3.trim()],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Override saved', 'success');
      setOverrideSlug1('');
      setOverrideSlug2('');
      setOverrideSlug3('');
      setOverrideDate('');
      fetchData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkTemplates = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkTemplates.split(/\n/).map((l) => l.trim().split(/[\s,]+/).filter(Boolean)).filter((row) => row.length >= 3);
    const triplets = lines.map((row) => row.slice(0, 3));
    if (triplets.length === 0) {
      showToast('Enter one combo per line: slug1, slug2, slug3', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/daily-combo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulkImportTemplates', templates: triplets }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast(`Imported ${data.imported ?? 0} templates`, 'success');
      setBulkTemplates('');
      fetchData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardSlug.trim() || !newCardLabel.trim() || !newCardCategory.trim()) {
      showToast('Slug, label, category required', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/daily-combo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addCard',
          slug: newCardSlug.trim(),
          label: newCardLabel.trim(),
          image: newCardImage.trim() || newCardSlug.trim(),
          category: newCardCategory.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Card added', 'success');
      setNewCardSlug('');
      setNewCardLabel('');
      setNewCardImage('');
      fetchData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toISOString().split('T')[0];
    } catch {
      return d;
    }
  };

  return (
    <div className="min-h-screen bg-ura-panel text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin" className="text-[#f3ba2f] hover:underline mb-4 inline-block">
          ← Back to Admin
        </Link>
        <h1 className="text-3xl font-bold text-[#f3ba2f] mb-6">Matrix (Hybrid)</h1>

        {isLoading ? (
          <p className="text-gray-400">Loading...</p>
        ) : (
          <>
            <section className="bg-ura-panel-2 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Set Override for Date</h2>
              <p className="text-gray-400 text-sm mb-4">Pick 3 card slugs (from pool below). Same combo for everyone that day.</p>
              <form onSubmit={handleSetOverride} className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Card 1</label>
                  <input
                    type="text"
                    value={overrideSlug1}
                    onChange={(e) => setOverrideSlug1(e.target.value)}
                    placeholder="e.g. youtube"
                    className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white w-28"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Card 2</label>
                  <input
                    type="text"
                    value={overrideSlug2}
                    onChange={(e) => setOverrideSlug2(e.target.value)}
                    placeholder="e.g. telegram"
                    className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white w-28"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Card 3</label>
                  <input
                    type="text"
                    value={overrideSlug3}
                    onChange={(e) => setOverrideSlug3(e.target.value)}
                    placeholder="e.g. friends"
                    className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white w-28"
                  />
                </div>
                <button type="submit" disabled={isSubmitting} className="bg-ura-gold text-black px-4 py-2 rounded-lg font-medium disabled:opacity-50">
                  Save Override
                </button>
              </form>
            </section>

            <section className="bg-ura-panel-2 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Bulk Import Templates</h2>
              <p className="text-gray-400 text-sm mb-4">One combo per line: slug1, slug2, slug3</p>
              <form onSubmit={handleBulkTemplates} className="space-y-4">
                <textarea
                  value={bulkTemplates}
                  onChange={(e) => setBulkTemplates(e.target.value)}
                  placeholder="youtube, telegram, friends&#10;binance, telegram, license"
                  rows={4}
                  className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white resize-none font-mono text-sm"
                />
                <button type="submit" disabled={isSubmitting} className="bg-ura-gold text-black px-4 py-2 rounded-lg font-medium disabled:opacity-50">
                  Import Templates
                </button>
              </form>
            </section>

            <section className="bg-ura-panel-2 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Add Card</h2>
              <form onSubmit={handleAddCard} className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Slug</label>
                  <input type="text" value={newCardSlug} onChange={(e) => setNewCardSlug(e.target.value)} placeholder="youtube" className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white w-24" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Label</label>
                  <input type="text" value={newCardLabel} onChange={(e) => setNewCardLabel(e.target.value)} placeholder="YouTube" className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white w-28" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Image key</label>
                  <input type="text" value={newCardImage} onChange={(e) => setNewCardImage(e.target.value)} placeholder="youtube" className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white w-24" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Category</label>
                  <select value={newCardCategory} onChange={(e) => setNewCardCategory(e.target.value)} className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white">
                    <option value="Markets">Markets</option>
                    <option value="PR">PR</option>
                    <option value="Legal">Legal</option>
                    <option value="Specials">Specials</option>
                  </select>
                </div>
                <button type="submit" disabled={isSubmitting} className="bg-ura-gold text-black px-4 py-2 rounded-lg font-medium disabled:opacity-50">Add Card</button>
              </form>
            </section>

            <section className="bg-ura-panel-2 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Recent Combos</h2>
              <ul className="space-y-2 md:hidden">
                {combos.slice(0, 14).map((c) => (
                  <li
                    key={c.id}
                    className="rounded-lg border border-ura-border/75 bg-ura-panel/40 px-4 py-3 text-sm"
                  >
                    <p className="font-medium text-white">{formatDate(c.date)}</p>
                    <p className="mt-1 font-mono text-xs text-gray-400">{c.cardSlugs.join(", ")}</p>
                    <p className="mt-1 text-xs">
                      {c.isOverride ? (
                        <span className="text-amber-400">Override</span>
                      ) : (
                        <span className="text-gray-500">Auto</span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-ura-border/75">
                      <th className="pb-2 pr-4">Date</th>
                      <th className="pb-2 pr-4">Cards</th>
                      <th className="pb-2">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combos.slice(0, 14).map((c) => (
                      <tr key={c.id} className="border-b border-ura-border/75/50">
                        <td className="py-2 pr-4">{formatDate(c.date)}</td>
                        <td className="py-2 pr-4 font-mono">{c.cardSlugs.join(', ')}</td>
                        <td className="py-2">{c.isOverride ? <span className="text-amber-400">Override</span> : <span className="text-gray-500">Auto</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-ura-panel-2 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Card Pool ({cards.length})</h2>
              <div className="flex flex-wrap gap-2">
                {cards.map((c) => (
                  <span key={c.id} className="bg-ura-panel px-2 py-1 rounded text-sm font-mono">
                    {c.slug} ({c.category})
                  </span>
                ))}
              </div>
            </section>

            <section className="bg-ura-panel-2 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Templates ({templates.length})</h2>
              <div className="space-y-1 text-sm font-mono text-gray-300">
                {templates.slice(0, 20).map((t) => (
                  <div key={t.id}>{t.cardSlugs.join(', ')}</div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

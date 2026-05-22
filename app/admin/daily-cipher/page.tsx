// app/admin/daily-cipher/page.tsx

/**
 * Admin page for Daily Cipher (Hybrid mode)
 * Set overrides for dates, bulk import words
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { wordToMorse } from '@/utils/morse';

interface DailyCipherRecord {
  id: string;
  date: string;
  word: string;
  hint: string | null;
  isOverride: boolean;
  createdAt: string;
}

export default function AdminDailyCipher() {
  const showToast = useToast();
  const [ciphers, setCiphers] = useState<DailyCipherRecord[]>([]);
  const [words, setWords] = useState<{ id: string; word: string; order: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editDate, setEditDate] = useState('');
  const [editWord, setEditWord] = useState('');
  const [editHint, setEditHint] = useState('');
  const [bulkWords, setBulkWords] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [cRes, wRes] = await Promise.all([
        fetch('/api/admin/daily-cipher'),
        fetch('/api/admin/daily-cipher?mode=words'),
      ]);
      if (cRes.ok) {
        const data = await cRes.json();
        setCiphers(data.ciphers ?? []);
      }
      if (wRes.ok) {
        const data = await wRes.json();
        setWords(data.words ?? []);
      }
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
    if (!editDate || !editWord.trim()) {
      showToast('Date and word required', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/daily-cipher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setCipher',
          date: editDate,
          word: editWord.trim().toUpperCase(),
          hint: editHint.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Override saved', 'success');
      setEditDate('');
      setEditWord('');
      setEditHint('');
      fetchData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const list = bulkWords
      .split(/[\s,]+/)
      .map((w) => w.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''))
      .filter(Boolean);
    if (list.length === 0) {
      showToast('Enter words (comma or space separated)', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/daily-cipher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulkImportWords', words: list }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast(`Imported ${data.imported ?? list.length} words`, 'success');
      setBulkWords('');
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
        <h1 className="text-3xl font-bold text-[#f3ba2f] mb-6">Decode (Hybrid)</h1>

        {isLoading ? (
          <p className="text-gray-400">Loading...</p>
        ) : (
          <>
            {/* Override form */}
            <section className="bg-ura-panel-2 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Set Override for Date</h2>
              <p className="text-gray-400 text-sm mb-4">
                Override the auto-generated cipher for a specific date (e.g. events, promos).
              </p>
              <form onSubmit={handleSetOverride} className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Word (letters/numbers only)</label>
                  <input
                    type="text"
                    value={editWord}
                    onChange={(e) => setEditWord(e.target.value)}
                    placeholder="e.g. PEARLS"
                    className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white w-32"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Hint (optional)</label>
                  <input
                    type="text"
                    value={editHint}
                    onChange={(e) => setEditHint(e.target.value)}
                    placeholder="e.g. 3 letters, your token"
                    className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white w-48"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-ura-gold text-black px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  Save Override
                </button>
              </form>
            </section>

            {/* Bulk import */}
            <section className="bg-ura-panel-2 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Bulk Import Words</h2>
              <p className="text-gray-400 text-sm mb-4">
                Add words to the auto-selection pool. Used when no override exists for a date.
              </p>
              <form onSubmit={handleBulkImport} className="space-y-4">
                <textarea
                  value={bulkWords}
                  onChange={(e) => setBulkWords(e.target.value)}
                  placeholder="PEARLS, COIN, TAP, MINE, REWARD..."
                  rows={3}
                  className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white resize-none"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-ura-gold text-black px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  Import Words
                </button>
              </form>
            </section>

            {/* Recent ciphers */}
            <section className="bg-ura-panel-2 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Recent Ciphers</h2>
              <ul className="space-y-2 md:hidden">
                {ciphers.slice(0, 14).map((c) => (
                  <li
                    key={c.id}
                    className="rounded-lg border border-ura-border/75 bg-ura-panel/40 px-4 py-3 text-sm"
                  >
                    <p className="font-medium text-white">{formatDate(c.date)}</p>
                    <p className="mt-1 font-mono text-white">{c.word}</p>
                    <p className="font-mono text-xs text-gray-400">{wordToMorse(c.word)}</p>
                    {c.hint ? <p className="mt-1 text-xs text-gray-400">Hint: {c.hint}</p> : null}
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
                      <th className="pb-2 pr-4">Word / Answer (·−)</th>
                      <th className="pb-2 pr-4">Hint</th>
                      <th className="pb-2">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ciphers.slice(0, 14).map((c) => (
                      <tr key={c.id} className="border-b border-ura-border/75/50">
                        <td className="py-2 pr-4">{formatDate(c.date)}</td>
                        <td className="py-2 pr-4">
                          <span className="font-mono block">{c.word}</span>
                          <span className="font-mono text-gray-400 text-xs whitespace-nowrap">{wordToMorse(c.word)}</span>
                        </td>
                        <td className="py-2 pr-4 text-gray-400">{c.hint ?? '-'}</td>
                        <td className="py-2">
                          {c.isOverride ? (
                            <span className="text-amber-400">Override</span>
                          ) : (
                            <span className="text-gray-500">Auto</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Word pool */}
            <section className="bg-ura-panel-2 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Word Pool ({words.length} words)</h2>
              <p className="text-gray-400 text-sm mb-2">
                Auto-selection cycles through these by day-of-year.
              </p>
              <div className="flex flex-wrap gap-2">
                {words.map((w) => (
                  <span
                    key={w.id}
                    className="bg-ura-panel px-2 py-1 rounded text-sm font-mono"
                  >
                    {w.word}
                  </span>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

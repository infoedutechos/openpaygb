// app/admin/cards/page.tsx

/**
 * Admin page for Collection cards
 * Add cards with unlock conditions and bonuses
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';

interface CardRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image: string;
  category: string;
  unlockType: string;
  unlockPayload: unknown;
  bonusType: string;
  bonusValue: number;
  order: number;
}

export default function AdminCards() {
  const showToast = useToast();
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [category, setCategory] = useState('Specials');
  const [unlockType, setUnlockType] = useState('starter');
  const [bonusType, setBonusType] = useState('profit_percent');
  const [bonusValue, setBonusValue] = useState(1);
  const [rankIndex, setRankIndex] = useState(0);
  const [referralCount, setReferralCount] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cards');
      if (res.ok) {
        const data = await res.json();
        setCards(data.cards ?? []);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const getUnlockPayload = () => {
    if (unlockType === 'rank') return { rankIndex };
    if (unlockType === 'referrals') return { referralCount };
    return {};
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim() || !name.trim()) {
      showToast('Slug and name required', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: slug.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          image: image.trim() || slug.trim(),
          category: category.trim(),
          unlockType,
          unlockPayload: getUnlockPayload(),
          bonusType,
          bonusValue: Number(bonusValue) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Card added', 'success');
      setSlug('');
      setName('');
      setDescription('');
      setImage('');
      fetchCards();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ura-panel text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin" className="text-[#f3ba2f] hover:underline mb-4 inline-block">
          ← Back to Admin
        </Link>
        <h1 className="text-3xl font-bold text-[#f3ba2f] mb-6">Collection Cards</h1>

        {isLoading ? (
          <p className="text-gray-400">Loading...</p>
        ) : (
          <>
            <section className="bg-ura-panel-2 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Add Card</h2>
              <form onSubmit={handleAddCard} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Slug</label>
                    <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="starter" className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Beginner" className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Start your journey" className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Image key</label>
                    <input type="text" value={image} onChange={(e) => setImage(e.target.value)} placeholder="dollarCoin" className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white">
                      <option value="Markets">Markets</option>
                      <option value="PR">PR</option>
                      <option value="Legal">Legal</option>
                      <option value="Specials">Specials</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Unlock type</label>
                    <select value={unlockType} onChange={(e) => setUnlockType(e.target.value)} className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white">
                      <option value="starter">Starter</option>
                      <option value="rank">Rank</option>
                      <option value="referrals">Referrals</option>
                      <option value="task">Task</option>
                      <option value="daily_cipher">Decode</option>
                    </select>
                  </div>
                  {unlockType === 'rank' && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Rank index (0–9)</label>
                      <input type="number" value={rankIndex} onChange={(e) => setRankIndex(Number(e.target.value))} min={0} max={9} className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white" />
                    </div>
                  )}
                  {unlockType === 'referrals' && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Referral count</label>
                      <input type="number" value={referralCount} onChange={(e) => setReferralCount(Number(e.target.value))} min={0} className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white" />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Bonus type</label>
                    <select value={bonusType} onChange={(e) => setBonusType(e.target.value)} className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white">
                      <option value="profit_percent">Profit %</option>
                      <option value="max_energy">Max energy</option>
                      <option value="points_percent">Points %</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Bonus value</label>
                    <input type="number" value={bonusValue} onChange={(e) => setBonusValue(Number(e.target.value))} step={0.5} className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white" />
                  </div>
                </div>
                <button type="submit" disabled={isSubmitting} className="bg-ura-gold text-black px-4 py-2 rounded-lg font-medium disabled:opacity-50">
                  Add Card
                </button>
              </form>
            </section>

            <section className="bg-ura-panel-2 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Cards ({cards.length})</h2>
              <div className="space-y-2">
                {cards.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-ura-border/75/50">
                    <div>
                      <span className="font-mono text-[#f3ba2f]">{c.slug}</span>
                      <span className="text-gray-400 ml-2">{c.name}</span>
                      <span className="text-gray-500 text-sm ml-2">({c.category})</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {c.unlockType} → {c.bonusType} +{c.bonusValue}%
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

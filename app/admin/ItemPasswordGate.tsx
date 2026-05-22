'use client';

import { useState } from 'react';
import { PasswordRevealInput } from '@/components/PasswordRevealInput';

const SECTION_LABELS: Record<string, string> = {
  '/admin/accounts': 'Account Management',
  '/admin/bot-users': 'Bot Users',
  '/admin/tasks': 'Manage Tasks',
  '/admin/daily-cipher': 'Decode',
  '/admin/daily-combo': 'Matrix',
  '/admin/cards': 'Collection Cards',
  '/admin/weekly-event': 'Weekly Event',
  '/admin/onchain-tasks': 'Onchain Tasks',
  '/admin/export': 'Export User Data',
  '/admin/fees-collection': 'Fees Collection',
  '/admin/staking-audit': 'Staking audit',
  '/admin/league-management': 'League Management',
  '/admin/global-tasks': 'Global Joinable Tasks',
  '/admin/quiz': 'Mitroplus Quiz',
  '/admin/daily-pattern': 'Daily Pattern',
  '/admin/shop': 'Shop (Match 2 Earn)',
};

export default function ItemPasswordGate({ pathname }: { pathname: string }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const sectionName = SECTION_LABELS[pathname] ?? pathname.replace('/admin/', '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/verify-item-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, pathname }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 501) {
          setError('Item password not set on server. Add ADMIN_ITEM_PASSWORD in Vercel → Settings → Environment Variables, then redeploy.');
        } else {
          setError(data.error || 'Invalid password');
        }
        return;
      }
      // Full page navigation so the browser applies Set-Cookie before the next request (fixes deploy cookie issues)
      window.location.href = pathname;
    } catch {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ura-panel flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h2 className="text-xl font-bold text-[#f3ba2f] mb-2 text-center">Section password</h2>
        <p className="text-gray-400 text-sm mb-6 text-center">
          Enter the password to access <strong className="text-white">{sectionName}</strong>.
        </p>
        <form onSubmit={handleSubmit} className="bg-ura-panel-2 rounded-xl p-6 space-y-4">
          <div>
            <label htmlFor="item-password" className="block text-sm text-gray-400 mb-1">
              Password
            </label>
            <PasswordRevealInput
              id="item-password"
              value={password}
              onChange={setPassword}
              placeholder="Section password"
              className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white placeholder-gray-500"
              autoFocus
              required
              disabled={loading}
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ura-gold text-black font-medium py-2 rounded-lg hover:bg-[#e5a82a] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Checking…' : 'Continue'}
          </button>
        </form>
        <p className="text-gray-500 text-xs mt-4 text-center">
          This is different from your admin login password.
        </p>
      </div>
    </div>
  );
}

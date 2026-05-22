'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ShopProductList } from './ShopProductList';

interface ShopProductAdmin {
  id: string;
  title: string;
  description: string;
  priceAlm: number;
  bannerImageUrl: string | null;
  imageUrls: string[];
  status: string;
  rejectedReason: string | null;
  createdAt: string;
  sellerName: string;
  sellerTelegramId: string;
}

type StatusFilter = 'all' | 'pending_review' | 'approved' | 'rejected' | 'sold';

const BG_DARK = '#1d2025';
const BG_CARD = '#272a2f';
const ACCENT_YELLOW = '#f3ba2f';

export function ShopPageView() {
  const [products, setProducts] = useState<ShopProductAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending_review');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [shopEnabled, setShopEnabled] = useState<boolean>(true);
  const [shopToggleLoading, setShopToggleLoading] = useState(false);

  const fetchShopSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/shop/settings', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setShopEnabled(data.shopEnabled ?? true);
      }
    } catch {
      setShopEnabled(true);
    }
  }, []);

  useEffect(() => {
    fetchShopSettings();
  }, [fetchShopSettings]);

  const handleToggleShopInApp = async () => {
    setShopToggleLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/shop/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled: !shopEnabled }),
      });
      const data = await res.json();
      if (res.ok) {
        setShopEnabled(data.shopEnabled ?? !shopEnabled);
        setMessage({ type: 'success', text: data.shopEnabled ? 'Shop is now visible in the app' : 'Shop is now hidden from the app' });
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Failed to update' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Request failed' });
    } finally {
      setShopToggleLoading(false);
    }
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter && statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await fetch(`/api/admin/shop/products${params}`, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      setProducts(data.products ?? []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleApprove = async (productId: string) => {
    setActioningId(productId);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/shop/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId, action: 'approve' }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message ?? 'Approved' });
        fetchProducts();
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Request failed' });
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (productId: string) => {
    setActioningId(productId);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/shop/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId, action: 'reject', rejectedReason: rejectReason.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message ?? 'Rejected' });
        setRejectingId(null);
        setRejectReason('');
        fetchProducts();
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Request failed' });
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="min-h-screen text-white p-8" style={{ backgroundColor: BG_DARK }}>
      <div className="max-w-5xl mx-auto">
        <Link href="/admin" className="hover:underline mb-4 inline-block" style={{ color: ACCENT_YELLOW }}>Back to Admin</Link>
        <h1 className="text-3xl font-bold mb-2" style={{ color: ACCENT_YELLOW }}>Shop (Match 2 Earn)</h1>
        <p className="text-gray-400 mb-4">Review and approve or reject product listings. Approved products appear in the in-app Shop.</p>
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-xl border border-ura-border/75" style={{ backgroundColor: BG_CARD }}>
          <span className="text-gray-300 font-medium">Shop visible in user app (Market tab):</span>
          <button
            type="button"
            onClick={handleToggleShopInApp}
            disabled={shopToggleLoading}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 ${shopEnabled ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-600 hover:bg-gray-500 text-white'}`}
          >
            {shopToggleLoading ? '...' : shopEnabled ? 'On' : 'Off'}
          </button>
          <span className="text-gray-500 text-sm">{shopEnabled ? 'Users see Shop in Market' : 'Shop hidden from users'}</span>
        </div>
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {message.text}
            <button type="button" onClick={() => setMessage(null)} className="float-right font-bold">x</button>
          </div>
        )}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['pending_review', 'approved', 'rejected', 'sold', 'all'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={"px-4 py-2 rounded-lg font-semibold " + (statusFilter === s ? "text-black" : "text-gray-400 hover:text-white")}
              style={{ backgroundColor: statusFilter === s ? ACCENT_YELLOW : "#272a2f" }}
            >
              {s === 'all' ? 'All' : s === 'pending_review' ? 'Pending' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: ACCENT_YELLOW }} />
          </div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center text-gray-400 rounded-xl" style={{ backgroundColor: BG_CARD }}>No products in this category.</div>
        ) : (
          <ShopProductList
            products={products}
            actioningId={actioningId}
            rejectingId={rejectingId}
            rejectReason={rejectReason}
            setRejectReason={setRejectReason}
            onApprove={handleApprove}
            onReject={handleReject}
            setRejectingId={setRejectingId}
          />
        )}
      </div>
    </div>
  );
}

// components/ShopSection.tsx – Shop (Match 2 Earn): browse products, list product, my listings, buy with PEARLS

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';
import { useGameStore } from '@/utils/game-mechanics';
import IceCube from '@/icons/IceCube';
import Angle from '@/icons/Angle';
import Cross from '@/icons/Cross';

const MIN_IMAGES = 4;
const MAX_IMAGES = 10;

interface ShopProductType {
  id: string;
  title: string;
  description: string;
  priceAlm: number;
  bannerImageUrl: string | null;
  imageUrls: string[];
  status?: string;
  rejectedReason?: string | null;
  createdAt: string;
  sellerName: string;
}

function formatNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toString();
}

type ShopTab = 'browse' | 'my-listings' | 'list';

export default function ShopSection({
  onBack,
  userTelegramInitData,
}: {
  onBack: () => void;
  userTelegramInitData: string;
}) {
  const showToast = useToast();
  const { pointsBalance, setPointsBalance } = useGameStore();
  const [tab, setTab] = useState<ShopTab>('browse');
  const [products, setProducts] = useState<ShopProductType[]>([]);
  const [myProducts, setMyProducts] = useState<ShopProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLoading, setMyLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ShopProductType | null>(null);
  const [buying, setBuying] = useState(false);
  const [listForm, setListForm] = useState({
    title: '',
    description: '',
    priceAlm: '',
    bannerImageUrl: '',
    imageUrls: [] as string[],
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shop/products');
      const data = await res.json();
      setProducts(data.products ?? []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyListings = useCallback(async () => {
    if (!userTelegramInitData) return;
    setMyLoading(true);
    try {
      const res = await fetch(`/api/shop/products?my=1&initData=${encodeURIComponent(userTelegramInitData)}`);
      const data = await res.json();
      setMyProducts(data.products ?? []);
    } catch {
      setMyProducts([]);
    } finally {
      setMyLoading(false);
    }
  }, [userTelegramInitData]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (tab === 'my-listings') fetchMyListings();
  }, [tab, fetchMyListings]);

  const handleBuy = async () => {
    if (!selectedProduct || !userTelegramInitData) return;
    setBuying(true);
    try {
      const res = await fetch(`/api/shop/products/${selectedProduct.id}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: userTelegramInitData }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Purchase complete! PEARLS transferred to seller.', 'success');
        if (typeof data.newBalance === 'number') setPointsBalance(data.newBalance);
        setSelectedProduct(null);
        fetchProducts();
      } else {
        showToast(data.error || 'Purchase failed', 'error');
      }
    } catch {
      showToast('Purchase failed', 'error');
    } finally {
      setBuying(false);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/shop/upload?initData=${encodeURIComponent(userTelegramInitData)}`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    return res.ok ? data.url : null;
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadFile(file);
    setUploading(false);
    if (url) setListForm((f) => ({ ...f, bannerImageUrl: url }));
    else showToast('Banner upload failed', 'error');
  };

  const handleImagesAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (listForm.imageUrls.length + files.length > MAX_IMAGES) {
      showToast(`Max ${MAX_IMAGES} images`, 'error');
      return;
    }
    setUploading(true);
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadFile(file);
      if (url) urls.push(url);
    }
    setUploading(false);
    if (urls.length) setListForm((f) => ({ ...f, imageUrls: [...f.imageUrls, ...urls] }));
    if (urls.length < files.length) showToast('Some uploads failed', 'error');
  };

  const removeImage = (index: number) => {
    setListForm((f) => ({ ...f, imageUrls: f.imageUrls.filter((_, i) => i !== index) }));
  };

  const submitListing = async () => {
    const title = listForm.title.trim();
    const description = listForm.description.trim();
    const price = parseInt(listForm.priceAlm, 10);
    if (!title) {
      showToast('Enter a title', 'error');
      return;
    }
    if (!description) {
      showToast('Enter a description', 'error');
      return;
    }
    if (!Number.isFinite(price) || price < 1) {
      showToast('Enter a valid price (PEARLS)', 'error');
      return;
    }
    if (listForm.imageUrls.length < MIN_IMAGES) {
      showToast(`Add at least ${MIN_IMAGES} product images`, 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/shop/products?initData=${encodeURIComponent(userTelegramInitData)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: userTelegramInitData,
          title,
          description,
          priceAlm: price,
          bannerImageUrl: listForm.bannerImageUrl || null,
          imageUrls: listForm.imageUrls,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Product submitted for review', 'success');
        setListForm({ title: '', description: '', priceAlm: '', bannerImageUrl: '', imageUrls: [] });
        setTab('my-listings');
        fetchMyListings();
      } else {
        showToast(data.error || 'Failed to submit', 'error');
      }
    } catch {
      showToast('Failed to submit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => { triggerHapticFeedback(window); onBack(); }}
          className="p-2 rounded-lg bg-ura-panel-2 text-white"
        >
          <Angle className="w-5 h-5 rotate-180" />
        </button>
        <h2 className="text-xl font-bold text-[#f3ba2f]">Shop (Match 2 Earn)</h2>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-ura-panel-2 border border-ura-border/85 mb-4">
        {(['browse', 'my-listings', 'list'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { triggerHapticFeedback(window); setTab(t); }}
            className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-semibold capitalize ${
              tab === t ? 'bg-ura-gold text-black' : 'text-gray-400 hover:text-white hover:bg-ura-panel-2'
            }`}
          >
            {t === 'my-listings' ? 'My listings' : t === 'list' ? 'List product' : 'Browse'}
          </button>
        ))}
      </div>

      {tab === 'browse' && (
        <>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square bg-ura-panel-2 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-gray-400 rounded-xl bg-ura-panel-2 border border-ura-border/75">
              No products yet. Be the first to list one!
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { triggerHapticFeedback(window); setSelectedProduct(p); }}
                  className="rounded-xl overflow-hidden bg-ura-panel-2 border border-ura-border/75 text-left hover:border-[#f3ba2f]/50 transition-colors"
                >
                  <div className="aspect-square relative bg-ura-panel">
                    <Image
                      src={p.bannerImageUrl || p.imageUrls[0] || '/images/placeholder.png'}
                      alt={p.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 400px) 50vw, 200px"
                      unoptimized
                    />
                  </div>
                  <div className="p-2">
                    <p className="font-semibold text-white truncate text-sm">{p.title}</p>
                    <p className="text-[#f3ba2f] font-bold flex items-center gap-1">
                      <IceCube className="w-4 h-4" />
                      {formatNumber(p.priceAlm)} PEARLS
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'my-listings' && (
        <>
          {myLoading ? (
            <div className="py-8 text-center text-gray-400">Loading…</div>
          ) : myProducts.length === 0 ? (
            <div className="py-12 text-center text-gray-400 rounded-xl bg-ura-panel-2 border border-ura-border/75">
              You have no listings. List a product to sell for PEARLS.
            </div>
          ) : (
            <div className="space-y-3">
              {myProducts.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl bg-ura-panel-2 border border-ura-border/75 flex gap-3"
                >
                  <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-ura-panel">
                    <Image
                      src={p.bannerImageUrl || p.imageUrls[0] || '/images/placeholder.png'}
                      alt={p.title}
                      width={80}
                      height={80}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{p.title}</p>
                    <p className="text-[#f3ba2f] font-bold text-sm">{formatNumber(p.priceAlm)} PEARLS</p>
                    <span
                      className={`text-xs ${
                        p.status === 'approved' ? 'text-green-400' : p.status === 'rejected' ? 'text-red-400' : 'text-amber-400'
                      }`}
                    >
                      {p.status === 'pending_review' ? 'Pending review' : p.status === 'approved' ? 'Live' : p.status === 'rejected' ? 'Rejected' : 'Sold'}
                    </span>
                    {p.rejectedReason && <p className="text-xs text-gray-500 mt-0.5">{p.rejectedReason}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'list' && (
        <div className="space-y-4 rounded-xl bg-ura-panel-2 border border-ura-border/75 p-4">
          <p className="text-sm text-gray-400">List your product. After admin approval it will appear in the shop. Price in PEARLS.</p>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={listForm.title}
              onChange={(e) => setListForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Product name"
              className="w-full bg-ura-panel text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-[#f3ba2f] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={listForm.description}
              onChange={(e) => setListForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe your product"
              rows={3}
              className="w-full bg-ura-panel text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-[#f3ba2f] outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Price (PEARLS)</label>
            <input
              type="number"
              min={1}
              value={listForm.priceAlm}
              onChange={(e) => setListForm((f) => ({ ...f, priceAlm: e.target.value }))}
              placeholder="e.g. 1000"
              className="w-full bg-ura-panel text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-[#f3ba2f] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Banner image (optional)</label>
            {listForm.bannerImageUrl ? (
              <div className="relative inline-block">
                <Image src={listForm.bannerImageUrl} alt="Banner" width={200} height={80} className="rounded-lg object-cover" unoptimized />
                <button
                  type="button"
                  onClick={() => setListForm((f) => ({ ...f, bannerImageUrl: '' }))}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm"
                >
                  ×
                </button>
              </div>
            ) : (
              <label className="block w-full border border-dashed border-gray-600 rounded-lg p-4 text-center text-gray-400 cursor-pointer hover:border-[#f3ba2f]">
                {uploading ? 'Uploading…' : 'Click to upload banner'}
                <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} disabled={uploading} />
              </label>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Product images (min {MIN_IMAGES}, max {MAX_IMAGES})</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {listForm.imageUrls.map((url, i) => (
                <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                  <Image src={url} alt="" fill className="object-cover" unoptimized sizes="64px" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-bl text-white text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <label className="block w-full border border-dashed border-gray-600 rounded-lg p-3 text-center text-gray-400 text-sm cursor-pointer hover:border-[#f3ba2f]">
              {uploading ? 'Uploading…' : `Add images (${listForm.imageUrls.length}/${MAX_IMAGES})`}
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImagesAdd} disabled={uploading} />
            </label>
          </div>
          <button
            type="button"
            onClick={submitListing}
            disabled={submitting || uploading}
            className="w-full bg-ura-gold text-black font-bold py-3 rounded-xl disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit for review'}
          </button>
        </div>
      )}

      {/* Product detail modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ura-navy/80 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-ura-panel-2 sm:rounded-2xl">
            <div className="sticky top-0 bg-ura-panel-2 p-4 border-b border-gray-700 flex justify-between items-start">
              <h3 className="text-lg font-bold text-white pr-8">{selectedProduct.title}</h3>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="p-2 rounded-full bg-ura-panel text-gray-400 hover:text-white"
              >
                <Cross className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="relative aspect-[2/1] rounded-xl overflow-hidden bg-ura-panel">
                <Image
                  src={selectedProduct.bannerImageUrl || selectedProduct.imageUrls[0] || '/images/placeholder.png'}
                  alt={selectedProduct.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              {selectedProduct.imageUrls.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {selectedProduct.imageUrls.map((url, i) => (
                    <div key={i} className="w-20 h-20 shrink-0 rounded-lg overflow-hidden relative">
                      <Image src={url} alt="" fill className="object-cover" unoptimized />
                    </div>
                  ))}
                </div>
              )}
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedProduct.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-[#f3ba2f] font-bold flex items-center gap-1">
                  <IceCube className="w-5 h-5" />
                  {formatNumber(selectedProduct.priceAlm)} PEARLS
                </span>
                <span className="text-gray-400 text-sm">by {selectedProduct.sellerName}</span>
              </div>
              <div className="flex gap-2 items-center pt-2">
                <span className="text-gray-400 text-sm">Your balance: {formatNumber(Math.floor(pointsBalance ?? 0))} PEARLS</span>
                <button
                  type="button"
                  onClick={handleBuy}
                  disabled={buying || (pointsBalance ?? 0) < selectedProduct.priceAlm}
                  className="flex-1 bg-ura-gold text-black font-bold py-3 rounded-xl disabled:opacity-50"
                >
                  {buying ? 'Processing…' : 'Buy with PEARLS'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

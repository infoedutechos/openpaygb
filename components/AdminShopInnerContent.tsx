'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export interface ShopProductAdmin {
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

export type StatusFilter = 'all' | 'pending_review' | 'approved' | 'rejected' | 'sold';

function AdminShopInnerRoot({ children }: { children: React.ReactNode }) {
  return React.createElement('div', { className: 'max-w-5xl mx-auto' }, children);
}

export function AdminShopInnerContent(props: {
  message: { type: 'success' | 'error'; text: string } | null;
  setMessage: (m: null) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (s: StatusFilter) => void;
  loading: boolean;
  products: ShopProductAdmin[];
  accentYellow: string;
  bgCard: string;
  bgDark: string;
  borderCard: string;
  actioningId: string | null;
  handleApprove: (id: string) => void;
  rejectingId: string | null;
  setRejectingId: (id: string | null) => void;
  rejectReason: string;
  setRejectReason: (s: string) => void;
  handleReject: (id: string) => void;
}) {
  return (
    <AdminShopInnerRoot>
      <Link href="/admin" className="hover:underline mb-4 inline-block" style={{ color: props.accentYellow }}>Back to Admin</Link>
      <h1 className="text-3xl font-bold mb-2" style={{ color: props.accentYellow }}>Shop (Match 2 Earn)</h1>
      <p className="text-gray-400 mb-6">Review and approve or reject product listings. Approved products appear in the in-app Shop.</p>

      {props.message && (
        <div className={`p-4 rounded-lg mb-6 ${props.message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {props.message.text}
          <button type="button" onClick={() => props.setMessage(null)} className="float-right font-bold">x</button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {(['pending_review', 'approved', 'rejected', 'sold', 'all'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => props.setStatusFilter(s)}
            className={"px-4 py-2 rounded-lg font-semibold " + (props.statusFilter === s ? "text-black" : "text-gray-400 hover:text-white")}
            style={{ backgroundColor: props.statusFilter === s ? props.accentYellow : "#272a2f" }}
          >
            {s === 'all' ? 'All' : s === 'pending_review' ? 'Pending' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {props.loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: props.accentYellow }} />
        </div>
      ) : props.products.length === 0 ? (
        <div className="py-12 text-center text-gray-400 rounded-xl" style={{ backgroundColor: props.bgCard }}>No products in this category.</div>
      ) : (
        <div className="space-y-6">
          {props.products.map((p) => (
            <div key={p.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: props.bgCard, borderColor: props.borderCard, borderWidth: 1, borderStyle: 'solid' }}>
              <div className="p-4 flex flex-col sm:flex-row gap-4">
                <div className="shrink-0 space-y-2">
                  {p.bannerImageUrl && (
                    <div className="relative w-full sm:w-48 h-28 rounded-lg overflow-hidden" style={{ backgroundColor: props.bgDark }}>
                      <Image src={p.bannerImageUrl} alt="" fill className="object-cover" unoptimized />
                    </div>
                  )}
                  <div className="flex gap-1 flex-wrap">
                    {p.imageUrls.slice(0, 5).map((url, i) => (
                      <div key={i} className="relative w-14 h-14 rounded overflow-hidden" style={{ backgroundColor: props.bgDark }}>
                        <Image src={url} alt="" fill className="object-cover" unoptimized sizes="56px" />
                      </div>
                    ))}
                    {p.imageUrls.length > 5 && <span className="text-gray-500 text-sm">+{p.imageUrls.length - 5}</span>}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white">{p.title}</h3>
                  <p className="text-gray-400 text-sm mt-1 line-clamp-2">{p.description}</p>
                  <p className="font-bold mt-2" style={{ color: props.accentYellow }}>{p.priceAlm.toLocaleString()} PEARLS</p>
                  <p className="text-gray-500 text-sm">Seller: {p.sellerName} (TG: {p.sellerTelegramId})</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(p.createdAt).toLocaleString()} | Status: <span className={`${p.status === 'approved' ? 'text-green-400' : p.status === 'rejected' ? 'text-red-400' : 'text-amber-400'}`}>{p.status}</span>
                  </p>
                  {p.rejectedReason && <p className="text-red-400/80 text-sm mt-1">Reject reason: {p.rejectedReason}</p>}
                  {p.status === 'pending_review' && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => props.handleApprove(p.id)}
                        disabled={props.actioningId !== null}
                        className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                      >
                        {props.actioningId === p.id ? '...' : 'Approve'}
                      </button>
                      {props.rejectingId !== p.id ? (
                        <button
                          type="button"
                          onClick={() => props.setRejectingId(p.id)}
                          disabled={props.actioningId !== null}
                          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                        >
                          Reject
                        </button>
                      ) : (
                        <div className="flex gap-2 items-center flex-wrap">
                          <input
                            type="text"
                            value={props.rejectReason}
                            onChange={(e) => props.setRejectReason(e.target.value)}
                            placeholder="Reason (optional)"
                            className="text-white px-3 py-2 rounded-lg border border-gray-600 w-48"
                            style={{ backgroundColor: props.bgDark }}
                          />
                          <button
                            type="button"
                            onClick={() => props.handleReject(p.id)}
                            disabled={props.actioningId !== null}
                            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                          >
                            Confirm reject
                          </button>
                          <button type="button" onClick={() => { props.setRejectingId(null); props.setRejectReason(''); }} className="text-gray-400 hover:text-white">
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShopInnerRoot>
  );
}

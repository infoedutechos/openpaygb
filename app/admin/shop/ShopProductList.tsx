'use client';

import Image from 'next/image';

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

const BG_DARK = '#1d2025';
const BG_CARD = '#272a2f';
const BORDER_CARD = '#3d4046';
const ACCENT_YELLOW = '#f3ba2f';

export function ShopProductList(props: {
  products: ShopProductAdmin[];
  actioningId: string | null;
  rejectingId: string | null;
  rejectReason: string;
  setRejectReason: (s: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  setRejectingId: (id: string | null) => void;
}) {
  const { products, actioningId, rejectingId, rejectReason, setRejectReason, onApprove, onReject, setRejectingId } = props;
  return (
    <div className="space-y-6">
      {products.map((p) => (
        <div key={p.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: BG_CARD, borderColor: BORDER_CARD, borderWidth: 1, borderStyle: 'solid' }}>
          <div className="p-4 flex flex-col sm:flex-row gap-4">
            <div className="shrink-0 space-y-2">
              {p.bannerImageUrl && (
                <div className="relative w-full sm:w-48 h-28 rounded-lg overflow-hidden" style={{ backgroundColor: BG_DARK }}>
                  <Image src={p.bannerImageUrl} alt="" fill className="object-cover" unoptimized />
                </div>
              )}
              <div className="flex gap-1 flex-wrap">
                {p.imageUrls.slice(0, 5).map((url, i) => (
                  <div key={i} className="relative w-14 h-14 rounded overflow-hidden" style={{ backgroundColor: BG_DARK }}>
                    <Image src={url} alt="" fill className="object-cover" unoptimized sizes="56px" />
                  </div>
                ))}
                {p.imageUrls.length > 5 && <span className="text-gray-500 text-sm">+{p.imageUrls.length - 5}</span>}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white">{p.title}</h3>
              <p className="text-gray-400 text-sm mt-1 line-clamp-2">{p.description}</p>
              <p className="font-bold mt-2" style={{ color: ACCENT_YELLOW }}>{p.priceAlm.toLocaleString()} PEARLS</p>
              <p className="text-gray-500 text-sm">Seller: {p.sellerName} (TG: {p.sellerTelegramId})</p>
              <p className="text-gray-500 text-xs mt-1">
                {new Date(p.createdAt).toLocaleString()} | Status: <span className={p.status === 'approved' ? 'text-green-400' : p.status === 'rejected' ? 'text-red-400' : 'text-amber-400'}>{p.status}</span>
              </p>
              {p.rejectedReason && <p className="text-red-400/80 text-sm mt-1">Reject reason: {p.rejectedReason}</p>}
              {p.status === 'pending_review' && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <button type="button" onClick={() => onApprove(p.id)} disabled={actioningId !== null} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-semibold disabled:opacity-50">
                    {actioningId === p.id ? '...' : 'Approve'}
                  </button>
                  {rejectingId !== p.id ? (
                    <button type="button" onClick={() => setRejectingId(p.id)} disabled={actioningId !== null} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold disabled:opacity-50">
                      Reject
                    </button>
                  ) : (
                    <div className="flex gap-2 items-center flex-wrap">
                      <input type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason (optional)" className="text-white px-3 py-2 rounded-lg border border-gray-600 w-48" style={{ backgroundColor: BG_DARK }} />
                      <button type="button" onClick={() => onReject(p.id)} disabled={actioningId !== null} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold disabled:opacity-50">Confirm reject</button>
                      <button type="button" onClick={() => { setRejectingId(null); setRejectReason(''); }} className="text-gray-400 hover:text-white">Cancel</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

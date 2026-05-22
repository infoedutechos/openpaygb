'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminShopLayout } from '@/components/admin/AdminShopLayout';
import { AdminShopInnerContent } from '@/components/AdminShopInnerContent';
import type { ShopProductAdmin, StatusFilter } from '@/components/AdminShopInnerContent';

export function AdminShopContent() {
  const [products, setProducts] = useState<ShopProductAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending_review');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const bgDark = '#1d2025';
  const bgCard = '#272a2f';
  const borderCard = '#3d4046';
  const accentYellow = '#f3ba2f';

  return (
    <AdminShopLayout bgDark={bgDark}>
      <AdminShopInnerContent
        message={message}
        setMessage={setMessage}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        loading={loading}
        products={products}
        accentYellow={accentYellow}
        bgCard={bgCard}
        bgDark={bgDark}
        borderCard={borderCard}
        actioningId={actioningId}
        handleApprove={handleApprove}
        rejectingId={rejectingId}
        setRejectingId={setRejectingId}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        handleReject={handleReject}
      />
    </AdminShopLayout>
  );
}

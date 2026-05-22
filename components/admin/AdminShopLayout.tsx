'use client';

import React from 'react';

export function AdminShopLayout({ children, bgDark }: { children: React.ReactNode; bgDark: string }) {
  return (
    <div className="min-h-screen text-white p-8" style={{ backgroundColor: bgDark }}>
      {children}
    </div>
  );
}

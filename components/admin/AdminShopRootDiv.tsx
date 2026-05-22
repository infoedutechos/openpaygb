'use client';

import React from 'react';

export function AdminShopRootDiv({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-5xl mx-auto">
      {children}
    </div>
  );
}

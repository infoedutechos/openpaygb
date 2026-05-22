'use client';

import React from 'react';

export default function TransfersSectionRoot(props: { children?: React.ReactNode; className?: string }) {
  return React.createElement('section', { className: props.className }, props.children ?? null);
}

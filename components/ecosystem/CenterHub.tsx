'use client';

import Image from 'next/image';

type Props = {
  title?: string;
  tagline?: string;
};

export default function CenterHub({
  title = 'URA Civilizational Ecosystem',
  tagline = 'Fiscal Fun — Uganda Revenue Authority',
}: Props) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 aspect-square w-[32%] min-w-[5.75rem] max-w-[8.5rem] -translate-x-1/2 -translate-y-1/2">
      <div className="relative h-full w-full overflow-hidden rounded-full border border-[#f3ba2f]/40 bg-[#faf8f5]/95 shadow-[0_0_32px_rgba(243,186,47,0.28),0_0_24px_rgba(56,189,248,0.14)] ring-1 ring-white/15">
        <Image
          src="/fiscalfun-ecosystem-hub.png"
          alt={`${title}. ${tagline}`}
          fill
          className="object-contain p-[3px]"
          sizes="(max-width: 400px) 34vw, 150px"
          priority={false}
        />
      </div>
    </div>
  );
}

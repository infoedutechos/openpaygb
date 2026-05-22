'use client';

import Image, { type StaticImageData } from 'next/image';

/** Stadium cap header — URA navy, gold rim (same chrome as Guild / Learn / Services tops). */
export default function UraStadiumPageHero({
  title,
  description,
  icon,
  iconAlt = '',
}: {
  title: string;
  description: string;
  icon: StaticImageData;
  iconAlt?: string;
}) {
  return (
    <div className="relative w-full">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(38vh,260px)] bg-gradient-to-b from-[#02091c] via-[#0a2650] to-transparent"
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-xl px-4 pt-5 pb-2">
        <div
          className="relative overflow-hidden rounded-[2.75rem] rounded-b-[1.35rem] border border-[#1e4a8a]/90 border-t-[3px] border-t-[#f3ba2f] bg-gradient-to-b from-[#061428] via-[#0a1f3d] to-[#0e2d58] px-5 pt-8 pb-7 text-center shadow-[0_0_0_1px_rgba(243,186,47,0.28),0_-10px_40px_rgba(243,186,47,0.2),0_18px_44px_rgba(0,0,0,0.42)]"
          role="banner"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/[0.08] to-transparent rounded-t-[2.75rem]"
            aria-hidden
          />
          <div className="relative flex flex-col items-center gap-4">
            <div className="relative rounded-2xl border border-[#8bb4ef]/45 bg-gradient-to-b from-[#1c4580] to-[#0f2d56] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_24px_rgba(0,0,0,0.4)]">
              <Image
                src={icon}
                alt={iconAlt}
                width={64}
                height={64}
                className="object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
              />
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
                {title}
              </h1>
              <p className="text-blue-100/95 text-sm mt-2 font-medium leading-relaxed max-w-md mx-auto">{description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

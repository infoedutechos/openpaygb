import Image from 'next/image';

export const Logo = () => {
  return (
    <div className="relative w-[100px] h-[100px]">
      <Image
        src="/logo.png"
        alt="URAPearls Logo"
        fill
        priority
        className="object-contain"
      />
    </div>
  );
}; 
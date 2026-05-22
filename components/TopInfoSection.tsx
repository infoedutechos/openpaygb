// components/TopInfoSection.tsx

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

'use client'

import IceCubes from '@/icons/IceCubes';
import { LEVELS } from '@/utils/consts';
import { useGameStore } from '@/utils/game-mechanics';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import Image from 'next/image';

interface TopInfoSectionProps {
    isGamePage?: boolean;
    setCurrentView?: (view: string) => void;
    onOpenMyProgress?: () => void;
}

export default function TopInfoSection({ isGamePage = false, onOpenMyProgress }: TopInfoSectionProps) {
    const {
        userTelegramName,
        gameLevelIndex,
        profitPerHour,
        totalDonatedPoints,
    } = useGameStore();
    const safeLevelIndex = Math.min(Math.max(gameLevelIndex, 0), LEVELS.length - 1);

    const handleOpenMyProgress = () => {
        triggerHapticFeedback(window);
        onOpenMyProgress?.();
    };

    const leftBlock = (
        <div className="flex items-center space-x-2">
            <div className="p-1 rounded-lg bg-ura-panel">
                <Image src={LEVELS[safeLevelIndex].smallImage} width={24} height={24} alt="Rank Icon" />
            </div>
            <div>
                <p className="text-sm flex items-center gap-1">
                    {userTelegramName}
                    {totalDonatedPoints > 0 && (
                        <span className="text-amber-400" title="Donor">⭐</span>
                    )}
                </p>
            </div>
        </div>
    );

    return (
        <div className="px-4 z-10">
            <div className="flex items-center justify-between space-x-4 mt-4">
                <div className="flex items-center w-1/3">
                    {isGamePage && onOpenMyProgress ? (
                        <button type="button" onClick={handleOpenMyProgress} className="text-left">
                            {leftBlock}
                        </button>
                    ) : (
                        leftBlock
                    )}
                </div>
                <div className={`flex items-center w-fit ${isGamePage ? 'px-4' : 'px-8'} py-[2px] max-w-64`}>
                    <div className="flex-1 text-center">
                        <p className="text-xs text-[#85827d] font-medium whitespace-nowrap overflow-hidden text-ellipsis">PEARLS per hour</p>
                        <div className="flex items-center justify-center space-x-1">
                            <IceCubes size={20} />
                            <p className="text-sm">+{formatNumber(profitPerHour)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
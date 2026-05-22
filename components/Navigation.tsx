// components/Navigation.tsx

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

'use client'

import Image, { StaticImageData } from 'next/image';
import { navHome, navLearn, navServices, earnRewardsIcon, navGuild } from '@/images';
import { FC } from 'react';
import { IconProps } from '@/utils/types';
import { triggerHapticFeedback } from '@/utils/ui';

type NavItem = {
    name: string;
    icon?: FC<IconProps> | null;
    image?: StaticImageData | null;
    view: string;
};

const navItems: NavItem[] = [
    { name: 'Home', image: navHome, view: 'home' },
    { name: 'Learn', image: navLearn, view: 'eearn' },
    { name: 'Services', image: navServices, view: 'services' },
    { name: 'Earn', image: earnRewardsIcon, view: 'earn' },
    { name: 'Guild', image: navGuild, view: 'guild' },
];

interface NavigationProps {
    currentView: string;
    setCurrentView: (view: string) => void;
}

export default function Navigation({ currentView, setCurrentView }: NavigationProps) {
    const handleViewChange = (view: string) => {
        if (typeof setCurrentView === 'function') {
            triggerHapticFeedback(window);
            setCurrentView(view);
        }
    };

    if (typeof setCurrentView !== 'function') {
        console.error('setCurrentView is not a function. Navigation cannot be rendered properly.');
        return null; // or return some fallback UI
    }

    return (
        <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] w-full max-w-xl bg-ura-panel-2 flex justify-around items-center z-40 text-xs border-t border-ura-border/60 max-h-24">
            {navItems.map((item) => (
                <button
                    key={item.name}
                    onClick={() => handleViewChange(item.view)}
                    className="flex-1"
                >
                    <div
                        className={`flex flex-col items-center justify-center ${
                            currentView === item.view || (item.view === 'earn' && currentView === 'karibu-daily')
                                ? 'text-white bg-ura-panel-3/80'
                                : 'text-gray-400'
                        } h-16 m-1 p-2 rounded-2xl`}
                    >
                        <div className="w-8 h-8 relative">
                            {item.image && (
                                <div className="w-full h-full relative">
                                    <Image
                                        src={item.image}
                                        alt={item.name}
                                        width={32}
                                        height={32}
                                        className="object-contain"
                                    />
                                </div>
                            )}
                            {item.icon && <item.icon className="w-full h-full" />}
                        </div>
                        <p className="mt-1">{item.name}</p>
                    </div>
                </button>
            ))}
        </div>
    );
}
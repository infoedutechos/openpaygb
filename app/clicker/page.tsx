// app/clicker/page.tsx

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

'use client'

import React, { useState, useEffect, useCallback, ReactNode, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { resolveClickerView } from '@/utils/clicker-views';
import Game from '@/components/Game';
import { safeTelegramExitFullscreen } from '@/utils/telegram-webapp';
import Mine from '@/components/Mine';
import Friends from '@/components/Friends';
import Earn from '@/components/Earn';
import Airdrop from '@/components/Airdrop';
import Navigation from '@/components/Navigation';
import LoadingScreen from '@/components/Loading';
import Boost from '@/components/Boost';
import { AutoIncrement } from '@/components/AutoIncrement';
import { PointSynchronizer } from '@/components/PointSynchronizer';
import Settings from '@/components/Settings';
import Collection from '@/components/Collection';
import Home from '@/components/Home';
import Learn from '@/components/Learn';
import Services from '@/components/Services';
import Guild from '@/components/Guild';
import KaribuDailyPage from '@/components/KaribuDailyPage';
import UraTvPage from '@/components/UraTvPage';
import UraFcPage from '@/components/UraFcPage';

function useExitFullscreenWhenOpenedViaOpenButton() {
  useEffect(() => {
    safeTelegramExitFullscreen();
    const t = setTimeout(safeTelegramExitFullscreen, 600);
    return () => clearTimeout(t);
  }, []);
}

function EmptyPrimaryPage() {
    return <div className="bg-ura-page min-h-screen" />;
}

const MORE_VIEWS = new Set([
    'game',
    'mine',
    'collection',
    'friends',
    'airdrop',
    'guild',
    'ura-tv',
    'ura-fc',
]);

function ClickerPageInner() {
    useExitFullscreenWhenOpenedViaOpenButton();
    const searchParams = useSearchParams();
    const initialView = resolveClickerView(searchParams.get('view'));
    const [currentView, setCurrentViewState] = useState<string>('loading');
    const [isInitialized, setIsInitialized] = useState(false);

    const setCurrentView = (newView: string) => {
        setCurrentViewState(newView);
    };

    const renderCurrentView = useCallback(() => {
        if (!isInitialized) {
            return <LoadingScreen
                setIsInitialized={setIsInitialized}
                setCurrentView={setCurrentView}
                initialView={initialView}
            />;
        }

        switch (currentView) {
            case 'home':
                return <Home setCurrentView={setCurrentView} />;
            case 'game':
                return <Game
                    setCurrentView={setCurrentView}
                />;
            case 'boost':
                return <Boost
                    setCurrentView={setCurrentView}
                />;
            case 'settings':
                return <Settings setCurrentView={setCurrentView} />;
            case 'mine':
                return <Mine setCurrentView={setCurrentView} />;
            case 'friends':
                return <Friends />;
            case 'eearn':
                return <Learn />;
            case 'ura-tv':
                return <UraTvPage setCurrentView={setCurrentView} />;
            case 'ura-fc':
                return <UraFcPage setCurrentView={setCurrentView} />;
            case 'services':
                return <Services />;
            case 'guild':
                return <Guild setCurrentView={setCurrentView} />;
            case 'earn':
                return <Earn setCurrentView={setCurrentView} minimalOnly />;
            case 'karibu-daily':
                return <KaribuDailyPage setCurrentView={setCurrentView} />;
            case 'airdrop':
                return <Airdrop />;
            case 'collection':
                return <Collection setCurrentView={setCurrentView} />;
            default:
                return <EmptyPrimaryPage />;
        }
    }, [currentView, initialView, isInitialized]);

    return (
        <div className="bg-ura-page min-h-screen text-white tg-safe-area-padding">
            {
                isInitialized &&
                <>
                    <AutoIncrement />
                    <PointSynchronizer />
                </>
            }
            {renderCurrentView()}
            {isInitialized && MORE_VIEWS.has(currentView) && currentView !== 'guild' && (
                <button
                    type="button"
                    onClick={() => setCurrentView('earn')}
                    className="fixed top-4 left-4 z-50 rounded-lg bg-ura-navy/65 border border-ura-border/75 px-3 py-1.5 text-sm font-semibold text-white"
                >
                    ← Back
                </button>
            )}
            {isInitialized && currentView !== 'loading' && (
                <Navigation
                    currentView={currentView}
                    setCurrentView={setCurrentView}
                />
            )}
        </div>
    );
}

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    // React passes error; we only need to flip UI state.
    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        void error;
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.log('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return <h1>Something went wrong.</h1>;
        }

        return this.props.children;
    }
}

function ClickerSuspenseFallback() {
    return (
        <div className="bg-ura-page min-h-screen text-white flex items-center justify-center tg-safe-area-padding">
                <div className="w-8 h-8 border-4 border-[#f3ba2f] border-t-transparent rounded-full animate-spin" />
        </div>
    );
}

function ClickerPageWithErrorBoundary() {
    return (
        <ErrorBoundary>
            <Suspense fallback={<ClickerSuspenseFallback />}>
                <ClickerPageInner />
            </Suspense>
        </ErrorBoundary>
    );
}

// Avoid React #419: "server could not finish this Suspense boundary". Render the app only
// after client mount so TonConnect / Zustand / browser APIs never run during SSR.
export default function ClickerPageClientOnly() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);
    if (!mounted) {
        return (
            <div className="bg-ura-page min-h-screen text-white flex items-center justify-center tg-safe-area-padding">
                <div className="w-8 h-8 border-4 border-[#f3ba2f] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }
    return <ClickerPageWithErrorBoundary />;
}
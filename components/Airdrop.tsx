// components/Airdrop.tsx — UI: "Drops & Market" (view id remains `airdrop`).

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { pearlWhite } from '@/images';
import Angle from '@/icons/Angle';
import { useGameStore } from '@/utils/game-mechanics';
import { useToast } from '@/contexts/ToastContext';
import IceCube from '@/icons/IceCube';
import { triggerHapticFeedback } from '@/utils/ui';
import OnchainTaskPopup from './popups/OnchainTaskPopup';
import GlobalRankingPopup from './popups/GlobalRankingPopup';
import TransfersSection from './TransfersSection';
import { PlayTonWalletConnect } from '@/components/PlayTonWalletConnect';

interface OnchainTask {
  id: string;
  smartContractAddress: string;
  price: string;
  collectionMetadata: {
    name: string;
    description: string;
    image: string;
  };
  itemMetadata: unknown;
  points: number;
  isActive: boolean;
  isCompleted: boolean;
}

export default function Airdrop() {
  const { userTelegramInitData } = useGameStore();
  const showToast = useToast();
  const [onchainTasks, setOnchainTasks] = useState<OnchainTask[]>([]);
  const [selectedOnchainTask, setSelectedOnchainTask] = useState<OnchainTask | null>(null);
  const [showRankings, setShowRankings] = useState(false);

  const fetchOnchainTasks = useCallback(async () => {
    try {
      const response = await fetch(`/api/onchain-tasks?initData=${encodeURIComponent(userTelegramInitData)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch onchain tasks');
      }
      const data = await response.json();
      setOnchainTasks(data);
    } catch (error) {
      console.error('Error fetching onchain tasks:', error);
      showToast('Failed to load onchain tasks', 'error');
    }
  }, [userTelegramInitData, showToast]);

  useEffect(() => {
    fetchOnchainTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOnchainTasks]);

  const handleOnchainTaskClick = (task: OnchainTask) => {
    if (!task.isCompleted) {
      triggerHapticFeedback(window);
      setSelectedOnchainTask(task);
    }
  };

  const handleTaskUpdate = useCallback((updatedTask: OnchainTask) => {
    setOnchainTasks((prevTasks) => prevTasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  }, []);

  return (
    <div className="bg-ura-page flex justify-center min-h-screen">
      <div className="w-full bg-ura-page text-white font-bold flex flex-col max-w-xl">
        <div className="flex-grow mt-4 bg-ura-gold rounded-t-[48px] relative top-glow z-0">
          <div className="mt-[2px] bg-ura-panel rounded-t-[46px] h-full overflow-y-auto no-scrollbar">
            <div className="px-4 pt-1 pb-24">
              <div className="relative mt-4">
                <div className="flex justify-center mb-4">
                  <Image src={pearlWhite} alt="White Pearl" width={96} height={96} className="rounded-full mr-2" />
                </div>
                <h1 className="text-2xl text-center mb-2">Drops & Market</h1>
                <p className="text-gray-300 text-center mb-4 font-normal">
                  Complete challenges to qualify for Drops. View country rankings.
                </p>

                <div className="flex gap-1 p-1 rounded-xl bg-ura-panel-2 border border-ura-border/85 mb-6">
                  <button
                    type="button"
                    aria-current="page"
                    className="flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold bg-ura-gold text-black"
                  >
                    Drops
                  </button>
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    title="Market is not available yet"
                    className="flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold text-gray-500 bg-[#14161b] border border-[#2a2c32] cursor-not-allowed opacity-60"
                  >
                    <span className="block">Market</span>
                    <span className="block text-[10px] font-normal opacity-90">Unavailable</span>
                  </button>
                </div>

                <PlayTonWalletConnect className="mb-6" />

                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback(window);
                    setShowRankings(true);
                  }}
                  className="w-full bg-gradient-to-r from-ura-gold to-ura-gold-deep text-black font-bold py-4 px-6 rounded-xl mb-6 flex items-center justify-between hover:from-ura-gold-deep hover:to-ura-gold-deep transition-all shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-ura-navy/20 rounded-full flex items-center justify-center text-xl">🏆</div>
                    <div className="text-left">
                      <div className="text-lg">Country Ranking</div>
                      <div className="text-sm opacity-75">View players by district and country</div>
                    </div>
                  </div>
                  <Angle size={32} className="text-black" />
                </button>

                <TransfersSection userTelegramInitData={userTelegramInitData} />
                <h2 className="text-base mt-8 mb-4">Tasks</h2>
                <div className="space-y-2">
                  {onchainTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      className="w-full flex justify-between items-center bg-ura-panel-2 rounded-lg p-4"
                      onClick={() => handleOnchainTaskClick(task)}
                    >
                      <div className="flex items-center">
                        <Image
                          src={task.collectionMetadata.image}
                          alt={task.collectionMetadata.name}
                          width={40}
                          height={40}
                          className="rounded-lg mr-2"
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{task.collectionMetadata.name}</span>
                          <div className="flex items-center">
                            <IceCube className="w-6 h-6 mr-1" />
                            <span className="text-white">+{task.points}</span>
                          </div>
                        </div>
                      </div>
                      {task.isCompleted ? (
                        <svg
                          className="w-6 h-6 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span>{formatTON(task.price)} TON</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {selectedOnchainTask && (
        <OnchainTaskPopup
          task={selectedOnchainTask}
          onClose={() => setSelectedOnchainTask(null)}
          onUpdate={handleTaskUpdate}
        />
      )}
      {showRankings && <GlobalRankingPopup onClose={() => setShowRankings(false)} />}
    </div>
  );
}

function formatTON(nanoTON: string): string {
  return (parseInt(nanoTON, 10) / 1e9).toFixed(2);
}

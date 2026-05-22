// components/popups/OnchainTaskPopup.tsx

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

'use client'

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import IceCube from '@/icons/IceCube';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { useToast } from '@/contexts/ToastContext';
import { Address, beginCell, toNano } from '@ton/core';
import { useGameStore } from '@/utils/game-mechanics';
import { notifyPearlBalancesRefresh } from '@/utils/pearl-balance-events';

interface OnchainTask {
    id: string;
    smartContractAddress: string;
    price: string;
    collectionMetadata: {
        name: string;
        description: string;
        image: string;
    };
    itemMetadata: any;
    points: number;
    isActive: boolean;
    isCompleted: boolean;
}

interface OnchainTaskPopupProps {
    task: OnchainTask;
    onClose: () => void;
    onUpdate: (updatedTask: OnchainTask) => void;
}

const OnchainTaskPopup: React.FC<OnchainTaskPopupProps> = React.memo(({ task, onClose, onUpdate }) => {
    const [isClosing, setIsClosing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [tonConnectUI] = useTonConnectUI();
    const showToast = useToast();
    const { userTelegramInitData, incrementPoints } = useGameStore();

    const handleMint = useCallback(async () => {
        if (!tonConnectUI.account) {
            showToast('Please connect your TON wallet first', 'error');
            return;
        }

        setIsLoading(true);
        try {
            triggerHapticFeedback(window);

            const nftCollectionAddress = Address.parse(task.smartContractAddress);
            const totalMintCost = BigInt(task.price) + BigInt(toNano(0.05));

            await tonConnectUI.sendTransaction({
                validUntil: Math.floor(Date.now() / 1000) + 60,
                messages: [
                    {
                        address: nftCollectionAddress.toString(),
                        amount: totalMintCost.toString(),
                        payload: beginCell().storeUint(0, 32).storeStringTail("Mint").endCell().toBoc().toString('base64'),
                    },
                ],
            });

            showToast('Minting transaction sent successfully!', 'success');
        } catch (error) {
            console.error('Error minting NFT:', error);
            showToast('Error minting NFT. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [task, tonConnectUI, showToast]);

    const handleCheck = useCallback(async () => {
        setIsLoading(true);
        try {
            triggerHapticFeedback(window);
            const response = await fetch('/api/onchain-tasks/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    initData: userTelegramInitData,
                    taskId: task.id,
                }),
            });

            const data = await response.json();

            // Even if response.ok is false, we want to show the message from the server
            if (data.success) {
                incrementPoints(task.points);
                const updatedTask = { ...task, isCompleted: true };
                onUpdate(updatedTask);
                showToast(data.message || 'Task completed successfully!', 'success');
                notifyPearlBalancesRefresh();
                onClose(); // Close the popup after successful completion
            } else {
                // Show the error message from the server
                showToast(data.error || data.message || 'Failed to complete task. Please try again.', 'error');
            }
        } catch (error) {
            // This will only trigger for network errors or other exceptions
            console.error('Error checking NFT:', error);
            showToast('Error checking NFT. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [task, userTelegramInitData, incrementPoints, showToast, onClose, onUpdate]);

    const handleClose = useCallback(() => {
        triggerHapticFeedback(window);
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 280); // Match this to the animation duration
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-page/50 p-0 sm:items-center sm:p-4">
            <div className={`max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-ura-panel-2 p-6 sm:rounded-2xl ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}>
                <div className="flex justify-between items-center mb-4">
                    <div className="w-8"></div>
                    <h2 className="text-xl text-white text-center font-bold sm:text-3xl">{task.collectionMetadata.name}</h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <Image src={task.collectionMetadata.image} alt={task.collectionMetadata.name} width={80} height={80} className="mx-auto mb-4 rounded-lg" />
                <p className="text-gray-300 text-center mb-4">{task.collectionMetadata.description}</p>
                <div className="flex justify-center items-center mb-4">
                    <IceCube className="w-6 h-6" />
                    <span className="text-white font-bold text-2xl ml-1">+{formatNumber(task.points)}</span>
                </div>
                <p className="text-center mb-4">Price: {formatTON(task.price)} TON</p>
                {task.isCompleted ? (
                    <button
                        className="flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-green-500 py-4 text-lg font-bold text-white sm:py-6 sm:text-xl"
                        disabled
                    >
                        Completed
                    </button>
                ) : (
                    <>
                        <button
                            className={`flex min-h-[48px] w-full items-center justify-center rounded-2xl py-4 text-lg font-bold text-white sm:py-6 sm:text-xl ${isLoading ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-500'
                                }`}
                            onClick={handleMint}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-t-2 border-white border-solid rounded-full animate-spin"></div>
                            ) : (
                                'Mint NFT'
                            )}
                        </button>
                        <button
                            className={`mt-4 flex min-h-[48px] w-full items-center justify-center rounded-2xl py-4 text-lg font-bold text-white sm:py-6 sm:text-xl ${isLoading ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-500'
                                }`}
                            onClick={handleCheck}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-t-2 border-white border-solid rounded-full animate-spin"></div>
                            ) : (
                                'Check'
                            )}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
});

OnchainTaskPopup.displayName = 'OnchainTaskPopup';

// Helper function to format TON amount
function formatTON(nanoTON: string): string {
    return (parseInt(nanoTON) / 1e9).toFixed(2);
}

export default OnchainTaskPopup;
// components/popups/TaskPopup.tsx

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import IceCube from '@/icons/IceCube';
import { useGameStore } from '@/utils/game-mechanics';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import { notifyPearlBalancesRefresh } from '@/utils/pearl-balance-events';
import { getTaskImageSrc, pearlWhite } from '@/images';
import { useHydration } from '@/utils/useHydration';
import { TASK_WAIT_TIME } from '@/utils/consts';
import { useToast } from '@/contexts/ToastContext';
import { TaskPopupProps } from '@/utils/types';

const NO_ANSWER_VERIFICATION_NOTE = 'The system will run verification now, process payout and will do one more verification follow up to ensure compliance.';

const TaskPopup: React.FC<TaskPopupProps> = React.memo(({ task, onClose, onUpdate }) => {
  const [isClosing, setIsClosing] = useState(false);
  const showToast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { userTelegramInitData, incrementPoints, setPoints, setPointsBalance } = useGameStore();
  const isHydrated = useHydration();
  const [localTask, setLocalTask] = useState(task);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isTimerFinished, setIsTimerFinished] = useState(false);
  const [answerInput, setAnswerInput] = useState('');
  const [redeemCodeInput, setRedeemCodeInput] = useState('');
  const handleCheckRef = useRef<() => Promise<void>>(async () => {});
  const localTaskRef = useRef(localTask);
  localTaskRef.current = localTask;
  /** Prevents double auto-verify when interval ticks again at 0 */
  const visitAutoVerifyKeyRef = useRef<string | null>(null);

  const handleStart = useCallback(async () => {
    setIsLoading(true);
    try {
      triggerHapticFeedback(window);
      const response = await fetch('/api/tasks/update/visit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initData: userTelegramInitData,
          taskId: localTask.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start task');
      }

      const data = await response.json();
      const updatedTask = {
        ...localTask,
        taskStartTimestamp: new Date(data.taskStartTimestamp),
      };
      setLocalTask(updatedTask);
      onUpdate(updatedTask);
      showToast('Task started successfully!', 'success');
      // Link opens from the Visit / call-to-action button only (not on Start).
    } catch (error) {
      console.error('Error starting task:', error);
      showToast('Failed to start task. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [localTask, userTelegramInitData, onUpdate, showToast]);

  const handleCheck = async () => {
    setIsLoading(true);
    try {
      triggerHapticFeedback(window);
      let response;
      if (localTask.type === 'VISIT') {
        const correctAnswer = localTask.taskData?.correctAnswer?.trim();
        if (correctAnswer && !answerInput.trim()) {
          showToast('Please enter your answer after watching the video.', 'error');
          setIsLoading(false);
          return;
        }
        response = await fetch('/api/tasks/check/visit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            initData: userTelegramInitData,
            taskId: localTask.id,
            answer: answerInput.trim() || undefined,
          }),
        });
      } else if (localTask.type === 'REFERRAL') {
        response = await fetch('/api/tasks/check/referral', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            initData: userTelegramInitData,
            taskId: localTask.id,
          }),
        });
      } else if (localTask.type === 'TELEGRAM') {
        response = await fetch('/api/tasks/check/telegram', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            initData: userTelegramInitData,
            taskId: localTask.id,
          }),
        });
      } else if (localTask.type === 'REDEEM_CODE') {
        if (!redeemCodeInput.trim()) {
          showToast('Please enter your code.', 'error');
          setIsLoading(false);
          return;
        }
        response = await fetch('/api/tasks/check/redeem-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            initData: userTelegramInitData,
            taskId: localTask.id,
            code: redeemCodeInput.trim(),
          }),
        });
      } else {
        throw new Error(`Unsupported task type: ${localTask.type}`);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error || `Failed to check ${localTask.type} task`;
        showToast(msg, 'error');
        setIsLoading(false);
        return;
      }

      const data = await response.json();

      if (data.success) {
        const updatedTask = { ...localTask, isCompleted: data.isCompleted };
        setLocalTask(updatedTask);
        onUpdate(updatedTask);
        const rewardRaw = data.reward ?? localTask.points ?? 0;
        const reward = Math.floor(Number(rewardRaw));
        const rewardDelta = Number.isFinite(reward) ? reward : 0;
        const pts = Number(data.points);
        const bal = Number(data.pointsBalance);
        if (Number.isFinite(pts) && Number.isFinite(bal)) {
          setPoints(Math.floor(pts));
          setPointsBalance(Math.floor(bal));
        } else if (rewardDelta > 0) {
          incrementPoints(rewardDelta);
        }
        showToast(data.message || 'Task completed successfully!', 'success');
        notifyPearlBalancesRefresh();
      } else {
        if (localTask.type === 'REFERRAL' && data.currentReferrals !== undefined && data.requiredReferrals !== undefined) {
          const remainingReferrals = data.requiredReferrals - data.currentReferrals;
          showToast(`You need ${remainingReferrals} more referral${remainingReferrals > 1 ? 's' : ''} to complete this task. (${data.currentReferrals}/${data.requiredReferrals})`, 'error');
        } else {
          showToast(data.message || `Failed to complete ${localTask.type} task. Please try again.`, 'error');
        }
      }
    } catch (error) {
      console.error('Error checking task:', error);
      showToast(error instanceof Error ? error.message : `Failed to check ${localTask.type} task. Please try again.`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  handleCheckRef.current = handleCheck;

  useEffect(() => {
    visitAutoVerifyKeyRef.current = null;
  }, [localTask.id, localTask.taskStartTimestamp]);

  const getTimeRemaining = useCallback(() => {
    if (!localTask.taskStartTimestamp) return null;
    const now = new Date();
    const startTime = new Date(localTask.taskStartTimestamp);
    const elapsedTime = now.getTime() - startTime.getTime();
    const remainingTime = Math.max(TASK_WAIT_TIME - elapsedTime, 0);
    return remainingTime;
  }, [localTask.taskStartTimestamp]);

  const formatTime = useCallback((ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (isHydrated && localTask.taskStartTimestamp && !localTask.isCompleted) {
      const updateTimer = () => {
        const remaining = getTimeRemaining();
        setTimeRemaining(remaining);
        if (remaining === 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setLocalTask((prev) => ({ ...prev }));
          setIsTimerFinished(true);
          const t = localTaskRef.current;
          const verifyKey = `${t.id}:${String(t.taskStartTimestamp)}`;
          const needsAnswer = Boolean(t.taskData?.correctAnswer?.trim());
          if (
            visitAutoVerifyKeyRef.current !== verifyKey &&
            t.type === 'VISIT' &&
            !t.isCompleted &&
            !needsAnswer
          ) {
            visitAutoVerifyKeyRef.current = verifyKey;
            queueMicrotask(() => void handleCheckRef.current());
          }
        } else {
          setIsTimerFinished(false);
        }
      };

      updateTimer();
      if (getTimeRemaining() !== 0) {
        intervalRef.current = setInterval(updateTimer, 1000);
      }

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [isHydrated, localTask.taskStartTimestamp, localTask.isCompleted, localTask.id, getTimeRemaining]);

  const handleClose = () => {
    triggerHapticFeedback(window);
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 280); // Match this to the animation duration
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-page/50 p-0 sm:items-center sm:p-4">
      <div className={`max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-ura-panel-2 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-2xl ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}>
        <div className="flex justify-between items-center mb-4 gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 text-sm font-medium transition-colors shrink-0"
            aria-label="Back"
          >
            <span aria-hidden>←</span>
            <span>Back</span>
          </button>
          <h2 className="text-xl sm:text-2xl text-white text-center font-bold truncate flex-1 min-w-0">{localTask.title}</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 shrink-0"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        {(() => {
          const imgSrc = getTaskImageSrc(localTask.image);
          return imgSrc ? (
            <Image src={imgSrc} alt={localTask.title} width={80} height={80} className="mx-auto mb-4 rounded-lg object-contain" />
          ) : (
            <div className="w-20 h-20 mx-auto mb-4 rounded-lg bg-ura-panel-2 flex items-center justify-center">
              <IceCube className="w-10 h-10 text-[#f3ba2f]" />
            </div>
          );
        })()}
        <p className="text-gray-300 text-center mb-4">{localTask.description}</p>
        {localTask.type === 'REFERRAL' && localTask.taskData?.friendsNumber != null && (
          <p className="text-sm text-[#f3ba2f] font-medium text-center mb-3">
            Number of friends (required): {Number(localTask.taskData.friendsNumber)} — invite them to get the reward
          </p>
        )}
        {localTask.type === 'VISIT' && (
          <>
            <p className="text-sm text-gray-400 text-center mb-3">
              {localTask.taskData?.correctAnswer
                ? 'When you tap Start, the link opens and a short wait begins. Watch the video, then when the timer ends enter the answer below and tap Check to claim your reward.'
                : 'When you tap Start, the link opens and a short wait begins. Watch the video, then when the timer ends tap Check to claim your reward.'}
            </p>
            <div className="text-sm text-amber-200/90 text-center mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
              {localTask.taskData?.correctAnswer
                ? 'Reasonable watch time is required and verified. The answer is 1 or 2 words shown in the video — look for the ★ or highlighted text.'
                : NO_ANSWER_VERIFICATION_NOTE}
            </div>
          </>
        )}
        {localTask.taskData?.link && (
          <div className="flex justify-center mb-4">
            <button
              type="button"
              className="w-fit px-6 py-3 text-xl font-bold bg-blue-500 text-white rounded-2xl"
              onClick={() => {
                triggerHapticFeedback(window);
                window.open(localTask.taskData.link, '_blank');
              }}
            >
              {localTask.type === 'REDEEM_CODE'
                ? 'Attend'
                : (localTask.callToAction?.trim() || 'Visit')}
            </button>
          </div>
        )}
        <div className="flex justify-center items-center mb-4 gap-2 flex-nowrap">
          <Image src={pearlWhite} alt="" width={32} height={32} className="h-8 w-8 shrink-0 object-contain" />
          <span className="text-white font-bold text-2xl whitespace-nowrap">
            +{formatNumber(localTask.points)} pearls
          </span>
        </div>
        {localTask.type === 'VISIT' && localTask.taskData?.correctAnswer && (
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Your answer (from the video — required to claim)</label>
            <input
              type="text"
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              placeholder="Enter the answer from the video"
              className="w-full bg-ura-panel border border-ura-border/75 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#f3ba2f] focus:outline-none"
              autoComplete="off"
            />
          </div>
        )}
        {localTask.type === 'REDEEM_CODE' && (
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Code</label>
            <input
              type="text"
              value={redeemCodeInput}
              onChange={(e) => setRedeemCodeInput(e.target.value)}
              placeholder="Enter the code"
              className="w-full bg-ura-panel border border-ura-border/75 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#f3ba2f] focus:outline-none"
              autoComplete="off"
            />
          </div>
        )}
        {localTask.type === 'VISIT' ? (
          <button
            type="button"
            className={`flex min-h-[48px] w-full items-center justify-center rounded-2xl py-4 text-lg font-bold text-white sm:py-6 sm:text-xl ${isLoading || localTask.isCompleted || (localTask.taskStartTimestamp && !isTimerFinished) || (localTask.taskData?.correctAnswer && !answerInput.trim() && localTask.taskStartTimestamp && isTimerFinished)
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-green-500'
              }`}
            onClick={localTask.taskStartTimestamp ? (isTimerFinished ? handleCheck : undefined) : handleStart}
            disabled={Boolean(isLoading || localTask.isCompleted || (localTask.taskStartTimestamp && !isTimerFinished) || (localTask.taskData?.correctAnswer && !answerInput.trim() && localTask.taskStartTimestamp && isTimerFinished))}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-t-2 border-white border-solid rounded-full animate-spin"></div>
            ) : localTask.isCompleted ? (
              'Completed'
            ) : localTask.taskStartTimestamp ? (
              isHydrated
                ? timeRemaining === 0
                  ? localTask.taskData?.correctAnswer?.trim()
                    ? 'Check'
                    : 'Verifying…'
                  : formatTime(timeRemaining || 0)
                : 'Loading...'
            ) : (
              'Start'
            )}
          </button>
        ) : localTask.type === 'REDEEM_CODE' ? (
          <button
            className={`flex min-h-[48px] w-full items-center justify-center rounded-2xl py-4 text-lg font-bold text-white sm:py-6 sm:text-xl ${isLoading || localTask.isCompleted || !redeemCodeInput.trim() ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-500'}`}
            onClick={handleCheck}
            disabled={isLoading || localTask.isCompleted || !redeemCodeInput.trim()}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-t-2 border-white border-solid rounded-full animate-spin"></div>
            ) : localTask.isCompleted ? (
              'Completed'
            ) : (
              localTask.callToAction || 'Redeem code'
            )}
          </button>
        ) : (
          <button
            className="flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-green-500 py-4 text-lg font-bold text-white sm:py-6 sm:text-xl"
            onClick={handleCheck}
            disabled={isLoading || localTask.isCompleted}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-t-2 border-white border-solid rounded-full animate-spin"></div>
            ) : localTask.isCompleted ? (
              'Completed'
            ) : (
              'Check'
            )}
          </button>
        )}
      </div>
    </div>
  );
});

TaskPopup.displayName = 'TaskPopup';

export default TaskPopup;
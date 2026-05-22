'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import IceCube from '@/icons/IceCube';
import { useGameStore } from '@/utils/game-mechanics';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import { notifyPearlBalancesRefresh } from '@/utils/pearl-balance-events';
import { useToast } from '@/contexts/ToastContext';

const QUIZ_TIME_SECONDS = 60;

interface QuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  order: number;
}

type QuizAnswerReviewItem = {
  questionId: string;
  questionText: string;
  userAnswerIndex: number;
  userAnswerText: string | null;
  correctAnswerIndex: number;
  correctAnswerText: string | null;
  isCorrect: boolean;
};

interface MitrolabsQuizPopupProps {
  onClose: () => void;
}

export default function MitrolabsQuizPopup({ onClose }: MitrolabsQuizPopupProps) {
  const { userTelegramInitData, incrementPoints, setPoints, setPointsBalance } = useGameStore();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<{ correctCount: number; totalCount: number; pointsAwarded: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUIZ_TIME_SECONDS);
  const [timeUp, setTimeUp] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedOnTimeUpRef = useRef(false);
  const [result, setResult] = useState<{
    correctCount: number;
    totalCount: number;
    pointsAwarded: number;
    pointsFromQuestions?: number;
    completionBonus?: number;
    answerReview?: QuizAnswerReviewItem[];
  } | null>(null);
  const showToast = useToast();

  const fetchQuiz = useCallback(async () => {
    try {
      const url = userTelegramInitData
        ? `/api/quiz?initData=${encodeURIComponent(userTelegramInitData)}`
        : '/api/quiz';
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load URA Quiz');
      const data = await res.json();
      setQuestions(data.questions ?? []);
      setHasCompleted(data.hasCompleted ?? false);
      setLastAttempt(data.lastAttempt ?? null);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [userTelegramInitData]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  // 60s countdown when quiz is active (questions loaded, not completed, not yet result)
  useEffect(() => {
    if (loading || questions.length === 0 || hasCompleted || result) return;
    setTimeLeft(QUIZ_TIME_SECONDS);
    setTimeUp(false);
    submittedOnTimeUpRef.current = false;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setTimeUp(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [loading, questions.length, hasCompleted, result]);

  useEffect(() => {
    if (!timeUp || submittedOnTimeUpRef.current || submitting || questions.length === 0 || !userTelegramInitData) return;
    submittedOnTimeUpRef.current = true;
    handleSubmit(true);
  }, [timeUp]); // eslint-disable-line react-hooks/exhaustive-deps -- only run when timeUp flips

  const handleSelectOption = (optionIndex: number) => {
    triggerHapticFeedback(window);
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = optionIndex;
      return next;
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleSubmit = async (forceSubmit = false) => {
    if (!userTelegramInitData) {
      showToast('Open the app from Telegram to submit your answers.', 'error');
      return;
    }
    if (questions.length === 0 || submitting) return;
    if (!forceSubmit && answers.length < questions.length && answers.every((a) => a === undefined)) {
      showToast('Please answer all questions', 'error');
      return;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSubmitting(true);
    triggerHapticFeedback(window);
    const answersToSend = questions.map((_, i) => answers[i] ?? -1);
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: userTelegramInitData, answers: answersToSend }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      if (data.alreadyCompleted) {
        setHasCompleted(true);
        setLastAttempt({ correctCount: data.correctCount, totalCount: data.totalCount, pointsAwarded: data.pointsAwarded });
      } else {
        setResult({
          correctCount: data.correctCount,
          totalCount: data.totalCount,
          pointsAwarded: data.pointsAwarded,
          pointsFromQuestions: data.pointsFromQuestions,
          completionBonus: data.completionBonus,
          answerReview: Array.isArray(data.answerReview) ? data.answerReview : [],
        });
        const awarded = Math.floor(Number(data.pointsAwarded));
        const hasAward = Number.isFinite(awarded) && awarded > 0;
        if (hasAward) {
          const pts = Number(data.points);
          const bal = Number(data.pointsBalance);
          if (Number.isFinite(pts) && Number.isFinite(bal)) {
            setPoints(Math.floor(pts));
            setPointsBalance(Math.floor(bal));
          } else {
            incrementPoints(awarded);
          }
          showToast(`+${formatNumber(awarded)} PEARLS!`, 'success');
          notifyPearlBalancesRefresh();
        }
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to submit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-ura-panel p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2 text-gray-400">
          <IceCube className="w-8 h-8 animate-pulse" />
          <span>Loading URA Quiz…</span>
        </div>
        <button type="button" onClick={onClose} className="mt-6 min-h-[48px] text-[#f3ba2f] hover:underline">Cancel</button>
      </div>
    );
  }

  if (questions.length === 0 && !hasCompleted) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-ura-panel p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <h2 className="text-xl font-bold text-white mb-2">URA Quiz</h2>
        <p className="text-gray-400 text-center mb-6 max-w-sm px-2">
          No active questions yet. Admins can add items under Admin → URA Quiz, load the question pool, and optionally
          turn on automated sets every Monday &amp; Thursday (UTC).
        </p>
        <button type="button" onClick={onClose} className="min-h-[48px] rounded-xl bg-ura-gold px-6 py-3 font-semibold text-black">Close</button>
      </div>
    );
  }

  if (hasCompleted && !result) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-ura-panel p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-2xl" aria-label="Close">&times;</button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl font-bold text-[#f3ba2f] mb-2">URA Quiz</h2>
          <p className="text-gray-300 mb-2">You have already completed today&apos;s URA Quiz.</p>
          {lastAttempt && (
            <p className="text-gray-400 text-sm">Score: {lastAttempt.correctCount}/{lastAttempt.totalCount} · +{formatNumber(lastAttempt.pointsAwarded)} PEARLS claimed</p>
          )}
          <button type="button" onClick={onClose} className="mt-8 px-6 py-3 bg-ura-gold text-black font-semibold rounded-xl">Close</button>
        </div>
      </div>
    );
  }

  if (result) {
    const fromQuestions = typeof result.pointsFromQuestions === 'number' ? result.pointsFromQuestions : 0;
    const bonus = typeof result.completionBonus === 'number' ? result.completionBonus : 0;
    const showBreakdown = result.pointsAwarded > 0 && (fromQuestions > 0 || bonus > 0);
    const noAnswersAttended = result.totalCount > 0 && result.correctCount === 0 && result.pointsAwarded === 0;

    const review = Array.isArray(result.answerReview) ? result.answerReview : [];
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-ura-panel p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-2xl" aria-label="Close">&times;</button>
        </div>
        <div className="flex-1 flex flex-col text-center overflow-y-auto no-scrollbar">
          <div className="flex flex-col items-center justify-center">
          <h2 className="text-2xl font-bold text-[#f3ba2f] mb-2">URA Quiz complete</h2>
          <p className="text-white text-lg mb-1">{result.correctCount} / {result.totalCount} correct</p>
          {noAnswersAttended && (
            <p className="text-gray-400 text-sm mb-2">You didn&apos;t answer any question in time. 0 PEARLS.</p>
          )}
          {result.pointsAwarded > 0 && (
            <div className="mb-6 space-y-1">
              <p className="text-emerald-400 font-semibold">+{formatNumber(result.pointsAwarded)} PEARLS added to your balance</p>
              {showBreakdown && (
                <div className="text-sm text-gray-400 mt-3 space-y-0.5">
                  {fromQuestions > 0 && (
                    <p>From correct answers: +{formatNumber(fromQuestions)} PEARLS</p>
                  )}
                  {bonus > 0 && (
                    <p className="text-[#f3ba2f] font-medium">All correct bonus: +{formatNumber(bonus)} PEARLS</p>
                  )}
                </div>
              )}
            </div>
          )}
          {!noAnswersAttended && result.pointsAwarded === 0 && result.totalCount > 0 && (
            <p className="text-gray-400 text-sm mb-4">+0 PEARLS this time.</p>
          )}
          </div>
          {review.length > 0 && (
            <div className="mt-4 text-left space-y-2">
              <p className="text-sm font-semibold text-[#f3ba2f]">Answer review</p>
              {review.map((item, index) => (
                <div
                  key={item.questionId}
                  className={`rounded-xl border px-3 py-3 ${
                    item.isCorrect ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-red-500/40 bg-red-500/10'
                  }`}
                >
                  <p className="text-xs text-gray-300 mb-1 flex items-center gap-1.5">
                    <span aria-hidden>{item.isCorrect ? '✅' : '❌'}</span>
                    <span>Q{index + 1}</span>
                  </p>
                  <p className="text-sm font-semibold text-white">{item.questionText}</p>
                  <p className={`text-xs mt-2 ${item.isCorrect ? 'text-emerald-300' : 'text-red-300'}`}>
                    {item.isCorrect ? 'Correct' : 'Wrong'}
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    Your answer: <span className="text-white">{item.userAnswerText ?? 'Not answered'}</span>
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    Right answer: <span className="text-emerald-300">{item.correctAnswerText ?? 'N/A'}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={onClose} className="px-6 py-3 bg-ura-gold text-black font-semibold rounded-xl">Close</button>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];
  const options = q?.options ?? [];
  const selected = answers[currentIndex];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ura-panel p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-400 text-sm">Question {currentIndex + 1} of {questions.length}</span>
        <div className="flex items-center gap-3">
          <span className={`text-lg font-mono font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-[#f3ba2f]'}`} aria-live="polite">
            Time: {timeLeft}
          </span>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-2xl" aria-label="Close">&times;</button>
        </div>
      </div>
      <h2 className="text-xl font-bold text-white mb-6">{q.questionText}</h2>
      <div className="space-y-3 flex-1">
        {options.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => timeLeft > 0 && handleSelectOption(i)}
            disabled={timeLeft === 0 || submitting}
            className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
              selected === i
                ? 'border-[#f3ba2f] bg-ura-gold/10 text-white'
                : 'border-ura-border/75 bg-ura-panel-2 text-gray-300 hover:border-[#4d5056]'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      <div className="flex gap-3 mt-6">
        {currentIndex > 0 && (
          <button type="button" onClick={handlePrev} className="px-4 py-3 bg-ura-panel-2 text-white rounded-xl font-medium">Previous</button>
        )}
        <button
          type="button"
          onClick={() => handleNext()}
          disabled={(selected === undefined && !timeUp) || submitting}
          className="flex-1 py-3 bg-ura-gold text-black font-semibold rounded-xl disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : timeLeft === 0 ? 'Time\'s up!' : currentIndex < questions.length - 1 ? 'Next' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

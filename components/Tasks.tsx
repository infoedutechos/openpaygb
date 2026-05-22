'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/utils/game-mechanics';
import type { Task } from '@/utils/types';

const Tasks: React.FC = () => {
  const { userTelegramInitData } = useGameStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    const initData = userTelegramInitData?.trim();
    if (!initData) {
      setTasks([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tasks?initData=${encodeURIComponent(initData)}`);
      if (!response.ok) {
        throw new Error(response.status === 403 ? 'Session could not be verified.' : 'Failed to load tasks.');
      }
      const data = (await response.json()) as { tasks?: Task[] };
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (e) {
      console.error('Error fetching tasks:', e);
      setTasks([]);
      setError(e instanceof Error ? e.message : 'Failed to load tasks.');
    } finally {
      setIsLoading(false);
    }
  }, [userTelegramInitData]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  return (
    <div className="text-white">
      <h2 className="text-lg font-semibold">Tasks</h2>
      {isLoading ? (
        <p className="mt-2 text-sm text-slate-400">Loading…</p>
      ) : error ? (
        <p className="mt-2 text-sm text-amber-200/90">{error}</p>
      ) : !userTelegramInitData?.trim() ? (
        <p className="mt-2 text-sm text-slate-400">Open in Telegram to load your tasks.</p>
      ) : tasks.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">No tasks to display.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
            >
              <span className="font-medium text-slate-100">{task.title}</span>
              {task.points > 0 ? (
                <span className="ml-2 text-xs text-cyan-200/90">+{task.points} PEARLS</span>
              ) : null}
              {task.isCompleted ? (
                <span className="ml-2 text-xs font-medium text-emerald-300">Done</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Tasks;

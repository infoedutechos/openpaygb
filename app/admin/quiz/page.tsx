'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { MITROLABS_QUIZ_MAX_OPTIONS, MITROLABS_QUIZ_REWARD_POINTS } from '@/utils/consts';

/** Preset branch names – select to add; questions can be grouped into these. */
const PRESET_BRANCHES = [
  'General',
  'URA & compliance',
  'Tax basics',
  'Technical',
  'NFTs',
  'Security',
] as const;

/** Quiz goes live at 19:36 UTC (7:36 PM UTC) each day; 22:36 EAT. */
const QUIZ_LIVE_UTC_HOUR = 19;
const QUIZ_LIVE_UTC_MINUTE = 36;

/** Next occurrence of 19:36 UTC (7:36 PM UTC) – when the new daily quiz goes live. */
function getNextQuizLiveAt(): Date {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), QUIZ_LIVE_UTC_HOUR, QUIZ_LIVE_UTC_MINUTE, 0, 0));
  if (now < today) return today;
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, QUIZ_LIVE_UTC_HOUR, QUIZ_LIVE_UTC_MINUTE, 0, 0));
  return tomorrow;
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '0s';
  const s = Math.floor((ms / 1000) % 60);
  const m = Math.floor((ms / (1000 * 60)) % 60);
  const h = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

interface QuizBranchRecord {
  id: string;
  name: string;
  order: number;
}

interface QuizQuestionRecord {
  id: string;
  questionText: string;
  options: string[];
  correctIndex: number;
  order: number;
  isActive: boolean;
  points: number;
  branchId: string | null;
  branch?: { id: string; name: string; order: number } | null;
  createdAt: string;
}

export default function AdminQuizPage() {
  const showToast = useToast();
  const [questions, setQuestions] = useState<QuizQuestionRecord[]>([]);
  const [branches, setBranches] = useState<QuizBranchRecord[]>([]);
  const [completionBonusPoints, setCompletionBonusPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formQuestion, setFormQuestion] = useState('');
  const [formOptions, setFormOptions] = useState<string[]>(['', '']);
  const [formCorrectIndex, setFormCorrectIndex] = useState(0);
  const [formOrder, setFormOrder] = useState(0);
  const [formActive, setFormActive] = useState(true);
  const [formPoints, setFormPoints] = useState(MITROLABS_QUIZ_REWARD_POINTS);
  const [formBranchId, setFormBranchId] = useState<string>('');
  const [newBranchName, setNewBranchName] = useState('');
  const [poolSeeding, setPoolSeeding] = useState(false);
  const [dailySetting, setDailySetting] = useState(false);
  const [resettingAttempts, setResettingAttempts] = useState(false);
  const [timeUntilNextQuiz, setTimeUntilNextQuiz] = useState<number | null>(null);
  const [autoRotationEnabled, setAutoRotationEnabled] = useState(false);
  const [autoRotationWeekdays, setAutoRotationWeekdays] = useState('1,4');
  const [autoRotationQuestionCount, setAutoRotationQuestionCount] = useState(5);
  const [lastAutoRotationUtcDate, setLastAutoRotationUtcDate] = useState<string | null>(null);
  const [savingAuto, setSavingAuto] = useState(false);
  const [runningRotationNow, setRunningRotationNow] = useState(false);

  // Countdown to next UTC midnight (when new quiz day goes live)
  useEffect(() => {
    const tick = () => {
      const next = getNextQuizLiveAt();
      setTimeUntilNextQuiz(Math.max(0, next.getTime() - Date.now()));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/quiz', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setQuestions(data.questions ?? []);
      setBranches(data.branches ?? []);
      setCompletionBonusPoints(typeof data.completionBonusPoints === 'number' ? data.completionBonusPoints : 0);
      setAutoRotationEnabled(Boolean(data.autoRotationEnabled));
      setAutoRotationWeekdays(typeof data.autoRotationWeekdays === 'string' && data.autoRotationWeekdays.trim() ? data.autoRotationWeekdays : '1,4');
      setAutoRotationQuestionCount(typeof data.autoRotationQuestionCount === 'number' ? data.autoRotationQuestionCount : 5);
      setLastAutoRotationUtcDate(typeof data.lastAutoRotationUtcDate === 'string' ? data.lastAutoRotationUtcDate : null);
    } catch {
      showToast('Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setEditingId(null);
    setFormQuestion('');
    setFormOptions(Array(MITROLABS_QUIZ_MAX_OPTIONS).fill(''));
    setFormCorrectIndex(0);
    setFormOrder(questions.length);
    setFormActive(true);
    setFormPoints(MITROLABS_QUIZ_REWARD_POINTS);
    setFormBranchId('');
  };

  const handleEdit = (q: QuizQuestionRecord) => {
    setEditingId(q.id);
    setFormQuestion(q.questionText);
    const opts = q.options?.length ? [...q.options] : [];
    while (opts.length < MITROLABS_QUIZ_MAX_OPTIONS) opts.push('');
    setFormOptions(opts.slice(0, MITROLABS_QUIZ_MAX_OPTIONS));
    setFormCorrectIndex(Math.min(q.correctIndex, Math.max(0, opts.filter(Boolean).length - 1)));
    setFormOrder(q.order);
    setFormActive(q.isActive);
    setFormPoints(typeof q.points === 'number' ? q.points : 0);
    setFormBranchId(q.branchId ?? '');
  };

  const addOption = () => setFormOptions((o) => (o.length < MITROLABS_QUIZ_MAX_OPTIONS ? [...o, ''] : o));
  const removeOption = (i: number) => setFormOptions((o) => o.filter((_, j) => j !== i));
  const setOption = (i: number, v: string) => setFormOptions((o) => {
    const next = [...o];
    next[i] = v;
    return next;
  });

  const handleSaveCompletionBonus = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setCompletionBonus', completionBonusPoints }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setCompletionBonusPoints(data.completionBonusPoints ?? completionBonusPoints);
      showToast('Completion bonus saved', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBranch = async (name: string) => {
    const trimmed = name.trim() || 'Branch';
    if (branches.some((b) => b.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Branch already exists', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createBranch', name: trimmed, order: branches.length }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setBranches((b) => [...b, data.branch]);
      if (name === newBranchName) setNewBranchName('');
      showToast('Branch added', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    if (!confirm('Delete this branch? Questions in it will be unassigned.')) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteBranch', branchId }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setBranches((b) => b.filter((x) => x.id !== branchId));
      setQuestions((q) => q.map((x) => (x.branchId === branchId ? { ...x, branchId: null, branch: null } : x)));
      showToast('Branch deleted', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const opts = formOptions.map((s) => s.trim()).filter(Boolean).slice(0, MITROLABS_QUIZ_MAX_OPTIONS);
    if (!formQuestion.trim()) {
      showToast('Question text required', 'error');
      return;
    }
    if (opts.length < 2) {
      showToast('At least 2 options required', 'error');
      return;
    }
    const correctIndex = Math.min(formCorrectIndex, opts.length - 1);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = editingId
        ? { action: 'update', id: editingId, questionText: formQuestion.trim(), options: opts, correctIndex, order: formOrder, isActive: formActive, points: formPoints, branchId: formBranchId || null }
        : { action: 'create', questionText: formQuestion.trim(), options: opts, correctIndex, order: formOrder, isActive: formActive, points: formPoints, branchId: formBranchId || null };
      const res = await fetch('/api/admin/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast(editingId ? 'Question updated' : 'Question added', 'success');
      resetForm();
      fetchData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      showToast('Question deleted', 'success');
      if (editingId === id) resetForm();
      fetchData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (q: QuizQuestionRecord) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id: q.id, isActive: !q.isActive }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, isActive: !x.isActive } : x)));
      if (editingId === q.id) setFormActive(!q.isActive);
      showToast(q.isActive ? 'Question deactivated' : 'Question activated', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeedBlockchainPool = async () => {
    if (!confirm('Add 500 URA quiz questions to the pool? Existing branches will be reused. Run only once to avoid duplicates.')) return;
    setPoolSeeding(true);
    try {
      const res = await fetch('/api/admin/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seedBlockchainPool' }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast(`Loaded ${data.seeded ?? 0} questions, ${data.branches ?? 0} branches`, 'success');
      fetchData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setPoolSeeding(false);
    }
  };

  const handleSetRandomDaily = async () => {
    setDailySetting(true);
    try {
      const res = await fetch('/api/admin/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setRandomDaily', count: 5 }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast(`5 random questions set active (${data.activeCount ?? 5} of ${data.totalQuestions ?? 0})`, 'success');
      fetchData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setDailySetting(false);
    }
  };

  const handleSaveAutoRotation = async () => {
    setSavingAuto(true);
    try {
      const res = await fetch('/api/admin/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateAutoRotation',
          autoRotationEnabled,
          autoRotationWeekdays: autoRotationWeekdays.trim() || '1,4',
          autoRotationQuestionCount,
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Automated quiz schedule saved', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setSavingAuto(false);
    }
  };

  const handleRunRotationNow = async () => {
    setRunningRotationNow(true);
    try {
      const res = await fetch('/api/admin/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'runAutoRotationNow', count: autoRotationQuestionCount }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast(`Rotation applied: ${data.activeCount ?? 0} active of ${data.totalQuestions ?? 0}`, 'success');
      fetchData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setRunningRotationNow(false);
    }
  };

  const toggleWeekdayInSchedule = (day: number) => {
    const parts = autoRotationWeekdays
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 6);
    const set = new Set(parts.length ? parts : [1, 4]);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    const next = [...set].sort((a, b) => a - b);
    setAutoRotationWeekdays(next.length ? next.join(',') : '1,4');
  };

  const handleResetAllQuizAttempts = async () => {
    if (!confirm('Delete all quiz attempts? Everyone will be able to take today\'s quiz again and earn 1k PEARLS per correct answer.')) return;
    setResettingAttempts(true);
    try {
      const res = await fetch('/api/admin/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resetAllQuizAttempts' }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast(`Reset complete: ${data.deleted ?? 0} attempt(s) deleted. Everyone can take today's quiz.`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setResettingAttempts(false);
    }
  };

  const byBranch = branches.length > 0
    ? [...branches, { id: '', name: '(No branch)', order: 999 }]
    : [{ id: '', name: '(No branch)', order: 0 }];

  return (
    <div className="min-h-screen bg-ura-panel text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin" className="text-[#f3ba2f] hover:underline mb-4 inline-block">← Back to Admin</Link>
        <h1 className="text-3xl font-bold text-[#f3ba2f] mb-2">URA Quiz</h1>
        <p className="text-gray-400 mb-6">
          Uganda Revenue Authority · Fiscal Fun quiz shown on Earn. Branches group questions. Set points per question, a
          completion bonus, and optional automated question sets (UTC schedule).
        </p>

        {/* Time until next quiz goes live (UTC midnight) */}
        <div className="bg-ura-panel-2 border border-ura-border/75 rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="text-gray-400">Time until new quiz goes live (19:36 UTC / 7:36 PM UTC):</span>
          <span className="text-[#f3ba2f] font-mono font-semibold tabular-nums">
            {timeUntilNextQuiz !== null ? formatTimeRemaining(timeUntilNextQuiz) : '—'}
          </span>
        </div>

        {/* Automated rotation (Mon / Thu UTC default) */}
        <div className="bg-ura-panel-2 p-6 rounded-xl mb-6 border border-emerald-500/25">
          <h2 className="text-lg font-semibold mb-2 text-emerald-200">Automated question sets (UTC)</h2>
          <p className="text-sm text-gray-400 mb-3">
            When enabled, the first public quiz load on each chosen weekday (UTC) picks a fresh random set from your pool
            and marks only those questions active — same as &quot;Set N random&quot;. Default: <strong>Monday &amp; Thursday</strong>.
          </p>
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRotationEnabled}
              onChange={(e) => setAutoRotationEnabled(e.target.checked)}
              className="h-5 w-5 rounded"
            />
            <span className="text-white font-medium">Turn on automated rotations</span>
          </label>
          <p className="text-xs text-gray-500 mb-2">Quick pick weekdays (UTC):</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const).map((label, day) => {
              const active = autoRotationWeekdays
                .split(',')
                .map((s) => parseInt(s.trim(), 10))
                .filter((n) => !Number.isNaN(n))
                .includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleWeekdayInSchedule(day)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                    active ? 'bg-emerald-600/40 border-emerald-400 text-white' : 'bg-ura-panel border-ura-border/75 text-gray-400'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 items-end mb-3">
            <label className="text-sm text-gray-400">
              Weekdays as numbers (0=Sun … 6=Sat)
              <input
                type="text"
                value={autoRotationWeekdays}
                onChange={(e) => setAutoRotationWeekdays(e.target.value)}
                className="block mt-1 w-40 bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
                placeholder="1,4"
              />
            </label>
            <label className="text-sm text-gray-400">
              Questions per rotation
              <input
                type="number"
                min={1}
                max={20}
                value={autoRotationQuestionCount}
                onChange={(e) => setAutoRotationQuestionCount(Math.min(20, Math.max(1, Number(e.target.value) || 5)))}
                className="block mt-1 w-24 bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
              />
            </label>
          </div>
          {lastAutoRotationUtcDate ? (
            <p className="text-xs text-gray-500 mb-3">Last automated rotation (UTC date): {lastAutoRotationUtcDate}</p>
          ) : (
            <p className="text-xs text-gray-500 mb-3">No automated rotation recorded yet.</p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSaveAutoRotation}
              disabled={savingAuto || submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold text-white disabled:opacity-50"
            >
              {savingAuto ? 'Saving…' : 'Save schedule'}
            </button>
            <button
              type="button"
              onClick={handleRunRotationNow}
              disabled={runningRotationNow || submitting || questions.length === 0}
              className="px-4 py-2 bg-[#3d4046] hover:bg-[#4d5056] rounded-lg font-medium disabled:opacity-50"
            >
              {runningRotationNow ? 'Running…' : 'Run rotation now (manual test)'}
            </button>
          </div>
        </div>

        {/* Blockchain question pool */}
        <div className="bg-ura-panel-2 p-6 rounded-xl mb-6">
          <h2 className="text-lg font-semibold mb-2">Question pool (seed + daily set)</h2>
          <p className="text-sm text-gray-400 mb-3">
            Load a 500-question URA pool (inactive), then use random sets or automation.
            Branches: General, URA & compliance, Tax basics, Technical, NFTs, Security.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleSeedBlockchainPool} disabled={poolSeeding || submitting} className="px-4 py-2 bg-ura-gold text-black font-semibold rounded-lg disabled:opacity-50">
              {poolSeeding ? 'Loading…' : 'Load 500 URA quiz questions'}
            </button>
            <button type="button" onClick={handleSetRandomDaily} disabled={dailySetting || submitting || questions.length === 0} className="px-4 py-2 bg-[#3d4046] hover:bg-[#4d5056] rounded-lg font-medium disabled:opacity-50">
              {dailySetting ? 'Setting…' : 'Set 5 random for today'}
            </button>
            <button type="button" onClick={handleResetAllQuizAttempts} disabled={resettingAttempts || submitting} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg font-medium disabled:opacity-50 text-white">
              {resettingAttempts ? 'Resetting…' : 'Reset all quiz attempts'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Run &quot;Load&quot; once. Use &quot;Set 5 random&quot; daily or anytime; toggle Active on individual questions to override. &quot;Reset all quiz attempts&quot; lets everyone take today&apos;s quiz again (1k PEARLS per correct answer).</p>
        </div>

        {/* Completion bonus */}
        <div className="bg-ura-panel-2 p-6 rounded-xl mb-6">
          <h2 className="text-lg font-semibold mb-2">Completion bonus (all correct)</h2>
          <p className="text-sm text-gray-400 mb-3">Extra PEARLS awarded when the user gets every question right.</p>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={0}
              value={completionBonusPoints}
              onChange={(e) => setCompletionBonusPoints(Number(e.target.value) || 0)}
              className="w-32 bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
            />
            <span className="text-gray-400">PEARLS</span>
            <button type="button" onClick={handleSaveCompletionBonus} disabled={submitting} className="px-4 py-2 bg-ura-gold text-black font-semibold rounded-lg disabled:opacity-50">Save</button>
          </div>
        </div>

        {/* Branches */}
        <div className="bg-ura-panel-2 p-6 rounded-xl mb-6">
          <h2 className="text-lg font-semibold mb-2">Branches</h2>
          <p className="text-sm text-gray-400 mb-3">Group questions into branches. Select a preset or type a custom name.</p>
          <div className="mb-3">
            <span className="text-sm text-gray-400 block mb-2">Add from presets:</span>
            <div className="flex flex-wrap gap-2">
              {PRESET_BRANCHES.map((name) => {
                const exists = branches.some((b) => b.name.toLowerCase() === name.toLowerCase());
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => !exists && handleCreateBranch(name)}
                    disabled={submitting || exists}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${exists ? 'bg-[#3d4046] text-gray-500 cursor-default' : 'bg-[#3d4046] hover:bg-[#4d5056] text-white'}`}
                  >
                    {name}{exists ? ' ✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="Or type custom branch name"
              className="flex-1 max-w-xs bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
            />
            <button type="button" onClick={() => handleCreateBranch(newBranchName)} disabled={submitting} className="px-4 py-2 bg-[#3d4046] hover:bg-[#4d5056] rounded-lg font-medium disabled:opacity-50">Add custom</button>
          </div>
          {branches.length > 0 && (
            <ul className="space-y-2">
              {branches.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-2 border-b border-ura-border/75 last:border-0">
                  <span className="font-medium">{b.name}</span>
                  <button type="button" onClick={() => handleDeleteBranch(b.id)} disabled={submitting} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add/Edit question */}
        <form onSubmit={handleSubmit} className="bg-ura-panel-2 p-6 rounded-xl mb-8">
          <h2 className="text-lg font-semibold mb-4">{editingId ? 'Edit question' : 'Add question'}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Question</label>
              <input
                type="text"
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                placeholder="Question text"
                className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Options (2–4, one correct)</label>
              {formOptions.map((opt, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input type="radio" name="correct" checked={formCorrectIndex === i} onChange={() => setFormCorrectIndex(i)} disabled={!opt.trim()} className="mt-2" />
                  <input type="text" value={opt} onChange={(e) => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`} className="flex-1 bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white" />
                  {formOptions.length > 2 && <button type="button" onClick={() => removeOption(i)} className="text-red-400 hover:text-red-300 px-2">×</button>}
                </div>
              ))}
              {formOptions.length < MITROLABS_QUIZ_MAX_OPTIONS && <button type="button" onClick={addOption} className="text-sm text-[#f3ba2f] hover:underline">+ Add option (max {MITROLABS_QUIZ_MAX_OPTIONS})</button>}
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <label className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Points (PEARLS) for correct:</span>
                <input type="number" min={0} value={formPoints} onChange={(e) => setFormPoints(Number(e.target.value) || 0)} className="w-24 bg-ura-panel border border-ura-border/75 rounded px-2 py-1 text-white" />
              </label>
              <label className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Branch:</span>
                <select value={formBranchId} onChange={(e) => setFormBranchId(e.target.value)} className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white">
                  {byBranch.map((b) => (
                    <option key={b.id || 'none'} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                <input type="number" value={formOrder} onChange={(e) => setFormOrder(Number(e.target.value))} min={0} className="w-20 bg-ura-panel border border-ura-border/75 rounded px-2 py-1 text-white" />
                <span className="text-sm text-gray-400">Order</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} />
                <span className="text-sm text-gray-400">Active</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-ura-gold text-black font-semibold rounded-lg disabled:opacity-50">{submitting ? 'Saving…' : editingId ? 'Update' : 'Add'}</button>
            {editingId && <button type="button" onClick={resetForm} className="px-4 py-2 bg-[#3d4046] rounded-lg">Cancel</button>}
          </div>
        </form>

        {/* Questions list by branch */}
        <div className="bg-ura-panel-2 rounded-xl overflow-hidden">
          <h2 className="p-4 text-lg font-semibold border-b border-ura-border/75">Questions ({questions.length})</h2>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading…</div>
          ) : questions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No questions yet. Add one above.</div>
          ) : (
            <div className="divide-y divide-[#3d4046]">
              {byBranch.filter((b) => b.id !== '' || questions.some((q) => !q.branchId)).map((branch) => {
                const branchQuestions = questions.filter((q) => (branch.id ? q.branchId === branch.id : !q.branchId));
                if (branchQuestions.length === 0) return null;
                return (
                  <div key={branch.id || 'none'}>
                    <div className="px-4 py-2 bg-ura-panel text-[#f3ba2f] font-medium">{branch.name}</div>
                    <ul>
                      {branchQuestions.map((q) => (
                        <li key={q.id} className="p-4 flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-white">{q.questionText}</p>
                            <p className="text-sm text-gray-400 mt-1">
                              {(q.points ?? 0)} PEARLS · {(q.options?.length ?? 0)} options · Correct #{q.correctIndex + 1} · Order {q.order} · {q.isActive ? 'Active' : 'Inactive'}
                            </p>
                          </div>
                          <div className="flex gap-2 items-center">
                            <button type="button" onClick={() => handleToggleActive(q)} disabled={submitting} className={`px-3 py-1 rounded text-sm ${q.isActive ? 'bg-emerald-600/80 hover:bg-emerald-600' : 'bg-[#3d4046] hover:bg-[#4d5056]'} disabled:opacity-50`} title={q.isActive ? 'Deactivate' : 'Activate'}>
                              {q.isActive ? 'On' : 'Off'}
                            </button>
                            <button type="button" onClick={() => handleEdit(q)} className="px-3 py-1 bg-[#3d4046] hover:bg-[#4d5056] rounded text-sm">Edit</button>
                            <button type="button" onClick={() => handleDelete(q.id)} disabled={submitting} className="px-3 py-1 bg-red-600/80 hover:bg-red-600 rounded text-sm disabled:opacity-50">Delete</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

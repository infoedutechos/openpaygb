// app/admin/tasks/page.tsx

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { TaskType, type UraTask } from '@/lib/ura-game-types';
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import IceCube from '@/icons/IceCube';
import { ACTIVITY_TAB_CATEGORIES } from '@/utils/consts';
import { formatNumber } from '@/utils/ui';
import { imageMap, imageDisplayNames } from '@/images';
import { useToast } from '@/contexts/ToastContext';

interface ExtendedTask extends UraTask {
    taskData: {
        link?: string;
        chatId?: string;
        friendsNumber?: number;
        correctAnswer?: string;
        validCodes?: string[];
    };
}

const taskSchema = z.object({
    title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or less"),
    description: z.string().min(1, "Description is required").max(200, "Description must be 200 characters or less"),
    points: z.union([z.number().min(0, "Points must be 0 or more"), z.null()]),
    type: z.nativeEnum(TaskType),
    category: z.string().min(1, "Category is required"),
    image: z.string().min(1, "Image is required"),
    callToAction: z.string().min(1, "Call to action is required"),
    isActive: z.boolean(),
    isHidden: z.boolean(),
    taskData: z.object({
        link: z.union([z.string().url("Link must be a valid URL"), z.literal("")]).optional(),
        chatId: z.string().optional(),
        friendsNumber: z.union([
            z.number().int("Number of friends must be an integer").positive("Number of friends must be positive"),
            z.null(),
            z.undefined(),
        ]),
        correctAnswer: z.string().optional(),
        validCodes: z.array(z.string()).optional(),
    }),
}).refine((data) => {
    if (data.type === TaskType.VISIT) {
        return !!data.taskData.link;
    }
    if (data.type === TaskType.TELEGRAM) {
        return !!data.taskData.link && !!data.taskData.chatId;
    }
    if (data.type === TaskType.REFERRAL) {
        const n = data.taskData.friendsNumber;
        return n != null && typeof n === 'number' && Number.isFinite(n) && n >= 1;
    }
    if (data.type === TaskType.REDEEM_CODE) {
        const codes = data.taskData.validCodes;
        return Array.isArray(codes) && codes.length > 0 && codes.every((c) => typeof c === 'string' && c.trim().length > 0);
    }
    return true;
}, {
    message: "For referral tasks, enter a number of friends. For redeem-code tasks, enter at least one valid code.",
    path: ["taskData"],
});

type TaskFormData = z.infer<typeof taskSchema>;

function getFirstErrorMessage(err: Record<string, unknown> | undefined): string | null {
    if (!err || typeof err !== 'object') return null;
    if (typeof (err as { message?: string }).message === 'string') return (err as { message: string }).message;
    for (const v of Object.values(err)) {
        const msg = Array.isArray(v) ? null : getFirstErrorMessage(v as Record<string, unknown>);
        if (msg) return msg;
    }
    return null;
}

const DEFAULT_FORM_VALUES: Partial<TaskFormData> = {
    title: '',
    description: '',
    points: null,
    type: TaskType.VISIT,
    category: '',
    image: '',
    callToAction: '',
    isActive: true,
    isHidden: false,
    taskData: {
        link: '',
        chatId: '',
        friendsNumber: null,
        correctAnswer: '',
        validCodes: []
    },
};

// Preset correct answers for Video / Special tasks — choose which answer applies to which video
const VIDEO_ANSWER_PRESETS = [
    { id: 'none', label: 'No answer check (reward when wait time ends)', answer: '' },
    {
        id: 'verification',
        label: 'Verification & payout compliance',
        answer: 'The system will run verification now, process payout and will do one more verification follow up to ensure compliance.',
    },
    { id: 'custom', label: 'Custom (type your own below)', answer: '' },
] as const;

export default function AdminTasks() {
    const showToast = useToast();
    const [tasks, setTasks] = useState<ExtendedTask[]>([]);
    const [editingTask, setEditingTask] = useState<ExtendedTask | null>(null);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [randomDeleteCount, setRandomDeleteCount] = useState(1);
    const [isDeleting, setIsDeleting] = useState(false);
    const [togglingHiddenId, setTogglingHiddenId] = useState<string | null>(null);
    const [videoAnswerPresetId, setVideoAnswerPresetId] = useState<string>('none');

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<TaskFormData>({
        resolver: zodResolver(taskSchema),
        defaultValues: DEFAULT_FORM_VALUES,
    });

    const taskType = watch("type");
    const imageValue = watch("image");

    const tasksBySector = useMemo(() => {
        const map = new Map<string, ExtendedTask[]>();
        for (const task of tasks) {
            const sector = task.category?.trim() || 'Other';
            if (!map.has(sector)) map.set(sector, []);
            map.get(sector)!.push(task);
        }
        return map;
    }, [tasks]);

    const sectorOrder = useMemo(() => {
        const order: string[] = [...(ACTIVITY_TAB_CATEGORIES as readonly string[])];
        const rest = Array.from(tasksBySector.keys()).filter((c) => !order.includes(c));
        rest.sort((a, b) => a.localeCompare(b));
        return [...order, ...rest];
    }, [tasksBySector]);

    const fetchTasks = useCallback(async () => {
        setIsLoadingTasks(true);
        try {
            const response = await fetch('/api/admin/tasks', { credentials: 'include' });
            const data = await response.json();
            if (!response.ok) {
                setTasks([]);
                if (response.status === 403) {
                    if ((data as { code?: string }).code === 'ITEM_REQUIRED') {
                        showToast('Section password required. Go back to Admin and open Manage Tasks again.', 'error');
                        return;
                    }
                    showToast('Session expired. Please log in again.', 'error');
                    window.location.href = '/admin/login';
                }
                return;
            }
            const taskList = Array.isArray(data) ? data : [];
            setTasks(taskList);

            const uniqueCategories = Array.from(new Set(taskList.map((task: ExtendedTask) => task.category))) as string[];
            setCategories(uniqueCategories.filter((c) => !(ACTIVITY_TAB_CATEGORIES as readonly string[]).includes(c)));
        } catch (error) {
            console.error('Error fetching tasks:', error);
            setTasks([]);
        } finally {
            setIsLoadingTasks(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchTasks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchTasks]);

    const onSubmit = async (data: TaskFormData) => {
        try {
            if (editingTask) {
                await fetch(`/api/admin/tasks/${editingTask.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                showToast('Task updated successfully!', 'success');
            } else {
                await fetch('/api/admin/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                showToast('Task created successfully!', 'success');
            }
            setEditingTask(null);
            reset(DEFAULT_FORM_VALUES);
            setVideoAnswerPresetId('none');
            fetchTasks();
        } catch (error) {
            console.error('Error saving task:', error);
            if (error instanceof Error) {
                showToast(`Failed to save task: ${error.message}`, 'error');
            } else {
                showToast('Failed to save task. Please try again.', 'error');
            }
        }
    };

    const handleCategoryClick = (category: string) => {
        setValue("category", category);
    };

    const handleImageClick = (imageName: string) => {
        setValue("image", imageName);
    };

    const handleEdit = (task: ExtendedTask) => {
        setEditingTask(task);
        reset(task);
        const answer = (task.taskData as { correctAnswer?: string })?.correctAnswer ?? '';
        if (answer === '') setVideoAnswerPresetId('none');
        else if (answer === VIDEO_ANSWER_PRESETS.find((p) => p.id === 'verification')?.answer) setVideoAnswerPresetId('verification');
        else setVideoAnswerPresetId('custom');
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const handleCancelEdit = () => {
        setEditingTask(null);
        reset(DEFAULT_FORM_VALUES);
        setVideoAnswerPresetId('none');
    };

    const toggleSelection = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        setSelectedIds(new Set(tasks.map((t) => t.id)));
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) {
            showToast('Select at least one task to delete.', 'error');
            return;
        }
        if (!confirm(`Delete ${selectedIds.size} selected task(s)?`)) return;
        setIsDeleting(true);
        try {
            const res = await fetch('/api/admin/tasks', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: Array.from(selectedIds) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Delete failed');
            showToast(`Deleted ${data.deleted} task(s).`, 'success');
            setSelectedIds(new Set());
            fetchTasks();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to delete tasks.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteRandom = async () => {
        const count = Math.max(1, Math.min(randomDeleteCount, tasks.length));
        if (tasks.length === 0) {
            showToast('No tasks to delete.', 'error');
            return;
        }
        if (!confirm(`Delete ${count} random task(s)?`)) return;
        setIsDeleting(true);
        try {
            const res = await fetch('/api/admin/tasks', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ randomCount: count }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Delete failed');
            showToast(`Deleted ${data.deleted} random task(s).`, 'success');
            fetchTasks();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to delete random tasks.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleToggleHidden = async (task: ExtendedTask, hidden: boolean) => {
        setTogglingHiddenId(task.id);
        try {
            const res = await fetch(`/api/admin/tasks/${task.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...task, isHidden: hidden }),
                credentials: 'include',
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Update failed');
            }
            showToast(hidden ? 'Task hidden from public.' : 'Task visible to public.', 'success');
            fetchTasks();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to update visibility.', 'error');
        } finally {
            setTogglingHiddenId(null);
        }
    };

    const handleDeleteOne = async (task: ExtendedTask) => {
        if (!confirm(`Delete task "${task.title}"?`)) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/admin/tasks/${task.id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Delete failed');
            }
            showToast('Task deleted.', 'success');
            setSelectedIds((prev) => {
                const next = new Set(prev);
                next.delete(task.id);
                return next;
            });
            fetchTasks();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to delete task.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="bg-ura-panel text-white min-h-screen p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-bold mb-8 text-[#f3ba2f]">Manage Tasks</h1>

                <form
                    onSubmit={handleSubmit(onSubmit, (err) => {
                        const msg = getFirstErrorMessage(err as Record<string, unknown>);
                        showToast(msg || 'Please fill all required fields and fix any errors below.', 'error');
                    })}
                    className="mb-12 bg-ura-panel-2 rounded-lg p-6"
                >
                    <h2 className="text-2xl font-semibold mb-6">{editingTask ? 'Edit Task' : 'Add New Task'}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <input
                                {...register("title")}
                                placeholder="Title"
                                className="w-full bg-[#3a3d42] p-3 rounded-lg"
                                maxLength={100}
                                autoComplete="off"
                            />
                            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                        </div>

                        <div>
                            <input
                                {...register("description")}
                                placeholder="Description"
                                className="w-full bg-[#3a3d42] p-3 rounded-lg"
                                maxLength={200}
                                autoComplete="off"
                            />
                            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
                        </div>

                        <div>
                            <input
                                type="number"
                                {...register("points", {
                                    setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? null : Number(v)),
                                })}
                                placeholder="Points"
                                className="w-full bg-[#3a3d42] p-3 rounded-lg"
                                autoComplete="off"
                            />
                            {errors.points && <p className="text-red-500 text-sm mt-1">{errors.points.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Type</label>
                            <select
                                {...register("type")}
                                className="w-full bg-[#3a3d42] p-3 rounded-lg"
                            >
                                {Object.values(TaskType).map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                            {taskType === TaskType.VISIT && (
                                <p className="text-xs text-amber-200/80 mt-1">Video/special task — set the correct answer in the yellow section below.</p>
                            )}
                            {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Category (Earn tab tabs: Special, Leagues, Refs)</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {ACTIVITY_TAB_CATEGORIES.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => { setValue("category", cat, { shouldValidate: true }); }}
                                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${watch("category") === cat ? 'bg-ura-gold/20 ring-2 ring-[#f3ba2f] text-white' : 'bg-[#3a3d42] hover:bg-[#4a4d52]'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                            <input
                                {...register("category")}
                                placeholder="Or type category name"
                                className="w-full bg-[#3a3d42] p-3 rounded-lg mb-2"
                                autoComplete="off"
                            />
                            {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>}
                            {categories.length > 0 && (
                                <>
                                    <p className="text-xs text-gray-500 mb-1 mt-1">Or pick from existing:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map((category) => (
                                            <button
                                                key={category}
                                                type="button"
                                                onClick={() => handleCategoryClick(category)}
                                                className="px-2 py-1 bg-[#3a3d42] text-sm rounded hover:bg-[#4a4d52] transition-colors"
                                            >
                                                {category}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <div>
                            <input
                                type="hidden"
                                {...register("image")}
                            />
                            <input
                                value={imageDisplayNames[imageValue] || imageValue || ''}
                                placeholder="Image"
                                className="w-full bg-[#3a3d42] p-3 rounded-lg mb-2"
                                autoComplete="off"
                                readOnly
                            />
                            {errors.image && <p className="text-red-500 text-sm mt-1">{errors.image.message}</p>}
                            <div className="flex flex-wrap gap-2 mt-2">
                                {Object.entries(imageMap).map(([name, src]) => (
                                    <button
                                        key={name}
                                        type="button"
                                        onClick={() => handleImageClick(name)}
                                        className={`p-1 rounded transition-colors ${imageValue === name
                                            ? 'bg-ura-gold hover:bg-[#f4c141]'
                                            : 'bg-[#3a3d42] hover:bg-[#4a4d52]'
                                            }`}
                                        title={imageDisplayNames[name] || name}
                                    >
                                        <Image
                                            src={src}
                                            alt={imageDisplayNames[name] || name}
                                            width={32}
                                            height={32}
                                            className="w-8 h-8 object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <input
                                {...register("callToAction")}
                                placeholder="Call To Action"
                                className="w-full bg-[#3a3d42] p-3 rounded-lg"
                                autoComplete="off"
                            />
                            {errors.callToAction && <p className="text-red-500 text-sm mt-1">{errors.callToAction.message}</p>}
                        </div>

                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                {...register("isActive")}
                                className="form-checkbox h-5 w-5 text-[#f3ba2f]"
                                autoComplete="off"
                            />
                            <span>Is Active</span>
                        </label>

                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                {...register("isHidden")}
                                className="form-checkbox h-5 w-5 text-[#f3ba2f]"
                                autoComplete="off"
                            />
                            <span>Hidden from public</span>
                        </label>
                        <p className="text-xs text-gray-500 col-span-2">When hidden, the task does not appear in the Earn tab for users. You can show it again anytime.</p>

                        {(taskType === TaskType.VISIT || taskType === TaskType.TELEGRAM) && (
                            <div>
                                <input
                                    {...register("taskData.link")}
                                    placeholder="Link"
                                    className="w-full bg-[#3a3d42] p-3 rounded-lg"
                                    autoComplete="off"
                                />
                                {errors.taskData?.link && <p className="text-red-500 text-sm mt-1">{errors.taskData.link.message}</p>}
                            </div>
                        )}

                        {taskType === TaskType.VISIT && (
                            <div className="md:col-span-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                                <h3 className="text-base font-semibold text-amber-200 mb-1">Set the answer for this video</h3>
                                <p className="text-sm text-amber-200/90 mb-2">Video / Special tasks: choose which answer users must type after watching to get the reward. If you choose “No answer check”, they get the reward when the wait time ends.</p>
                                <label className="block text-sm font-medium text-[#f3ba2f] mb-1">Correct answer for this video</label>
                                <select
                                    value={videoAnswerPresetId}
                                    onChange={(e) => {
                                        const id = e.target.value as 'none' | 'verification' | 'custom';
                                        setVideoAnswerPresetId(id);
                                        const preset = VIDEO_ANSWER_PRESETS.find((p) => p.id === id);
                                        setValue("taskData.correctAnswer", preset ? preset.answer : '');
                                    }}
                                    className="w-full bg-[#3a3d42] p-3 rounded-lg border border-amber-500/30 text-white mb-3"
                                >
                                    {VIDEO_ANSWER_PRESETS.map((p) => (
                                        <option key={p.id} value={p.id} className="bg-ura-panel">
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                                {videoAnswerPresetId === 'custom' && (
                                    <input
                                        {...register("taskData.correctAnswer")}
                                        placeholder="Type the exact answer users must enter"
                                        className="w-full bg-[#3a3d42] p-3 rounded-lg border border-amber-500/30 text-white"
                                        autoComplete="off"
                                    />
                                )}
                                {videoAnswerPresetId === 'verification' && (
                                    <>
                                        <p className="text-sm text-amber-200/80 mb-2">Enter the exact phrase users must type to get the reward (you can edit the default below):</p>
                                        <input
                                            {...register("taskData.correctAnswer")}
                                            placeholder="e.g. The system will run verification now, process payout..."
                                            className="w-full bg-[#3a3d42] p-3 rounded-lg border border-amber-500/30 text-white"
                                            autoComplete="off"
                                        />
                                    </>
                                )}
                            </div>
                        )}

                        {taskType === TaskType.TELEGRAM && (
                            <div>
                                <input
                                    {...register("taskData.chatId")}
                                    placeholder="Chat ID (e.g., your_channel)"
                                    className="w-full bg-[#3a3d42] p-3 rounded-lg"
                                    autoComplete="off"
                                />
                                {errors.taskData?.chatId && <p className="text-red-500 text-sm mt-1">{errors.taskData.chatId.message}</p>}
                            </div>
                        )}

                        {taskType === TaskType.REFERRAL && (
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Number of friends (required)</label>
                                <input
                                    type="number"
                                    min={1}
                                    {...register("taskData.friendsNumber", {
                                        setValueAs: (v) => {
                                            const n = Number(v);
                                            if (v === '' || Number.isNaN(n)) return undefined;
                                            return Math.floor(n);
                                        },
                                    })}
                                    placeholder="e.g. 1, 3, 5"
                                    className="w-full bg-[#3a3d42] p-3 rounded-lg"
                                    autoComplete="off"
                                />
                                {errors.taskData?.friendsNumber && <p className="text-red-500 text-sm mt-1">{errors.taskData.friendsNumber.message}</p>}
                                {errors.taskData?.message && !errors.taskData?.friendsNumber && <p className="text-red-500 text-sm mt-1">{errors.taskData.message}</p>}
                            </div>
                        )}

                        {taskType === TaskType.REDEEM_CODE && (
                            <>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Zoom / meeting link (optional)</label>
                                    <input
                                        {...register("taskData.link")}
                                        placeholder="https://zoom.us/j/..."
                                        className="w-full bg-[#3a3d42] p-3 rounded-lg"
                                        autoComplete="off"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Shown as &quot;Attend&quot; button so users can open the call before redeeming the code.</p>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Valid codes (one per line or comma-separated)</label>
                                    <textarea
                                        value={Array.isArray(watch("taskData.validCodes")) ? (watch("taskData.validCodes") as string[]).join('\n') : ''}
                                        onChange={(e) => {
                                            const parsed = e.target.value.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
                                            setValue("taskData.validCodes", parsed);
                                        }}
                                        placeholder="ZOOM2025&#10;EVENT123"
                                        className="w-full bg-[#3a3d42] p-3 rounded-lg min-h-[80px]"
                                        autoComplete="off"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Users must enter one of these codes (case-insensitive) to complete the task.</p>
                                    {errors.taskData?.message && <p className="text-red-500 text-sm mt-1">{errors.taskData.message}</p>}
                                </div>
                            </>
                        )}

                        {errors.taskData && !errors.taskData.link && !errors.taskData.chatId && !errors.taskData.friendsNumber && !errors.taskData?.validCodes && (
                            <p className="text-red-500 text-sm col-span-2 mt-1">{errors.taskData.message}</p>
                        )}
                    </div>
                    <div className="mt-6 flex justify-end space-x-4">
                        {editingTask && (
                            <button type="button" onClick={handleCancelEdit} className="px-6 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors">
                                Cancel
                            </button>
                        )}
                        <button type="submit" className="px-6 py-2 bg-ura-gold text-black rounded-lg hover:bg-[#f4c141] transition-colors">
                            {editingTask ? 'Update Task' : 'Add Task'}
                        </button>
                    </div>
                </form>

                <div className="bg-ura-panel-2 rounded-lg p-6">
                    {tasks.some((t) => t.type === TaskType.VISIT && (t.taskData as { correctAnswer?: string })?.correctAnswer) && (
                        <div className="mb-6 p-4 rounded-xl bg-ura-panel border border-ura-border/75">
                            <h3 className="text-lg font-semibold text-[#f3ba2f] mb-3">Video task answers (quick reference)</h3>
                            <p className="text-sm text-gray-400 mb-3">Correct answers set for Special / video tasks. Users must enter these after watching to get the reward.</p>
                            <div className="space-y-2">
                                {tasks
                                    .filter((t) => t.type === TaskType.VISIT && (t.taskData as { correctAnswer?: string })?.correctAnswer)
                                    .map((t) => (
                                        <div key={t.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                                            <span className="text-white font-medium truncate max-w-[200px] md:max-w-[320px]" title={t.title}>{t.title}</span>
                                            <span className="text-gray-500">→</span>
                                            <span className="text-emerald-400 font-medium">{(t.taskData as { correctAnswer: string }).correctAnswer}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleEdit(t)}
                                                className="text-[#f3ba2f] hover:underline text-xs"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                    <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                        <h2 className="text-2xl font-semibold">Existing Tasks ({tasks.length})</h2>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={fetchTasks}
                                className="p-2 bg-[#3a3d42] rounded-full hover:bg-[#4a4d52] transition-colors"
                                title="Refresh"
                            >
                                <svg
                                    className="w-6 h-6 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                            <span className="text-gray-400 text-sm">Delete:</span>
                            <button
                                type="button"
                                onClick={selectAll}
                                className="px-3 py-1.5 bg-[#3a3d42] rounded-lg hover:bg-[#4a4d52] text-sm transition-colors"
                            >
                                Select all
                            </button>
                            {selectedIds.size > 0 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={clearSelection}
                                        className="px-3 py-1.5 bg-[#3a3d42] rounded-lg hover:bg-[#4a4d52] text-sm transition-colors"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDeleteSelected}
                                        disabled={isDeleting}
                                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-sm transition-colors"
                                    >
                                        Delete selected ({selectedIds.size})
                                    </button>
                                </>
                            )}
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min={1}
                                    max={tasks.length || 1}
                                    value={randomDeleteCount}
                                    onChange={(e) => setRandomDeleteCount(Number(e.target.value) || 1)}
                                    className="w-16 bg-[#3a3d42] p-1.5 rounded text-center text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={handleDeleteRandom}
                                    disabled={isDeleting || tasks.length === 0}
                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-sm transition-colors"
                                >
                                    Delete random
                                </button>
                            </div>
                        </div>
                    </div>
                    {isLoadingTasks ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, index) => (
                                <div key={index} className="bg-[#3a3d42] rounded-lg p-4 animate-pulse">
                                    <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
                                    <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                                    <div className="h-4 bg-gray-700 rounded w-1/4"></div>
                                </div>
                            ))}
                        </div>
                    ) : tasks.length > 0 ? (
                        <div className="space-y-10">
                            {sectorOrder.map((sector) => {
                                const sectorTasks = tasksBySector.get(sector) ?? [];
                                if (sectorTasks.length === 0) return null;
                                return (
                                    <div key={sector}>
                                        <h3 className="text-lg font-semibold text-[#f3ba2f] mb-4 pb-2 border-b border-ura-border/75">
                                            {sector} ({sectorTasks.length})
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {sectorTasks.map((task) => (
                                                <div key={task.id} className="bg-[#3a3d42] rounded-lg p-4 flex flex-col h-full">
                                                    <div className="flex items-start gap-2 mb-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(task.id)}
                                                            onChange={() => toggleSelection(task.id)}
                                                            className="mt-1 h-4 w-4 rounded text-[#f3ba2f] focus:ring-[#f3ba2f]"
                                                        />
                                                        <div className="flex-grow min-w-0">
                                                            <h3 className="text-xl font-semibold break-words">{task.title}</h3>
                                                        </div>
                                                    </div>
                                                    <div className="flex-grow">
                                                        <p className="text-gray-400 mb-3">{task.description}</p>
                                                        <div className="flex items-center mb-2">
                                                            <IceCube className="w-4 h-4 mr-2" />
                                                            <span className="text-[#f3ba2f] font-medium">{formatNumber(task.points)}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-400">Type: {task.type}</p>
                                                        <p className="text-sm text-gray-400">Category: {task.category}</p>
                                                        <p className="text-sm text-gray-400">Active: {task.isActive ? 'Yes' : 'No'}</p>
                                                        {(task as { isHidden?: boolean }).isHidden && (
                                                            <p className="text-sm text-amber-400 font-medium">Hidden from public</p>
                                                        )}

                                                        {task.type === TaskType.VISIT && task.taskData?.link && (
                                                            <p className="text-sm text-gray-400">Link: {task.taskData.link}</p>
                                                        )}
                                                        {task.type === TaskType.VISIT && (task.taskData as { correctAnswer?: string })?.correctAnswer && (
                                                            <p className="text-sm mt-1">
                                                                <span className="text-gray-400">Correct answer: </span>
                                                                <span className="text-emerald-400 font-medium">{(task.taskData as { correctAnswer: string }).correctAnswer}</span>
                                                            </p>
                                                        )}
                                                        {task.type === TaskType.TELEGRAM && (
                                                            <>
                                                                {task.taskData?.link && <p className="text-sm text-gray-400">Link: {task.taskData.link}</p>}
                                                                {task.taskData?.chatId && <p className="text-sm text-gray-400">Chat ID: {task.taskData.chatId}</p>}
                                                            </>
                                                        )}
                                                        {task.type === TaskType.REFERRAL && task.taskData?.friendsNumber && (
                                                            <p className="text-sm text-gray-400">Friends Required: {task.taskData.friendsNumber}</p>
                                                        )}
                                                        {task.type === TaskType.REDEEM_CODE && (task.taskData as { validCodes?: string[] })?.validCodes && (
                                                            <p className="text-sm text-gray-400">Valid codes: {(task.taskData as { validCodes: string[] }).validCodes.length} code(s)</p>
                                                        )}
                                                        {task.type === TaskType.REDEEM_CODE && (task.taskData as { link?: string })?.link && (
                                                            <p className="text-sm text-gray-400 truncate" title={(task.taskData as { link: string }).link}>Zoom link: {(task.taskData as { link: string }).link}</p>
                                                        )}
                                                    </div>
                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEdit(task)}
                                                            className="flex-1 min-w-0 px-4 py-2 bg-ura-gold text-black rounded-lg hover:bg-[#f4c141] transition-colors"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleHidden(task, !(task as { isHidden?: boolean }).isHidden)}
                                                            disabled={togglingHiddenId === task.id}
                                                            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 rounded-lg transition-colors"
                                                        >
                                                            {togglingHiddenId === task.id ? '...' : (task as { isHidden?: boolean }).isHidden ? 'Show' : 'Hide'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteOne(task)}
                                                            disabled={isDeleting}
                                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 bg-[#3a3d42] rounded-lg p-8">
                            No tasks available
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
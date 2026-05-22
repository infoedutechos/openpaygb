'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '@/utils/game-mechanics';
import { triggerHapticFeedback } from '@/utils/ui';
import { RECEIPT_RUSH_CATEGORIES, RECEIPT_RUSH_REWARD_BLUE } from '@/utils/receipt-rush';

type Props = {
  onClose: () => void;
};

function isBenignPlayFailure(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const o = err as { name?: string; message?: string };
  const name = String(o.name ?? "");
  const msg = String(o.message ?? "").toLowerCase();
  return (
    name === "AbortError" ||
    name === "NotAllowedError" ||
    msg.includes("interrupted by a call to pause") ||
    msg.includes("interrupted because")
  );
}

export default function ReceiptRushPopup({ onClose }: Props) {
  const { userTelegramInitData } = useGameStore();
  const [categoryId, setCategoryId] = useState(RECEIPT_RUSH_CATEGORIES[0]?.id ?? '');
  const [taxType, setTaxType] = useState(RECEIPT_RUSH_CATEGORIES[0]?.taxTypes[0] ?? '');
  const [uraPortal, setUraPortal] = useState('eTax');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptDate, setReceiptDate] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageData, setImageData] = useState('');
  const [imageName, setImageName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const category = useMemo(
    () => RECEIPT_RUSH_CATEGORIES.find((c) => c.id === categoryId) ?? RECEIPT_RUSH_CATEGORIES[0],
    [categoryId]
  );

  const stopCamera = () => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraReady(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read receipt image'));
      reader.readAsDataURL(file);
    });

  const prepareReceiptImage = async (file: File): Promise<string> => {
    if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
    if (file.size > 10 * 1024 * 1024) throw new Error('Receipt image is too large. Max 10MB.');

    const raw = await readFileAsDataUrl(file);
    if (raw.length <= 2_000_000) return raw;

    const img = document.createElement('img');
    img.decoding = 'async';
    img.src = raw;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not process receipt image. Try a JPEG or PNG.'));
    });
    const maxSide = 1000;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not process receipt image.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.72);
  };

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setMessage('Preparing receipt image...');
    try {
      const dataUrl = await prepareReceiptImage(file);
      setImageData(dataUrl);
      setImageName(file.name || `receipt-${Date.now()}.jpg`);
      setImageUrl('embedded');
      setMessage('Receipt image ready. Submit it for approval.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not prepare receipt image');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!userTelegramInitData) {
      setMessage('Missing Telegram session. Re-open app from Telegram.');
      return;
    }
    if (!imageData && !imageUrl.startsWith('/uploads/receipts/')) {
      setMessage('Please upload or scan a receipt image before submitting.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/receipt-rush/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: userTelegramInitData,
          categoryId,
          taxType,
          uraPortal,
          receiptNumber,
          receiptDate,
          amountPaid: Number(amountPaid || 0),
          notes,
          imageUrl,
          imageData,
          imageName,
          imageType: imageData.slice(5, imageData.indexOf(';')) || 'image/jpeg',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setMessage(`Submitted for approval. +${RECEIPT_RUSH_REWARD_BLUE} blue pearls pending.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setBusy(false);
    }
  };

  const startCameraScan = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported on this device/browser.');
      return;
    }
    setCameraError(null);
    setCameraReady(false);
    try {
      // This call triggers browser permission prompt when needed.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera permission denied or unavailable.';
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (!cameraActive || !videoRef.current || !streamRef.current) return;
    const v = videoRef.current;
    const stream = streamRef.current;
    let cancelled = false;
    v.srcObject = stream;

    void (async () => {
      try {
        const p = v.play();
        if (p !== undefined) await p;
        if (!cancelled) setCameraReady(true);
      } catch (err) {
        if (cancelled) return;
        if (isBenignPlayFailure(err)) return;
        setCameraReady(false);
      }
    })();

    return () => {
      cancelled = true;
      try {
        v.pause();
        v.srcObject = null;
      } catch {
        /* ignore */
      }
    };
  }, [cameraActive]);

  const captureFromCamera = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth < 2 || video.videoHeight < 2) {
      setCameraError('Camera is not ready yet. Please wait a second.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCameraError('Failed to process camera frame.');
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      setCameraError('Failed to capture receipt image.');
      return;
    }
    const file = new File([blob], `receipt-scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
    stopCamera();
    await onPickFile(file);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={() => {
        stopCamera();
        onClose();
      }}
    >
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-ura-border/85 bg-[#13161d] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] no-scrollbar sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white">Receipt Rush</h2>
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(window);
              stopCamera();
              onClose();
            }}
            className="px-2 py-1 text-xs rounded bg-ura-panel-2 text-gray-300"
          >
            Close
          </button>
        </div>
        <p className="text-xs text-gray-300 mb-3">
          Upload or scan a tax receipt. Approved receipts award <span className="text-[#5fa8ff] font-semibold">+2000 blue pearls</span>.
        </p>

        <label className="text-xs text-gray-400">URA category</label>
        <select
          value={categoryId}
          onChange={(e) => {
            const id = e.target.value;
            setCategoryId(id);
            const selected = RECEIPT_RUSH_CATEGORIES.find((c) => c.id === id);
            setTaxType(selected?.taxTypes[0] ?? '');
          }}
          className="w-full mt-1 mb-2 rounded-lg bg-ura-panel px-3 py-2 text-sm border border-ura-border/85"
        >
          {RECEIPT_RUSH_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-gray-500 mb-2">{category?.description}</p>

        <label className="text-xs text-gray-400">Tax type</label>
        <select
          value={taxType}
          onChange={(e) => setTaxType(e.target.value)}
          className="w-full mt-1 mb-2 rounded-lg bg-ura-panel px-3 py-2 text-sm border border-ura-border/85"
        >
          {(category?.taxTypes ?? []).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <input className="rounded-lg bg-ura-panel px-3 py-2 text-sm border border-ura-border/85" placeholder="URA portal (optional)" value={uraPortal} onChange={(e) => setUraPortal(e.target.value)} />
          <input className="rounded-lg bg-ura-panel px-3 py-2 text-sm border border-ura-border/85" placeholder="Receipt number (optional)" value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} />
          <input className="rounded-lg bg-ura-panel px-3 py-2 text-sm border border-ura-border/85" placeholder="Receipt date (optional)" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
          <input className="rounded-lg bg-ura-panel px-3 py-2 text-sm border border-ura-border/85" placeholder="Amount paid (optional)" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} inputMode="numeric" />
        </div>

        <textarea
          className="w-full mt-2 rounded-lg bg-ura-panel px-3 py-2 text-sm border border-ura-border/85 min-h-[76px]"
          placeholder="Optional notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="mt-3 space-y-2">
          <label className="block rounded-lg border border-ura-border/85 bg-ura-panel-2 px-3 py-2 text-sm cursor-pointer">
            Upload receipt image
            <input type="file" accept="image/*" className="hidden" onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)} />
          </label>
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(window);
              void startCameraScan();
            }}
            className="w-full text-left rounded-lg border border-ura-border/85 bg-ura-panel-2 px-3 py-2 text-sm"
          >
            Scan receipt (camera)
          </button>
          {cameraError ? <p className="text-[11px] text-rose-300">{cameraError}</p> : null}
          {cameraActive ? (
            <div className="rounded-lg border border-ura-border/85 bg-[#0e1118] p-2">
              <video ref={videoRef} playsInline muted className="w-full rounded-md border border-ura-border/70 bg-black" />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={!cameraReady || busy}
                  onClick={() => void captureFromCamera()}
                  className="flex-1 rounded-md bg-[#5fa8ff] text-[#07111f] font-semibold py-2 disabled:opacity-60"
                >
                  Capture
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex-1 rounded-md border border-ura-border/85 bg-ura-panel text-gray-200 py-2"
                >
                  Cancel camera
                </button>
              </div>
            </div>
          ) : null}
          {imageUrl ? (
            <p className="text-[11px] text-emerald-300 break-all">
              Receipt image ready{imageName ? `: ${imageName}` : ''}.
            </p>
          ) : null}
        </div>

        {message ? <p className="mt-3 text-xs text-gray-300">{message}</p> : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            triggerHapticFeedback(window);
            void submit();
          }}
          className="mt-4 w-full rounded-lg bg-[#5fa8ff] text-[#07111f] font-bold py-2.5 disabled:opacity-60"
        >
          {busy ? 'Please wait...' : 'Submit for approval'}
        </button>
      </div>
    </div>
  );
}

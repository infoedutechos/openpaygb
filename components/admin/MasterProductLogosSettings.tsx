"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { PRODUCT_LOGO_IDS, type ProductLogoId, PRODUCT_LOGO_LABELS } from "@/lib/platform-brand";
import { readJsonResponse } from "@/utils/read-json-response";

type LogoStatus = {
  label: string;
  hasLogo: boolean;
  publicUrl: string | null;
  uploadedAt: string | null;
};

export function MasterProductLogosSettings() {
  const [logos, setLogos] = useState<Record<ProductLogoId, LogoStatus> | null>(null);
  const [busy, setBusy] = useState<ProductLogoId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const inputs = useRef<Partial<Record<ProductLogoId, HTMLInputElement | null>>>({});

  const load = useCallback(async () => {
    setError(null);
    const r = await fetch("/api/master/product-logos", { credentials: "include" });
    const parsed = await readJsonResponse<{ logos: Record<ProductLogoId, LogoStatus> }>(r);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setLogos(parsed.data.logos);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(product: ProductLogoId, file: File) {
    setBusy(product);
    setError(null);
    setSaved(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`/api/master/product-logos/${product}`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const parsed = await readJsonResponse<{
        hasLogo: boolean;
        publicUrl: string | null;
        uploadedAt: string | null;
        label: string;
      }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setLogos((prev) =>
        prev
          ? {
              ...prev,
              [product]: {
                label: parsed.data.label || PRODUCT_LOGO_LABELS[product],
                hasLogo: parsed.data.hasLogo,
                publicUrl: parsed.data.publicUrl,
                uploadedAt: parsed.data.uploadedAt,
              },
            }
          : prev,
      );
      setSaved(`${PRODUCT_LOGO_LABELS[product]} logo saved.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove(product: ProductLogoId) {
    setBusy(product);
    setError(null);
    setSaved(null);
    try {
      const r = await fetch(`/api/master/product-logos/${product}`, {
        method: "DELETE",
        credentials: "include",
      });
      const parsed = await readJsonResponse<{ ok: boolean }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setLogos((prev) =>
        prev
          ? {
              ...prev,
              [product]: {
                label: PRODUCT_LOGO_LABELS[product],
                hasLogo: false,
                publicUrl: null,
                uploadedAt: null,
              },
            }
          : prev,
      );
      setSaved(`${PRODUCT_LOGO_LABELS[product]} logo removed.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      id="product-logos"
      className="scroll-mt-24 space-y-4 rounded-2xl border border-amber-500/20 bg-[#120e0a] p-5"
    >
      <div>
        <h2 className="text-lg font-semibold text-amber-50">Product logos</h2>
        <p className="mt-1 text-sm text-slate-400">
          Independent logos for <strong className="text-slate-300">ODELPay HUB</strong>,{" "}
          <strong className="text-slate-300">OdelPay — Higher</strong>,{" "}
          <strong className="text-slate-300">OdelPay — Schools</strong>, and{" "}
          <strong className="text-slate-300">OpenPayGB</strong>. PNG, JPEG, WebP, or ICO · max 512KB.
          Hub logo also serves favicon / PWA / share previews.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PRODUCT_LOGO_IDS.map((id) => {
          const row = logos?.[id];
          const label = row?.label ?? PRODUCT_LOGO_LABELS[id];
          return (
            <div key={id} className="rounded-xl border border-white/10 bg-black/25 p-4">
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="mt-0.5 font-mono text-[10px] text-slate-500">{id}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {row?.hasLogo && row.publicUrl ? (
                  <Image
                    src={row.publicUrl}
                    alt={`${label} logo`}
                    width={64}
                    height={64}
                    unoptimized
                    className="h-16 w-16 rounded-xl border border-white/15 bg-black/40 object-contain p-1"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-white/20 bg-black/30 text-[10px] text-slate-600">
                    No logo
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={(el) => {
                      inputs.current[id] = el;
                    }}
                    type="file"
                    accept=".ico,.png,.jpg,.jpeg,.webp,image/x-icon,image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void upload(id, f);
                    }}
                  />
                  <button
                    type="button"
                    disabled={busy === id}
                    onClick={() => inputs.current[id]?.click()}
                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
                  >
                    {busy === id ? "Working…" : row?.hasLogo ? "Replace" : "Upload"}
                  </button>
                  {row?.hasLogo ? (
                    <button
                      type="button"
                      disabled={busy === id}
                      onClick={() => void remove(id)}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-300">{saved}</p> : null}
    </section>
  );
}

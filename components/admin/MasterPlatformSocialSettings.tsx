"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SiteUiSettingsRow, SocialLink, SocialLinkDisplay } from "@/lib/site-ui-shared";
import { BUILTIN_SOCIAL_LABELS, type BuiltinSocialKey } from "@/lib/site-ui-shared";
import { fetchJson } from "@/utils/fetch-json";
import { notifySiteUiUpdated } from "@/hooks/useSupportPanelSettings";

const AUTO_SAVE_MS = 800;

function buildSiteUiPatchPayload(data: SiteUiSettingsRow) {
  return {
    socialLinks: data.socialLinks,
    shareEnabled: data.shareEnabled,
    shareDefaultTitle: data.shareDefaultTitle,
    shareDefaultText: data.shareDefaultText,
    supportPhone: data.supportPhone,
    supportEmail: data.supportEmail,
    communitySupportUrl: data.communitySupportUrl,
    showSupportPhone: data.showSupportPhone,
    showSupportEmail: data.showSupportEmail,
    showCommunitySupport: data.showCommunitySupport,
    footerIntro: data.footerIntro,
    footerMode: data.footerMode,
    footerPathList: data.footerPathList,
    footerShowQuickLinks: data.footerShowQuickLinks,
    footerCopyrightVisible: data.footerCopyrightVisible,
    homeScreenEnabled: data.homeScreenEnabled,
    homeScreenShowOnHome: data.homeScreenShowOnHome,
    homeScreenTitle: data.homeScreenTitle,
    homeScreenShortName: data.homeScreenShortName,
    homeScreenDescription: data.homeScreenDescription,
    homeScreenThemeColor: data.homeScreenThemeColor,
  };
}

function serializeSiteUiPatch(data: SiteUiSettingsRow) {
  return JSON.stringify(buildSiteUiPatchPayload(data));
}

export function MasterPlatformSocialSettings() {
  const [data, setData] = useState<SiteUiSettingsRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [bubbleBusy, setBubbleBusy] = useState(false);
  const [iconBusyKey, setIconBusyKey] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bubbleInputRef = useRef<HTMLInputElement | null>(null);
  const lastPersistedRef = useRef("");

  const load = useCallback(async () => {
    try {
      const r = await fetchJson("/api/master/site-ui", { credentials: "include" });
      const j = await r.json();
      if (!r.ok) {
        setError((j as { error?: string }).error ?? "Could not load settings");
        return;
      }
      const row = j as SiteUiSettingsRow;
      setData(row);
      lastPersistedRef.current = serializeSiteUiPatch(row);
      setSaved(true);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach server");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function updateLink(key: string, patch: Partial<SocialLink>) {
    setData((prev) => {
      if (!prev) return prev;
      const socialLinks = prev.socialLinks.map((l) => (l.key === key ? { ...l, ...patch } : l));
      return { ...prev, socialLinks };
    });
    setSaved(false);
  }

  async function uploadLogo(file: File) {
    setLogoBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await fetch("/api/master/site-ui/logo", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const j = await r.json();
      if (!r.ok) throw new Error((j as { error?: string }).error ?? "Upload failed");
      await load();
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLogoBusy(false);
    }
  }

  async function uploadSocialIcon(key: string, file: File) {
    setIconBusyKey(key);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await fetch(`/api/master/site-ui/social-icon/${encodeURIComponent(key)}`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const j = await r.json();
      if (!r.ok) throw new Error((j as { error?: string }).error ?? "Upload failed");
      await load();
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Icon upload failed");
    } finally {
      setIconBusyKey(null);
    }
  }

  async function removeSocialIcon(key: string) {
    if (!confirm(`Remove the custom icon for this platform?`)) return;
    setIconBusyKey(key);
    setError(null);
    try {
      const r = await fetch(`/api/master/site-ui/social-icon/${encodeURIComponent(key)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = await r.json();
      if (!r.ok) throw new Error((j as { error?: string }).error ?? "Remove failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setIconBusyKey(null);
    }
  }

  async function removeLogo() {
    if (!confirm("Remove the platform logo? The default icon will be used again.")) return;
    setLogoBusy(true);
    setError(null);
    try {
      const r = await fetchJson("/api/master/site-ui/logo", { method: "DELETE", credentials: "include" });
      const j = await r.json();
      if (!r.ok) throw new Error((j as { error?: string }).error ?? "Remove failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setLogoBusy(false);
    }
  }

  async function uploadCopilotBubble(file: File) {
    setBubbleBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await fetchJson("/api/master/site-ui/copilot-bubble", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const j = await r.json();
      if (!r.ok) throw new Error((j as { error?: string }).error ?? "Upload failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBubbleBusy(false);
    }
  }

  async function removeCopilotBubble() {
    if (!confirm("Remove the Help bubble image? The default 💬 icon will be used again.")) return;
    setBubbleBusy(true);
    setError(null);
    try {
      const r = await fetchJson("/api/master/site-ui/copilot-bubble", {
        method: "DELETE",
        credentials: "include",
      });
      const j = await r.json();
      if (!r.ok) throw new Error((j as { error?: string }).error ?? "Remove failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBubbleBusy(false);
    }
  }

  const persistSettings = useCallback(async (payload: SiteUiSettingsRow) => {
    const serialized = serializeSiteUiPatch(payload);
    if (serialized === lastPersistedRef.current) return;

    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/master/site-ui", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: serialized,
      });
      const j = await r.json();
      if (!r.ok) throw new Error((j as { error?: string }).error ?? "Save failed");
      const row = j as SiteUiSettingsRow;
      setData(row);
      lastPersistedRef.current = serializeSiteUiPatch(row);
      setSaved(true);
      notifySiteUiUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!data) return;
    const serialized = serializeSiteUiPatch(data);
    if (serialized === lastPersistedRef.current) {
      setSaved(true);
      return;
    }

    setSaved(false);
    const timer = window.setTimeout(() => {
      void persistSettings(data);
    }, AUTO_SAVE_MS);

    return () => window.clearTimeout(timer);
  }, [data, persistSettings]);

  if (!data) {
    return <p className="text-sm text-slate-500">Loading social & share settings…</p>;
  }

  const builtins = data.socialLinks.filter((l) => l.key in BUILTIN_SOCIAL_LABELS);

  function linkLabel(link: SocialLink) {
    return BUILTIN_SOCIAL_LABELS[link.key as BuiltinSocialKey] ?? link.label;
  }

  return (
    <section
      id="platform-social"
      className="rounded-xl border border-cyan-500/25 bg-cyan-950/15 p-4 shadow-[0_0_0_1px_rgba(34,211,238,0.06)] sm:p-5 md:p-6"
    >
      <h2 className="text-sm font-semibold text-cyan-100">Social, share & home screen</h2>
      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
        <strong className="text-slate-300">Site logo</strong> (below) is your brand mark for browser tabs, PWA, and link
        previews. <strong className="text-slate-300">Per-platform icons</strong> in the table are optional footer/support
        images for each channel (WhatsApp, Telegram, etc.) — if empty, short text badges (WA, TG…) are shown. Links
        marked <strong className="text-slate-300">Support panel</strong> appear in the floating Help widget.{" "}
        <strong className="text-slate-300">Footer</strong> shows enabled community links.
      </p>

      <div className="mt-5 rounded-lg border border-white/10 bg-black/25 p-4">
        <p className="text-xs font-semibold text-cyan-100">Site-wide logo (favicon &amp; link previews)</p>
        <p className="mt-1 text-[11px] text-slate-500">
          PNG, JPEG, WebP, or ICO · max 512KB · square works best (512×512). Served at{" "}
          <code className="text-slate-400">/api/platform/logo</code>
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {data.hasPlatformLogo && data.platformLogoUrl ? (
            <Image
              src={data.platformLogoUrl}
              alt="Platform logo preview"
              width={72}
              height={72}
              unoptimized
              className="h-[72px] w-[72px] rounded-xl border border-white/15 bg-black/40 object-contain p-1"
            />
          ) : (
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-xl border border-dashed border-white/20 bg-black/30 text-[10px] text-slate-600">
              No logo
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <input
              ref={logoInputRef}
              type="file"
              accept=".ico,.png,.jpg,.jpeg,.webp,image/x-icon,image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void uploadLogo(f);
              }}
            />
            <button
              type="button"
              disabled={logoBusy}
              onClick={() => logoInputRef.current?.click()}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-500 disabled:opacity-50"
            >
              {logoBusy ? "Uploading…" : data.hasPlatformLogo ? "Replace logo" : "Upload logo"}
            </button>
            {data.hasPlatformLogo ? (
              <button
                type="button"
                disabled={logoBusy}
                onClick={() => void removeLogo()}
                className="rounded-lg border border-white/15 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-4">
        <p className="text-xs font-semibold text-sky-100">Help copilot bubble image</p>
        <p className="mt-1 text-[11px] text-slate-500">
          Shown on the floating <strong className="text-slate-400">Help</strong> button across pay, tuition, admin, and
          URAPearls. PNG, JPEG, or WebP · max 512KB · square/circular crop works best. Served at{" "}
          <code className="text-slate-400">/api/platform/copilot-bubble</code>
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {data.hasCopilotBubbleImage && data.copilotBubbleImageUrl ? (
            <Image
              src={data.copilotBubbleImageUrl}
              alt="Help bubble preview"
              width={72}
              height={72}
              unoptimized
              className="h-[72px] w-[72px] rounded-full border border-white/15 bg-black/40 object-cover"
            />
          ) : (
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-dashed border-white/20 bg-black/30 text-2xl">
              💬
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <input
              ref={bubbleInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void uploadCopilotBubble(f);
              }}
            />
            <button
              type="button"
              disabled={bubbleBusy}
              onClick={() => bubbleInputRef.current?.click()}
              className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-500 disabled:opacity-50"
            >
              {bubbleBusy
                ? "Uploading…"
                : data.hasCopilotBubbleImage
                  ? "Replace bubble image"
                  : "Upload bubble image"}
            </button>
            {data.hasCopilotBubbleImage ? (
              <button
                type="button"
                disabled={bubbleBusy}
                onClick={() => void removeCopilotBubble()}
                className="rounded-lg border border-white/15 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      <p className="mt-3 text-sm text-slate-400" aria-live="polite">
        {busy ? (
          <span className="text-cyan-300">Saving…</span>
        ) : saved ? (
          <span className="text-emerald-400">All changes saved — live in Help / support panel.</span>
        ) : (
          <span className="text-amber-200/90">Unsaved changes — auto-save in a moment…</span>
        )}
      </p>

      <div className="mt-6 space-y-8">
        <div className="space-y-4 rounded-lg border border-emerald-500/20 bg-emerald-950/15 p-4">
          <h3 className="text-sm font-semibold text-emerald-100">Support panel (Help / Talk to an agent)</h3>
          <p className="text-xs text-slate-500">
            Shown in the copilot “Talk to an agent” section. Toggle each row off to hide without clearing the value.
            Changes apply immediately after Save (no full page reload). Social platforms below use their own{" "}
            <strong className="text-slate-400">Support panel</strong> checkbox.
          </p>
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <label className="text-[11px] font-medium text-slate-500">Support phone (display)</label>
              <input
                value={data.supportPhone}
                onChange={(e) => {
                  setData({ ...data, supportPhone: e.target.value });
                  setSaved(false);
                }}
                placeholder="e.g. +256 800 117 000"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
              />
              <label className="mt-2 inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={data.showSupportPhone}
                  onChange={(e) => {
                    setData({ ...data, showSupportPhone: e.target.checked });
                    setSaved(false);
                  }}
                />
                Show in support panel
              </label>
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500">Support email</label>
              <input
                value={data.supportEmail}
                onChange={(e) => {
                  setData({ ...data, supportEmail: e.target.value });
                  setSaved(false);
                }}
                placeholder="support@example.com"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
              />
              <label className="mt-2 inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={data.showSupportEmail}
                  onChange={(e) => {
                    setData({ ...data, showSupportEmail: e.target.checked });
                    setSaved(false);
                  }}
                />
                Show in support panel
              </label>
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500">Community Support (WhatsApp group)</label>
              <input
                value={data.communitySupportUrl}
                onChange={(e) => {
                  setData({ ...data, communitySupportUrl: e.target.value });
                  setSaved(false);
                }}
                placeholder="https://chat.whatsapp.com/…"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
              />
              <label className="mt-2 inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={data.showCommunitySupport}
                  onChange={(e) => {
                    setData({ ...data, showCommunitySupport: e.target.checked });
                    setSaved(false);
                  }}
                />
                Show in support panel
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-sky-500/20 bg-sky-950/20 p-4">
          <h3 className="text-sm font-semibold text-sky-100">Site footer</h3>
          <p className="text-xs text-slate-500">
            Controls the marketing footer blurb, quick links, copyright line, and which routes show the footer.
          </p>
          <div>
            <label className="text-[11px] font-medium text-slate-500">Intro blurb</label>
            <textarea
              value={data.footerIntro}
              onChange={(e) => {
                setData({ ...data, footerIntro: e.target.value });
                setSaved(false);
              }}
              rows={3}
              placeholder="Leave empty to use the default tuition programme description."
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500">Visibility mode</label>
            <select
              value={data.footerMode}
              onChange={(e) => {
                setData({ ...data, footerMode: e.target.value });
                setSaved(false);
              }}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white sm:max-w-md"
            >
              <option value="everywhere">Show on all pages</option>
              <option value="hidden_on_list">Hide on listed paths only</option>
              <option value="only_on_list">Show only on listed paths</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500">
              Path prefixes (one per line, e.g. /pay or /student)
            </label>
            <textarea
              value={data.footerPathList.join("\n")}
              onChange={(e) => {
                const footerPathList = e.target.value
                  .split(/\r?\n/)
                  .map((s) => s.trim())
                  .filter(Boolean);
                setData({ ...data, footerPathList });
                setSaved(false);
              }}
              rows={3}
              placeholder={"/pay\n/student"}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 font-mono text-sm text-white"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-slate-300 md:min-h-0">
              <input
                type="checkbox"
                checked={data.footerShowQuickLinks}
                onChange={(e) => {
                  setData({ ...data, footerShowQuickLinks: e.target.checked });
                  setSaved(false);
                }}
              />
              Show quick links (Pay, Student, Dashboard)
            </label>
            <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-slate-300 md:min-h-0">
              <input
                type="checkbox"
                checked={data.footerCopyrightVisible}
                onChange={(e) => {
                  setData({ ...data, footerCopyrightVisible: e.target.checked });
                  setSaved(false);
                }}
              />
              Show copyright line
            </label>
          </div>
        </div>

        <div className="space-y-3 md:hidden">
          {builtins.map((link) => (
            <div
              key={link.key}
              className="rounded-lg border border-[var(--border)] bg-black/20 p-4 text-slate-300"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-sm font-medium text-white">{linkLabel(link)}</p>
                <SocialLinkIconCell
                  link={link}
                  busy={iconBusyKey === link.key}
                  onUpload={(file) => void uploadSocialIcon(link.key, file)}
                  onRemove={() => void removeSocialIcon(link.key)}
                />
              </div>
              <label className="mt-3 block">
                <span className="text-[11px] font-medium text-slate-500">URL</span>
                <input
                  value={link.url}
                  onChange={(e) => updateLink(link.key, { url: e.target.value })}
                  placeholder="https://…"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={link.enabled}
                    onChange={(e) => updateLink(link.key, { enabled: e.target.checked })}
                  />
                  On
                </label>
                <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={link.showInFooter}
                    onChange={(e) => updateLink(link.key, { showInFooter: e.target.checked })}
                  />
                  Footer
                </label>
                <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={link.showInSupport}
                    onChange={(e) => updateLink(link.key, { showInSupport: e.target.checked })}
                  />
                  Support panel
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto rounded-lg border border-[var(--border)] md:block">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/30 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Platform</th>
                <th className="px-3 py-2 font-medium">Icon</th>
                <th className="px-3 py-2 font-medium">URL</th>
                <th className="px-3 py-2 font-medium">On</th>
                <th className="px-3 py-2 font-medium">Footer</th>
                <th className="px-3 py-2 font-medium">Support</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {builtins.map((link) => (
                <tr key={link.key} className="text-slate-300">
                  <td className="px-3 py-2 font-medium text-white">{linkLabel(link)}</td>
                  <td className="px-3 py-2">
                    <SocialLinkIconCell
                      link={link}
                      busy={iconBusyKey === link.key}
                      onUpload={(file) => void uploadSocialIcon(link.key, file)}
                      onRemove={() => void removeSocialIcon(link.key)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={link.url}
                      onChange={(e) => updateLink(link.key, { url: e.target.value })}
                      placeholder="https://…"
                      className="w-full min-w-0 rounded border border-[var(--border)] bg-[#0d1526] px-2 py-1.5 text-white"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={link.enabled}
                      onChange={(e) => updateLink(link.key, { enabled: e.target.checked })}
                      aria-label={`Enable ${link.label}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={link.showInFooter}
                      onChange={(e) => updateLink(link.key, { showInFooter: e.target.checked })}
                      aria-label={`Footer ${link.label}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={link.showInSupport}
                      onChange={(e) => updateLink(link.key, { showInSupport: e.target.checked })}
                      aria-label={`Support ${link.label}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 rounded-lg border border-violet-500/20 bg-violet-950/20 p-4">
          <label
            htmlFor="share-enabled"
            className="flex min-h-[44px] cursor-pointer items-center gap-3 md:min-h-0"
          >
            <input
              id="share-enabled"
              type="checkbox"
              checked={data.shareEnabled}
              onChange={(e) => {
                setData({ ...data, shareEnabled: e.target.checked });
                setSaved(false);
              }}
            />
            <span className="text-sm font-medium text-violet-100">Enable “Share” across the platform</span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-medium text-slate-500">Default share title</label>
              <input
                value={data.shareDefaultTitle}
                onChange={(e) => {
                  setData({ ...data, shareDefaultTitle: e.target.value });
                  setSaved(false);
                }}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] font-medium text-slate-500">Default share message</label>
              <textarea
                value={data.shareDefaultText}
                onChange={(e) => {
                  setData({ ...data, shareDefaultText: e.target.value });
                  setSaved(false);
                }}
                rows={3}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Share opens Telegram, WhatsApp, X, Facebook, LinkedIn, email, native share, and copy link.
          </p>
        </div>

        <div className="space-y-4 rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-4">
          <h3 className="text-sm font-semibold text-emerald-100">Save to home screen / desktop</h3>
          <p className="text-xs text-slate-500">
            Controls the install card on the home page and the PWA manifest (app name, colors).
          </p>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-slate-300 md:min-h-0">
              <input
                type="checkbox"
                checked={data.homeScreenEnabled}
                onChange={(e) => {
                  setData({ ...data, homeScreenEnabled: e.target.checked });
                  setSaved(false);
                }}
              />
              Enable install / PWA
            </label>
            <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-slate-300 md:min-h-0">
              <input
                type="checkbox"
                checked={data.homeScreenShowOnHome}
                onChange={(e) => {
                  setData({ ...data, homeScreenShowOnHome: e.target.checked });
                  setSaved(false);
                }}
              />
              Show card on home page
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-medium text-slate-500">App name</label>
              <input
                value={data.homeScreenTitle}
                onChange={(e) => {
                  setData({ ...data, homeScreenTitle: e.target.value });
                  setSaved(false);
                }}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500">Short name (launcher)</label>
              <input
                value={data.homeScreenShortName}
                onChange={(e) => {
                  setData({ ...data, homeScreenShortName: e.target.value });
                  setSaved(false);
                }}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] font-medium text-slate-500">Install prompt description</label>
              <textarea
                value={data.homeScreenDescription}
                onChange={(e) => {
                  setData({ ...data, homeScreenDescription: e.target.value });
                  setSaved(false);
                }}
                rows={2}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500">Theme color (hex)</label>
              <input
                value={data.homeScreenThemeColor}
                onChange={(e) => {
                  setData({ ...data, homeScreenThemeColor: e.target.value });
                  setSaved(false);
                }}
                placeholder="#0ea5e9"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

function SocialLinkIconCell({
  link,
  busy,
  onUpload,
  onRemove,
}: {
  link: SocialLinkDisplay;
  busy: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {link.iconUrl ? (
        <Image
          src={link.iconUrl}
          alt=""
          width={32}
          height={32}
          unoptimized
          className="h-8 w-8 rounded-lg border border-white/15 bg-black/40 object-contain p-0.5"
        />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-white/20 bg-black/30 text-[9px] font-bold text-slate-500">
          auto
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onUpload(f);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="rounded border border-white/15 px-2 py-1 text-[10px] text-slate-300 hover:bg-white/5 disabled:opacity-50"
      >
        {busy ? "…" : link.hasCustomIcon ? "Replace" : "Upload"}
      </button>
      {link.hasCustomIcon ? (
        <button
          type="button"
          disabled={busy}
          onClick={onRemove}
          className="rounded border border-white/15 px-2 py-1 text-[10px] text-slate-400 hover:bg-white/5 disabled:opacity-50"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

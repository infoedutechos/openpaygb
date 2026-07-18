"use client";

import { useEffect, useState } from "react";
import { DemoLoginDetailsPanel } from "@/components/demo/DemoLoginDetailsPanel";
import type { DemoLoginAudience, DemoLoginPublicView } from "@/lib/demo-logins-shared";
import { readJsonResponse } from "@/utils/read-json-response";

/** Client panel that always mirrors the latest MAC demo-login directory. */
export function DemoLoginLiveHint({
  audience,
  title,
  className,
}: {
  audience: DemoLoginAudience | "all";
  title?: string;
  className?: string;
}) {
  const [slots, setSlots] = useState<DemoLoginPublicView[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch(`/api/public/demo-logins?audience=${encodeURIComponent(audience)}`, {
          cache: "no-store",
        });
        const parsed = await readJsonResponse<{ slots: DemoLoginPublicView[] }>(r);
        if (!parsed.ok || cancelled) return;
        setSlots(parsed.data.slots ?? []);
      } catch {
        /* ignore — panel stays empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [audience]);

  if (!slots.length) return null;

  return (
    <div className={className}>
      <DemoLoginDetailsPanel
        title={title}
        accent={audience === "university" ? "university" : audience === "platform" ? "platform" : "school"}
        slots={slots}
      />
    </div>
  );
}

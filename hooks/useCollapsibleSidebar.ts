"use client";

import { useCallback, useEffect, useState } from "react";

/** Persist desktop sidebar collapsed state per portal. */
export function useCollapsibleSidebar(storageKey: string) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [storageKey]);

  const expand = useCallback(() => {
    setCollapsed(false);
    try {
      localStorage.setItem(storageKey, "0");
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  return { collapsed, toggle, expand, setCollapsed };
}

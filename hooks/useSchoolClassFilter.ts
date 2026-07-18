"use client";

import { useEffect, useState } from "react";
import {
  readSchoolClassFilterId,
  writeSchoolClassFilterId,
  SCHOOL_CLASS_FILTER_EVENT,
} from "@/lib/school-class-filter";

/** Syncs with SchoolContextBar Class dropdown (All = ""). */
export function useSchoolClassFilter(): [string, (id: string) => void] {
  const [schoolClassId, setSchoolClassId] = useState("");

  useEffect(() => {
    setSchoolClassId(readSchoolClassFilterId());
    function onFilter(e: Event) {
      const detail = (e as CustomEvent<{ schoolClassId?: string }>).detail;
      setSchoolClassId(detail?.schoolClassId?.trim() ?? "");
    }
    window.addEventListener(SCHOOL_CLASS_FILTER_EVENT, onFilter);
    return () => window.removeEventListener(SCHOOL_CLASS_FILTER_EVENT, onFilter);
  }, []);

  function setFilter(id: string) {
    const next = id.trim();
    setSchoolClassId(next);
    writeSchoolClassFilterId(next);
  }

  return [schoolClassId, setFilter];
}

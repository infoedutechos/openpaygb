import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { LEARN_CATEGORY_DEFAULTS } from '@/data/learn-defaults';

import { apiErrorResponse } from "@/lib/api-error";
export const dynamic = 'force-dynamic';
const COLLECTION = 'LearnCategoryContent';

type RawDoc = {
  _id?: { $oid?: string } | string;
  slug?: string;
  title?: string;
  icon?: string;
  section?: string;
  summary?: string;
  topics?: unknown;
  lessons?: unknown;
  operations?: unknown;
  sortOrder?: number;
  enabled?: boolean;
};

function normalize(raw: RawDoc) {
  return {
    id: typeof raw._id === 'string' ? raw._id : raw._id?.$oid ?? '',
    slug: String(raw.slug ?? ''),
    title: String(raw.title ?? ''),
    icon: String(raw.icon ?? 'i'),
    section: String(raw.section ?? 'tax-education'),
    summary: String(raw.summary ?? ''),
    topics: Array.isArray(raw.topics) ? raw.topics.map((x) => String(x)) : [],
    lessons: Array.isArray(raw.lessons)
      ? raw.lessons.map((x: unknown) => {
          const o = x && typeof x === "object" ? (x as Record<string, unknown>) : {};
          return { title: String(o.title ?? ""), content: String(o.content ?? "") };
        })
      : [],
    operations: Array.isArray(raw.operations) ? raw.operations.map((x) => String(x)) : [],
    sortOrder: Number(raw.sortOrder ?? 0),
    enabled: raw.enabled !== false,
  };
}

export async function GET() {
  try {
    const result = await prisma.$runCommandRaw({
      find: COLLECTION,
      filter: { enabled: true },
      sort: { sortOrder: 1, title: 1 },
    });
    const batch = (result as { cursor?: { firstBatch?: RawDoc[] } })?.cursor?.firstBatch ?? [];
    const docs = batch.map(normalize);

    if (docs.length === 0) {
      return NextResponse.json({ categories: LEARN_CATEGORY_DEFAULTS });
    }

    return NextResponse.json({ categories: docs });
  } catch (e) {
    return apiErrorResponse(e, { route: "learn/categories", fallback: "Request failed" });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getAdminAuthError } from '@/utils/admin-session';
import { LEARN_CATEGORY_DEFAULTS } from '@/data/learn-defaults';

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

type MongoFindResult = { cursor?: { firstBatch?: RawDoc[] } };

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
          const o = x as { title?: unknown; content?: unknown };
          return { title: String(o?.title ?? ''), content: String(o?.content ?? '') };
        })
      : [],
    operations: Array.isArray(raw.operations) ? raw.operations.map((x) => String(x)) : [],
    sortOrder: Number(raw.sortOrder ?? 0),
    enabled: raw.enabled !== false,
  };
}

export async function GET(req: NextRequest) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  try {
    const result = await prisma.$runCommandRaw({
      find: COLLECTION,
      sort: { sortOrder: 1, title: 1 },
    });
    const categories = ((result as MongoFindResult).cursor?.firstBatch ?? []).map(normalize);
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('[api/admin/learn] GET failed:', error);
    return NextResponse.json({ error: 'Failed to load learn categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body as { action?: string };

    if (action === 'seed-defaults') {
      let count = 0;
      for (const item of LEARN_CATEGORY_DEFAULTS) {
        await prisma.$runCommandRaw({
          update: COLLECTION,
          updates: [
            {
              q: { slug: item.slug },
              u: {
                $setOnInsert: {
                  slug: item.slug,
                  title: item.title,
                  icon: item.icon,
                  section: item.section ?? 'tax-education',
                  summary: item.summary,
                  topics: item.topics,
                  lessons: item.lessons,
                  operations: item.operations ?? [],
                  sortOrder: item.sortOrder,
                  enabled: item.enabled ?? true,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              },
              upsert: true,
            },
          ],
        });
        count += 1;
      }
      return NextResponse.json({ success: true, seeded: count });
    }

    if (action === 'create') {
      const slug = String(body.slug ?? '').trim();
      const title = String(body.title ?? '').trim();
      const summary = String(body.summary ?? '').trim();
      if (!slug || !title || !summary) {
        return NextResponse.json({ error: 'slug, title and summary are required' }, { status: 400 });
      }
      await prisma.$runCommandRaw({
        insert: COLLECTION,
        documents: [
          {
            slug,
            title,
            icon: String(body.icon ?? 'i').trim().slice(0, 4) || 'i',
            section: body.section === 'general' ? 'general' : 'tax-education',
            summary,
            topics: Array.isArray(body.topics) ? body.topics.map((x: unknown) => String(x)) : [],
            lessons: Array.isArray(body.lessons) ? body.lessons : [],
            operations: Array.isArray(body.operations) ? body.operations.map((x: unknown) => String(x)) : [],
            sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
            enabled: body.enabled !== false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
      const insertedResult = await prisma.$runCommandRaw({
        find: COLLECTION,
        filter: { slug },
        limit: 1,
      });
      const created = ((insertedResult as MongoFindResult).cursor?.firstBatch ?? []).map(normalize)[0] ?? null;
      return NextResponse.json({ success: true, category: created });
    }

    if (action === 'update') {
      const id = String(body.id ?? '').trim();
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (body.slug != null) patch.slug = String(body.slug).trim();
      if (body.title != null) patch.title = String(body.title).trim();
      if (body.icon != null) patch.icon = String(body.icon).trim().slice(0, 4);
      if (body.section != null) patch.section = body.section === 'general' ? 'general' : 'tax-education';
      if (body.summary != null) patch.summary = String(body.summary).trim();
      if (Array.isArray(body.topics)) patch.topics = body.topics.map((x: unknown) => String(x));
      if (Array.isArray(body.lessons)) patch.lessons = body.lessons;
      if (Array.isArray(body.operations)) patch.operations = body.operations.map((x: unknown) => String(x));
      if (Number.isFinite(Number(body.sortOrder))) patch.sortOrder = Number(body.sortOrder);
      if (typeof body.enabled === 'boolean') patch.enabled = body.enabled;
      const updateCommand = {
        update: COLLECTION,
        updates: [{ q: { _id: { $oid: id } }, u: { $set: patch } }],
      };
      await prisma.$runCommandRaw(updateCommand as Parameters<typeof prisma.$runCommandRaw>[0]);
      const updatedResult = await prisma.$runCommandRaw({
        find: COLLECTION,
        filter: { _id: { $oid: id } },
        limit: 1,
      });
      const updated = ((updatedResult as MongoFindResult).cursor?.firstBatch ?? []).map(normalize)[0] ?? null;
      return NextResponse.json({ success: true, category: updated });
    }

    if (action === 'delete') {
      const id = String(body.id ?? '').trim();
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
      await prisma.$runCommandRaw({
        delete: COLLECTION,
        deletes: [{ q: { _id: { $oid: id } }, limit: 1 }],
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[api/admin/learn] POST failed:', error);
    return NextResponse.json({ error: 'Failed to save learn content' }, { status: 500 });
  }
}

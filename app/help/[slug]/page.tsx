import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureKnowledgeBaseSeeded } from "@/lib/knowledge-base/seed";
import { getPublishedKnowledgeArticle } from "@/lib/knowledge-base/browse";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  await ensureKnowledgeBaseSeeded();
  const article = await getPublishedKnowledgeArticle(slug);
  if (!article) return { title: "Article not found" };
  return {
    title: article.title,
    description: article.summary || article.excerpt,
  };
}

export default async function HelpArticlePage({ params }: Params) {
  const { slug } = await params;
  await ensureKnowledgeBaseSeeded();
  const article = await getPublishedKnowledgeArticle(slug);
  if (!article) notFound();

  const paragraphs = article.body.split(/\n{2,}/).filter(Boolean);

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 pb-24">
      <Link
        href="/help"
        className="text-sm font-medium text-sky-300 hover:text-sky-200 hover:underline"
      >
        ← All help articles
      </Link>

      <header className="mt-6 border-b border-white/10 pb-6">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {article.category} · {article.audience}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">{article.title}</h1>
        {article.summary ? (
          <p className="mt-3 text-sm text-slate-400">{article.summary}</p>
        ) : null}
        {article.tags.length > 0 ? (
          <p className="mt-4 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400"
              >
                {tag}
              </span>
            ))}
          </p>
        ) : null}
      </header>

      <div className="mt-8 space-y-4 text-sm leading-relaxed text-slate-300">
        {paragraphs.map((block, i) => {
          if (block.startsWith("### ")) {
            return (
              <h2 key={i} className="text-base font-semibold text-white pt-2">
                {block.replace(/^###\s+/, "")}
              </h2>
            );
          }
          return (
            <p key={i} className="whitespace-pre-wrap">
              {block}
            </p>
          );
        })}
      </div>

      <p className="mt-10 text-xs text-slate-600">
        Updated {new Date(article.updatedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
      </p>
    </article>
  );
}

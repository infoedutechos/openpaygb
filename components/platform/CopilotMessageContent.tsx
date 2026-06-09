"use client";

function openExternalUrl(url: string) {
  if (typeof window === "undefined") return;
  const tg = (
    window as unknown as {
      Telegram?: { WebApp?: { openLink?: (u: string, o?: { try_instant_view?: boolean }) => void } };
    }
  ).Telegram?.WebApp;
  if (tg?.openLink) {
    tg.openLink(url, { try_instant_view: false });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

type Segment =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "link"; label: string; href: string };

function parseSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) {
      segments.push({ type: "text", value: content.slice(last, m.index) });
    }
    const token = m[0];
    if (token.startsWith("**")) {
      segments.push({ type: "bold", value: token.slice(2, -2) });
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        segments.push({ type: "link", label: linkMatch[1], href: linkMatch[2] });
      } else {
        segments.push({ type: "text", value: token });
      }
    }
    last = m.index + token.length;
  }
  if (last < content.length) {
    segments.push({ type: "text", value: content.slice(last) });
  }
  return segments;
}

export function CopilotMessageContent({ content }: { content: string }) {
  const segments = parseSegments(content);
  return (
    <p className="whitespace-pre-wrap">
      {segments.map((seg, i) => {
        if (seg.type === "bold") {
          return (
            <strong key={i} className="font-semibold text-white">
              {seg.value}
            </strong>
          );
        }
        if (seg.type === "link") {
          const href = seg.href;
          const external = href.startsWith("http");
          if (external) {
            return (
              <button
                key={i}
                type="button"
                onClick={() => openExternalUrl(href)}
                className="text-sky-300 underline underline-offset-2 hover:text-sky-200 font-medium"
              >
                {seg.label}
              </button>
            );
          }
          return (
            <a
              key={i}
              href={href}
              className="text-sky-300 underline underline-offset-2 hover:text-sky-200 font-medium"
            >
              {seg.label}
            </a>
          );
        }
        return <span key={i}>{seg.value}</span>;
      })}
    </p>
  );
}

/** Resolve a watch / shorts / youtu.be URL to a privacy-friendly embed URL, or null if invalid. */
export function youtubeEmbedUrlFromInput(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const urlStr = /^https?:\/\//i.test(s) ? s : `https://${s}`;
    const u = new URL(urlStr);
    let id: string | null = null;
    const host = u.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      id = u.pathname.replace(/^\//, '').split('/')[0] ?? null;
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      id = u.searchParams.get('v');
      const path = u.pathname;
      if (!id && path.startsWith('/embed/')) id = path.slice('/embed/'.length).split('/')[0] ?? null;
      if (!id && path.startsWith('/shorts/')) id = path.slice('/shorts/'.length).split('/')[0] ?? null;
      if (!id && path.startsWith('/live/')) id = path.slice('/live/'.length).split('/')[0] ?? null;
    }

    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    return `https://www.youtube-nocookie.com/embed/${id}`;
  } catch {
    return null;
  }
}

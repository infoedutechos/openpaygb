/**
 * @deprecated Use Prisma's `index-browser.js` via `next.config.ts` resolve aliases instead.
 * Kept so old absolute-path Turbopack configs do not break if referenced elsewhere.
 */
export class PrismaClient {
  constructor() {
    throw new Error("@prisma/client must not run in the browser");
  }
}

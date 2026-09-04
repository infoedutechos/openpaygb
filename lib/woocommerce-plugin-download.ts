import "server-only";

import fs from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import { ZipArchive } from "archiver";

export const WOOCOMMERCE_PLUGIN_DIR_REL = "integrations/woocommerce/odelhub-openpaygb";
export const WOOCOMMERCE_PLUGIN_ZIP_NAME = "odelhub-openpaygb.zip";

export type WooPluginDownloadPayload = {
  body: Buffer;
  contentType: string;
  filename: string;
};

function pluginRootAbs(): string {
  return path.join(process.cwd(), "integrations", "woocommerce", "odelhub-openpaygb");
}

/** List relative file paths inside the WooCommerce plugin folder (posix). */
export function listWooCommercePluginFiles(): string[] {
  const root = pluginRootAbs();
  if (!fs.existsSync(root)) return [];
  const out: string[] = [];
  function walk(dir: string) {
    for (const name of fs.readdirSync(dir)) {
      if (name === "." || name === "..") continue;
      const abs = path.join(dir, name);
      const st = fs.statSync(abs);
      if (st.isDirectory()) {
        walk(abs);
        continue;
      }
      out.push(path.relative(root, abs).replace(/\\/g, "/"));
    }
  }
  walk(root);
  return out.sort();
}

async function zipEntries(
  entries: Array<{ archivePath: string; content: Buffer }>,
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);

    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.on("error", reject);
    archive.pipe(stream);

    for (const entry of entries) {
      archive.append(entry.content, { name: entry.archivePath });
    }
    void archive.finalize();
  });
}

/** Build installable WordPress plugin zip (`odelhub-openpaygb/…` root folder). */
export async function buildWooCommercePluginZip(): Promise<WooPluginDownloadPayload> {
  const root = pluginRootAbs();
  if (!fs.existsSync(root)) {
    throw new Error(`WooCommerce plugin missing at ${WOOCOMMERCE_PLUGIN_DIR_REL}`);
  }
  const files = listWooCommercePluginFiles();
  if (files.length === 0) {
    throw new Error("WooCommerce plugin folder is empty");
  }
  const entries = files.map((rel) => ({
    archivePath: `odelhub-openpaygb/${rel}`,
    content: fs.readFileSync(path.join(root, rel)),
  }));
  const body = await zipEntries(entries);
  return {
    body,
    contentType: "application/zip",
    filename: WOOCOMMERCE_PLUGIN_ZIP_NAME,
  };
}

export function getWooCommercePluginMeta() {
  return {
    path: WOOCOMMERCE_PLUGIN_DIR_REL,
    downloadUrl: "/api/public/woocommerce-plugin",
    browseUrl: "/integrations/woocommerce/odelhub-openpaygb",
    files: listWooCommercePluginFiles(),
    pluginName: "OpenPayGB for WooCommerce",
    version: "1.0.0",
  };
}

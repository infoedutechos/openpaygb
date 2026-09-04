import { describe, expect, it } from "vitest";
import {
  buildWooCommercePluginZip,
  listWooCommercePluginFiles,
  WOOCOMMERCE_PLUGIN_DIR_REL,
} from "@/lib/woocommerce-plugin-download";

describe("woocommerce-plugin-download", () => {
  it("lists plugin PHP files from the repo package", () => {
    const files = listWooCommercePluginFiles();
    expect(files).toContain("odelhub-openpaygb.php");
    expect(files.some((f) => f.startsWith("includes/"))).toBe(true);
    expect(WOOCOMMERCE_PLUGIN_DIR_REL).toBe("integrations/woocommerce/odelhub-openpaygb");
  });

  it("builds an installable zip", async () => {
    const zip = await buildWooCommercePluginZip();
    expect(zip.filename).toBe("odelhub-openpaygb.zip");
    expect(zip.contentType).toBe("application/zip");
    expect(zip.body.length).toBeGreaterThan(500);
  });
});

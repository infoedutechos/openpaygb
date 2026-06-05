import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "v1:";

function encryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET?.trim() || "odelhub-dev-deployment-env-key";
  return createHash("sha256").update(`odelhub-deployment-env:${secret}`, "utf8").digest();
}

export function encryptDeploymentEnvValue(plaintext: string): string {
  const key = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${enc.toString("base64url")}`;
}

export function decryptDeploymentEnvValue(valueEnc: string): string {
  if (!valueEnc.startsWith(PREFIX)) throw new Error("Unsupported deployment env cipher version");
  const parts = valueEnc.slice(PREFIX.length).split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted deployment env value");
  const [ivB64, tagB64, dataB64] = parts;
  const key = encryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

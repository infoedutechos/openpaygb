import { describe, expect, it } from "vitest";
import {
  generateDeveloperCredentials,
  hashDeveloperClientSecret,
  isValidRedirectUri,
  slugifyDeveloperAppName,
} from "@/lib/developer-app";

describe("developer-app", () => {
  it("generates client credentials with odelhub_app prefix", () => {
    const creds = generateDeveloperCredentials();
    expect(creds.clientId.startsWith("odelhub_app_")).toBe(true);
    expect(creds.clientSecret).toContain(creds.clientId);
    expect(hashDeveloperClientSecret(creds.clientSecret)).toBe(creds.clientSecretHash);
  });

  it("validates redirect URIs", () => {
    expect(isValidRedirectUri("https://app.example.com/callback")).toBe(true);
    expect(isValidRedirectUri("http://localhost:3000/callback")).toBe(true);
    expect(isValidRedirectUri("http://evil.com/callback")).toBe(false);
  });

  it("slugifies app names", () => {
    expect(slugifyDeveloperAppName("My OPGB App")).toMatch(/^my-opgb-app-/);
  });
});

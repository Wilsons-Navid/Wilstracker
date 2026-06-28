import { describe, it, expect } from "vitest";
import { extractResumeText } from "@/lib/extract";

describe("extractResumeText", () => {
  it("returns null for an unsupported MIME type (e.g. legacy .doc)", async () => {
    const bytes = new TextEncoder().encode("plain text résumé");
    expect(await extractResumeText(bytes, "application/msword")).toBeNull();
  });

  it("returns null instead of throwing on a malformed PDF", async () => {
    const garbage = new Uint8Array([1, 2, 3, 4, 5]);
    expect(await extractResumeText(garbage, "application/pdf")).toBeNull();
  });

  it("returns null for empty input", async () => {
    expect(await extractResumeText(new Uint8Array(), "application/pdf")).toBeNull();
  });
});

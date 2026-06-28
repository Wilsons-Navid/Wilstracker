import { describe, it, expect } from "vitest";
import { validateResumeFile, validateAvatarFile } from "@/lib/uploads";

// validateResumeFile / validateAvatarFile only read `.size` and `.type`, so a
// minimal object cast to File is enough and avoids allocating real megabytes.
function fakeFile(type: string, size: number): File {
  return { type, size } as unknown as File;
}

const MB = 1024 * 1024;

describe("validateResumeFile", () => {
  it("accepts PDF, DOC, and DOCX within the size limit", () => {
    expect(validateResumeFile(fakeFile("application/pdf", MB))).toBeNull();
    expect(validateResumeFile(fakeFile("application/msword", MB))).toBeNull();
    expect(
      validateResumeFile(
        fakeFile(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          MB,
        ),
      ),
    ).toBeNull();
  });

  it("rejects a file over 5MB", () => {
    expect(validateResumeFile(fakeFile("application/pdf", 6 * MB))).toMatch(
      /too large/i,
    );
  });

  it("rejects an unsupported type", () => {
    expect(validateResumeFile(fakeFile("image/png", MB))).toMatch(
      /PDF, DOC, or DOCX/i,
    );
  });
});

describe("validateAvatarFile", () => {
  it("accepts common image types within the size limit", () => {
    for (const t of ["image/png", "image/jpeg", "image/webp", "image/gif"]) {
      expect(validateAvatarFile(fakeFile(t, MB))).toBeNull();
    }
  });

  it("rejects a file over 2MB", () => {
    expect(validateAvatarFile(fakeFile("image/png", 3 * MB))).toMatch(
      /too large/i,
    );
  });

  it("rejects a non-image type (e.g. a PDF)", () => {
    expect(validateAvatarFile(fakeFile("application/pdf", MB))).toMatch(
      /PNG, JPG, WEBP, or GIF/i,
    );
  });
});

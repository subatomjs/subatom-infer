/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */

import { describe, it, expect } from "vitest";
import {
  FilesSchema,
  type UploadFileOptions,
  type FilesCheck,
} from "../../../src/schemas/files/files.js";
import { ValidationError } from "../../../src/core/error.js";

describe("FilesSchema Unit Tests (100% Coverage)", () => {
  const createValidFile = (
    overrides: Partial<UploadFileOptions> = {},
  ): UploadFileOptions => ({
    filename: "document.pdf",
    encoding: "7bit",
    mimetype: "application/pdf",
    storageType: "memory",
    size: 2048,
    ...overrides,
  });

  // ==========================================
  // Constructor & Default Instantiation
  // ==========================================
  describe("Constructor & Instantiation", () => {
    it("instantiates with empty checks by default and freezes the checks array", () => {
      const schema = new FilesSchema();
      expect(schema.checks).toEqual([]);
      expect(Object.isFrozen(schema.checks)).toBe(true);
    });

    it("instantiates with provided checks and freezes the checks array", () => {
      const customCheck: FilesCheck = {
        kind: "custom",
        validate: () => true,
        message: "custom validation",
      };
      const schema = new FilesSchema([customCheck]);
      expect(schema.checks).toHaveLength(1);
      expect(schema.checks[0]).toBe(customCheck);
      expect(Object.isFrozen(schema.checks)).toBe(true);
    });
  });

  // ==========================================
  // Array Input & isUploadFile Validation
  // ==========================================
  describe("Array Input & isUploadFile Validation", () => {
    it("accepts a valid array of UploadFileOptions", () => {
      const schema = new FilesSchema();
      const files = [
        createValidFile(),
        createValidFile({ filename: "image.png", mimetype: "image/png" }),
      ];
      expect(schema.parse(files)).toEqual(files);
    });

    it("rejects non-array inputs with correct received type reporting", () => {
      const schema = new FilesSchema();

      const nullRes = schema.safeParse(null);
      expect(nullRes.success).toBe(false);
      if (!nullRes.success) {
        expect(nullRes.issues[0]?.code).toBe("invalid_type");
        expect((nullRes.issues[0] as any)?.received).toBe("null");
        expect(nullRes.issues[0]?.message).toBe("Expected an array of uploaded files");
      }

      const strRes = schema.safeParse("not-an-array");
      expect(strRes.success).toBe(false);
      if (!strRes.success) {
        expect(strRes.issues[0]?.code).toBe("invalid_type");
        expect((strRes.issues[0] as any)?.received).toBe("string");
      }
    });

    it("rejects invalid item structures and tracks index path", () => {
      const schema = new FilesSchema();
      const invalidArray = [createValidFile(), "not-a-file", null, {}];

      const safe = schema.safeParse(invalidArray);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues).toHaveLength(3);
        expect(safe.issues[0]?.path).toEqual([1]);
        expect(safe.issues[1]?.path).toEqual([2]);
        expect(safe.issues[2]?.path).toEqual([3]);
        expect((safe.issues[0] as any)?.received).toBe("string");
        expect((safe.issues[1] as any)?.received).toBe("null");
        expect((safe.issues[2] as any)?.received).toBe("object");
      }
    });

    it("accepts full valid UploadFileOptions with all optional properties", async () => {
      const schema = new FilesSchema();
      const fullFile: UploadFileOptions = {
        filename: "test.txt",
        encoding: "utf-8",
        mimetype: "text/plain",
        storageType: "disk",
        size: 512,
        path: "/var/tmp/test.txt",
        destroyed: false,
        bufferContent: Buffer.from("data"),
        buffer: async () => Buffer.from("data"),
        stream: () => ({}),
        destroy: async () => {},
      };
      expect(schema.parse([fullFile])).toEqual([fullFile]);
    });

    it("rejects invalid required properties in array elements", () => {
      const schema = new FilesSchema();

      expect(schema.safeParse([{ ...createValidFile(), filename: "" }]).success).toBe(false);
      expect(schema.safeParse([{ ...createValidFile(), filename: 123 }]).success).toBe(false);
      expect(schema.safeParse([{ ...createValidFile(), encoding: 123 }]).success).toBe(false);
      expect(schema.safeParse([{ ...createValidFile(), mimetype: "" }]).success).toBe(false);
      expect(schema.safeParse([{ ...createValidFile(), mimetype: 123 }]).success).toBe(false);
      expect(schema.safeParse([{ ...createValidFile(), storageType: "cloud" }]).success).toBe(false);
    });

    it("rejects invalid optional properties in array elements", () => {
      const schema = new FilesSchema();

      expect(schema.safeParse([{ ...createValidFile(), size: "100" }]).success).toBe(false);
      expect(schema.safeParse([{ ...createValidFile(), size: Number.POSITIVE_INFINITY }]).success).toBe(false);
      expect(schema.safeParse([{ ...createValidFile(), size: 1.5 }]).success).toBe(false);
      expect(schema.safeParse([{ ...createValidFile(), size: -1 }]).success).toBe(false);

      expect(schema.safeParse([{ ...createValidFile(), path: "" }]).success).toBe(false);
      expect(schema.safeParse([{ ...createValidFile(), path: 123 }]).success).toBe(false);

      expect(schema.safeParse([{ ...createValidFile(), destroyed: "true" }]).success).toBe(false);
      expect(schema.safeParse([{ ...createValidFile(), bufferContent: "raw" }]).success).toBe(false);
      expect(schema.safeParse([{ ...createValidFile(), buffer: "not-fn" }]).success).toBe(false);
      expect(schema.safeParse([{ ...createValidFile(), stream: "not-fn" }]).success).toBe(false);
      expect(schema.safeParse([{ ...createValidFile(), destroy: "not-fn" }]).success).toBe(false);
    });
  });

  // ==========================================
  // Array Count Checks (.min(), .max(), .length())
  // ==========================================
  describe("Count Checks (.min(), .max(), .length())", () => {
    it("validates min file count with singular and plural formatting", () => {
      const schemaOne = new FilesSchema().min(1);
      expect(schemaOne.parse([createValidFile()])).toBeDefined();

      const failOne = schemaOne.safeParse([]);
      expect(failOne.success).toBe(false);
      if (!failOne.success) {
        expect(failOne.issues[0]?.code).toBe("too_small");
        expect((failOne.issues[0] as any)?.minimum).toBe(1);
        expect(failOne.issues[0]?.message).toBe("At least 1 file required");
      }

      const schemaTwo = new FilesSchema().min(2);
      const failTwo = schemaTwo.safeParse([createValidFile()]);
      expect(failTwo.success).toBe(false);
      if (!failTwo.success) {
        expect(failTwo.issues[0]?.message).toBe("At least 2 files required");
      }
    });

    it("supports custom error message on .min()", () => {
      const schema = new FilesSchema().min(2, "Upload at least two files");
      const safe = schema.safeParse([createValidFile()]);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe("Upload at least two files");
      }
    });

    it("validates max file count with singular, plural, and custom formatting", () => {
      const schemaOne = new FilesSchema().max(1);
      expect(schemaOne.parse([createValidFile()])).toBeDefined();

      const failOne = schemaOne.safeParse([createValidFile(), createValidFile()]);
      expect(failOne.success).toBe(false);
      if (!failOne.success) {
        expect(failOne.issues[0]?.code).toBe("too_big");
        expect((failOne.issues[0] as any)?.maximum).toBe(1);
        expect(failOne.issues[0]?.message).toBe("No more than 1 file allowed");
      }

      const schemaTwo = new FilesSchema().max(2);
      const failTwo = schemaTwo.safeParse([createValidFile(), createValidFile(), createValidFile()]);
      expect(failTwo.success).toBe(false);
      if (!failTwo.success) {
        expect(failTwo.issues[0]?.message).toBe("No more than 2 files allowed");
      }

      const customSchema = new FilesSchema().max(1, "Only single upload permitted");
      const failCustom = customSchema.safeParse([createValidFile(), createValidFile()]);
      expect(failCustom.success).toBe(false);
      if (!failCustom.success) {
        expect(failCustom.issues[0]?.message).toBe("Only single upload permitted");
      }
    });

    it("validates length with singular, plural, and custom formatting", () => {
      const schemaOne = new FilesSchema().length(1);
      expect(schemaOne.parse([createValidFile()])).toBeDefined();

      const failOne = schemaOne.safeParse([]);
      expect(failOne.success).toBe(false);
      if (!failOne.success) {
        expect(failOne.issues[0]?.code).toBe("invalid_value");
        expect((failOne.issues[0] as any)?.expected).toBe(1);
        expect((failOne.issues[0] as any)?.received).toBe(0);
        expect(failOne.issues[0]?.message).toBe("Exactly 1 file required");
      }

      const schemaThree = new FilesSchema().length(3);
      const failThree = schemaThree.safeParse([createValidFile()]);
      expect(failThree.success).toBe(false);
      if (!failThree.success) {
        expect(failThree.issues[0]?.message).toBe("Exactly 3 files required");
      }

      const customSchema = new FilesSchema().length(2, "Must upload exactly 2 files");
      const failCustom = customSchema.safeParse([createValidFile()]);
      expect(failCustom.success).toBe(false);
      if (!failCustom.success) {
        expect(failCustom.issues[0]?.message).toBe("Must upload exactly 2 files");
      }
    });

    it("throws TypeError on invalid count passed to min, max, or length", () => {
      expect(() => new FilesSchema().min(-1)).toThrowError(TypeError);
      expect(() => new FilesSchema().min(1.5)).toThrowError(TypeError);
      expect(() => new FilesSchema().max(-1)).toThrowError(TypeError);
      expect(() => new FilesSchema().max(NaN)).toThrowError(TypeError);
      expect(() => new FilesSchema().length(-1)).toThrowError(TypeError);
      expect(() => new FilesSchema().length(2.3)).toThrowError(TypeError);
    });
  });

  // ==========================================
  // Individual File Size Checks (.minEach(), .maxEach())
  // ==========================================
  describe("Size Checks (.minEach(), .maxEach())", () => {
    it("validates minEach and reports index path on violation", () => {
      const schema = new FilesSchema().minEach(1000);
      const files = [
        createValidFile({ size: 1500 }),
        createValidFile({ size: 500 }),
        createValidFile({ size: 2000 }),
      ];

      const safe = schema.safeParse(files);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues).toHaveLength(1);
        expect(safe.issues[0]?.code).toBe("too_small");
        expect((safe.issues[0] as any)?.minimum).toBe(1000);
        expect(safe.issues[0]?.path).toEqual([1]);
        expect(safe.issues[0]?.message).toBe("Each file must be at least 1000 bytes");
      }
    });

    it("validates maxEach and reports index path on violation", () => {
      const schema = new FilesSchema().maxEach(2048);
      const files = [
        createValidFile({ size: 1024 }),
        createValidFile({ size: 4096 }),
      ];

      const safe = schema.safeParse(files);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues).toHaveLength(1);
        expect(safe.issues[0]?.code).toBe("too_big");
        expect((safe.issues[0] as any)?.maximum).toBe(2048);
        expect(safe.issues[0]?.path).toEqual([1]);
        expect(safe.issues[0]?.message).toBe("Each file must not exceed 2 KB");
      }
    });

    it("supports custom error message on minEach and maxEach", () => {
      const schemaMin = new FilesSchema().minEach(500, "File too small");
      const safeMin = schemaMin.safeParse([createValidFile({ size: 100 })]);
      expect(safeMin.success).toBe(false);
      if (!safeMin.success) {
        expect(safeMin.issues[0]?.message).toBe("File too small");
      }

      const schemaMax = new FilesSchema().maxEach(500, "File too big");
      const safeMax = schemaMax.safeParse([createValidFile({ size: 1000 })]);
      expect(safeMax.success).toBe(false);
      if (!safeMax.success) {
        expect(safeMax.issues[0]?.message).toBe("File too big");
      }
    });

    it("exercises all formatBytes branches in byte limits", () => {
      const byteSchema = new FilesSchema().maxEach(500);
      const safeBytes = byteSchema.safeParse([createValidFile({ size: 600 })]);
      expect(safeBytes.success).toBe(false);
      if (!safeBytes.success) {
        expect(safeBytes.issues[0]?.message).toBe("Each file must not exceed 500 bytes");
      }

      const kbSchema = new FilesSchema().maxEach(1024 * 2);
      const safeKb = kbSchema.safeParse([createValidFile({ size: 1024 * 3 })]);
      expect(safeKb.success).toBe(false);
      if (!safeKb.success) {
        expect(safeKb.issues[0]?.message).toBe("Each file must not exceed 2 KB");
      }

      const mbSchema = new FilesSchema().maxEach(1024 * 1024 * 2);
      const safeMb = mbSchema.safeParse([createValidFile({ size: 1024 * 1024 * 3 })]);
      expect(safeMb.success).toBe(false);
      if (!safeMb.success) {
        expect(safeMb.issues[0]?.message).toBe("Each file must not exceed 2 MB");
      }

      const gbSchema = new FilesSchema().maxEach(1024 * 1024 * 1024 * 2);
      const safeGb = gbSchema.safeParse([createValidFile({ size: 1024 * 1024 * 1024 * 3 })]);
      expect(safeGb.success).toBe(false);
      if (!safeGb.success) {
        expect(safeGb.issues[0]?.message).toBe("Each file must not exceed 2 GB");
      }
    });

    it("throws TypeError on invalid byte limit", () => {
      expect(() => new FilesSchema().minEach(-1)).toThrowError(TypeError);
      expect(() => new FilesSchema().minEach(1.5)).toThrowError(TypeError);
      expect(() => new FilesSchema().maxEach(-10)).toThrowError(TypeError);
      expect(() => new FilesSchema().maxEach(NaN)).toThrowError(TypeError);
    });
  });

  // ==========================================
  // MIME Type Checks (.mime())
  // ==========================================
  describe("MIME Type Checks (.mime())", () => {
    it("validates exact matches, wildcards, trimming, and array of types", () => {
      const schema = new FilesSchema().mime([" image/png ", "image/jpeg", "image/png"]);
      const validFiles = [
        createValidFile({ mimetype: "image/png" }),
        createValidFile({ mimetype: "IMAGE/JPEG" }),
      ];
      expect(schema.parse(validFiles)).toEqual(validFiles);

      const wildcardSchema = new FilesSchema().mime(["image/*", "*/*"]);
      expect(wildcardSchema.parse([createValidFile({ mimetype: "image/webp" })])).toBeDefined();
      expect(wildcardSchema.parse([createValidFile({ mimetype: "application/json" })])).toBeDefined();
    });

    it("identifies invalid MIME types with index path and error message", () => {
      const schema = new FilesSchema().mime("image/png");
      const files = [
        createValidFile({ mimetype: "image/png" }),
        createValidFile({ mimetype: "application/pdf" }),
      ];

      const safe = schema.safeParse(files);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues).toHaveLength(1);
        expect(safe.issues[0]?.code).toBe("invalid_value");
        expect(safe.issues[0]?.path).toEqual([1]);
        expect((safe.issues[0] as any)?.received).toBe("application/pdf");
        expect(safe.issues[0]?.message).toBe("All files must match one of: image/png");
      }
    });

    it("supports custom error message on .mime()", () => {
      const schema = new FilesSchema().mime("image/png", "Custom MIME error");
      const safe = schema.safeParse([createValidFile({ mimetype: "application/pdf" })]);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe("Custom MIME error");
      }
    });

    it("throws TypeError on empty or invalid MIME parameters", () => {
      expect(() => new FilesSchema().mime([])).toThrowError(TypeError);
      expect(() => new FilesSchema().mime("")).toThrowError(TypeError);
      expect(() => new FilesSchema().mime("   ")).toThrowError(TypeError);
      // @ts-expect-error Testing invalid runtime input
      expect(() => new FilesSchema().mime([123])).toThrowError(TypeError);
    });
  });

  // ==========================================
  // Extension Checks (.extension())
  // ==========================================
  describe("Extension Checks (.extension())", () => {
    it("validates extensions with dots stripped, lowercase normalization, and array input", () => {
      const schema = new FilesSchema().extension([".pdf", " PNG ", "pdf"]);
      const validFiles = [
        createValidFile({ filename: "report.pdf" }),
        createValidFile({ filename: "photo.PNG" }),
      ];
      expect(schema.parse(validFiles)).toEqual(validFiles);
    });

    it("identifies invalid extensions, files without extension, or dot at end", () => {
      const schema = new FilesSchema().extension("pdf");
      const files = [
        createValidFile({ filename: "valid.pdf" }),
        createValidFile({ filename: "no-extension" }),
        createValidFile({ filename: "trailing-dot." }),
        createValidFile({ filename: ".hidden" }),
        createValidFile({ filename: "wrong.jpg" }),
      ];

      const safe = schema.safeParse(files);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues).toHaveLength(4);
        expect(safe.issues[0]?.path).toEqual([1]);
        expect((safe.issues[0] as any)?.received).toBe("no-extension");
        expect(safe.issues[0]?.message).toBe(
          "All files must have one of these extensions: .pdf",
        );
      }
    });

    it("supports custom error message on .extension()", () => {
      const schema = new FilesSchema().extension("pdf", "Only PDF allowed");
      const safe = schema.safeParse([createValidFile({ filename: "doc.txt" })]);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe("Only PDF allowed");
      }
    });

    it("throws TypeError on empty or invalid extension parameters", () => {
      expect(() => new FilesSchema().extension([])).toThrowError(TypeError);
      expect(() => new FilesSchema().extension("")).toThrowError(TypeError);
      expect(() => new FilesSchema().extension("   ")).toThrowError(TypeError);
      // @ts-expect-error Testing invalid runtime input
      expect(() => new FilesSchema().extension([123])).toThrowError(TypeError);
    });
  });

  // ==========================================
  // Storage Type Checks (.storage())
  // ==========================================
  describe("Storage Checks (.storage())", () => {
    it("validates storage type and reports error with index path", () => {
      const schema = new FilesSchema().storage("disk");
      const files = [
        createValidFile({ storageType: "disk" }),
        createValidFile({ storageType: "memory" }),
      ];

      const safe = schema.safeParse(files);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues).toHaveLength(1);
        expect(safe.issues[0]?.code).toBe("invalid_value");
        expect(safe.issues[0]?.path).toEqual([1]);
        expect((safe.issues[0] as any)?.received).toBe("memory");
        expect((safe.issues[0] as any)?.expected).toBe("disk");
        expect(safe.issues[0]?.message).toBe('All files must use "disk" storage');
      }
    });

    it("supports custom error message on .storage()", () => {
      const schema = new FilesSchema().storage("memory", "Must be memory");
      const safe = schema.safeParse([createValidFile({ storageType: "disk" })]);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe("Must be memory");
      }
    });
  });

  // ==========================================
  // Custom Check & Fallback
  // ==========================================
  describe("Custom Checks & Fallback Branches", () => {
    it("triggers default branch in addCheckIssue", () => {
      const customCheck: FilesCheck = {
        kind: "unknown_check",
        validate: () => false,
        message: "Custom check failed",
      };
      const schema = new FilesSchema([customCheck]);
      const files = [createValidFile()];

      const safe = schema.safeParse(files);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.code).toBe("invalid_value");
        expect((safe.issues[0] as any)?.received).toEqual(files);
        expect(safe.issues[0]?.message).toBe("Custom check failed");
      }
    });

    it("throws ValidationError on synchronous parse() when checks fail", () => {
      const schema = new FilesSchema().min(5).maxEach(10);
      expect(() => schema.parse([createValidFile()])).toThrowError(ValidationError);
    });
  });
});
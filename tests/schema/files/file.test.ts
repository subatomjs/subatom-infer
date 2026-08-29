/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */

import { describe, it, expect } from "vitest";
import {
  FileSchema,
  type UploadFileOptions,
  type FileCheck,
} from "../../../src/schemas/files/file.js";
import { ValidationError } from "../../../src/core/error.js";

describe("FileSchema Unit Tests (100% Coverage)", () => {
  const createValidFile = (
    overrides: Partial<UploadFileOptions> = {},
  ): UploadFileOptions => ({
    filename: "avatar.png",
    encoding: "7bit",
    mimetype: "image/png",
    storageType: "memory",
    size: 2048,
    ...overrides,
  });

  // ==========================================
  // Constructor & Default Instantiation
  // ==========================================
  describe("Constructor & Instantiation", () => {
    it("instantiates with empty checks by default and freezes the checks array", () => {
      const schema = new FileSchema();
      expect(schema.checks).toEqual([]);
      expect(Object.isFrozen(schema.checks)).toBe(true);
    });

    it("instantiates with provided checks and freezes the checks array", () => {
      const customCheck: FileCheck = {
        kind: "custom",
        validate: () => true,
        message: "custom validation",
      };
      const schema = new FileSchema([customCheck]);
      expect(schema.checks).toHaveLength(1);
      expect(schema.checks[0]).toBe(customCheck);
      expect(Object.isFrozen(schema.checks)).toBe(true);
    });
  });

  // ==========================================
  // isUploadFile & Type Predicate Edge Cases
  // ==========================================
  describe("isUploadFile Validation & Predicates", () => {
    it("accepts a minimal valid UploadFileOptions object", () => {
      const schema = new FileSchema();
      const file: UploadFileOptions = {
        filename: "test.txt",
        encoding: "utf-8",
        mimetype: "text/plain",
        storageType: "disk",
      };
      expect(schema.parse(file)).toEqual(file);
    });

    it("accepts a full valid UploadFileOptions object with all optional fields", async () => {
      const schema = new FileSchema();
      const file: UploadFileOptions = {
        filename: "test.txt",
        encoding: "utf-8",
        mimetype: "text/plain",
        storageType: "memory",
        size: 512,
        path: "/tmp/test.txt",
        destroyed: false,
        bufferContent: Buffer.from("hello"),
        buffer: async () => Buffer.from("hello"),
        stream: () => ({}),
        destroy: async () => {},
      };
      expect(schema.parse(file)).toEqual(file);
    });

    it("rejects non-object and null values with correct received type reporting", () => {
      const schema = new FileSchema();

      const nullRes = schema.safeParse(null);
      expect(nullRes.success).toBe(false);
      if (!nullRes.success) {
        expect(nullRes.issues[0]?.code).toBe("invalid_type");
        expect((nullRes.issues[0] as any)?.received).toBe("null");
      }

      const arrRes = schema.safeParse(["not-a-file"]);
      expect(arrRes.success).toBe(false);
      if (!arrRes.success) {
        expect(arrRes.issues[0]?.code).toBe("invalid_type");
        expect((arrRes.issues[0] as any)?.received).toBe("array");
      }

      const strRes = schema.safeParse("string-input");
      expect(strRes.success).toBe(false);
      if (!strRes.success) {
        expect(strRes.issues[0]?.code).toBe("invalid_type");
        expect((strRes.issues[0] as any)?.received).toBe("string");
      }
    });

    it("rejects invalid required fields (filename, encoding, mimetype, storageType)", () => {
      const schema = new FileSchema();

      expect(schema.safeParse({ ...createValidFile(), filename: "" }).success).toBe(false);
      expect(schema.safeParse({ ...createValidFile(), filename: 123 }).success).toBe(false);

      expect(schema.safeParse({ ...createValidFile(), encoding: 123 }).success).toBe(false);

      expect(schema.safeParse({ ...createValidFile(), mimetype: "" }).success).toBe(false);
      expect(schema.safeParse({ ...createValidFile(), mimetype: 123 }).success).toBe(false);

      expect(schema.safeParse({ ...createValidFile(), storageType: "cloud" }).success).toBe(false);
    });

    it("rejects invalid optional fields when present with incorrect types", () => {
      const schema = new FileSchema();

      expect(schema.safeParse({ ...createValidFile(), size: "100" }).success).toBe(false);
      expect(schema.safeParse({ ...createValidFile(), size: Number.POSITIVE_INFINITY }).success).toBe(false);
      expect(schema.safeParse({ ...createValidFile(), size: -5 }).success).toBe(false);

      expect(schema.safeParse({ ...createValidFile(), path: 123 }).success).toBe(false);

      expect(schema.safeParse({ ...createValidFile(), destroyed: "true" }).success).toBe(false);

      expect(schema.safeParse({ ...createValidFile(), bufferContent: "not-a-buffer" }).success).toBe(false);

      expect(schema.safeParse({ ...createValidFile(), buffer: "not-a-fn" }).success).toBe(false);

      expect(schema.safeParse({ ...createValidFile(), stream: "not-a-fn" }).success).toBe(false);

      expect(schema.safeParse({ ...createValidFile(), destroy: "not-a-fn" }).success).toBe(false);
    });
  });

  // ==========================================
  // Size Validations (min & max)
  // ==========================================
  describe("Size Checks (.min() & .max())", () => {
    it("validates size >= minBytes and formats bytes accurately", () => {
      const schema = new FileSchema().min(500);
      expect(schema.parse(createValidFile({ size: 500 }))).toBeDefined();
      expect(schema.parse(createValidFile({ size: 1000 }))).toBeDefined();

      const failSmall = schema.safeParse(createValidFile({ size: 400 }));
      expect(failSmall.success).toBe(false);
      if (!failSmall.success) {
        expect(failSmall.issues[0]?.code).toBe("too_small");
        expect((failSmall.issues[0] as any)?.received).toBe(400);
        expect((failSmall.issues[0] as any)?.expected).toBe(500);
        expect(failSmall.issues[0]?.message).toBe("File size must be at least 500 bytes");
      }

      const failUndefined = schema.safeParse(createValidFile({ size: undefined }));
      expect(failUndefined.success).toBe(false);
    });

    it("supports custom error message on .min()", () => {
      const schema = new FileSchema().min(100, "Custom min size error");
      const safe = schema.safeParse(createValidFile({ size: 10 }));
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe("Custom min size error");
      }
    });

    it("validates size <= maxBytes and formats bytes accurately", () => {
      const schema = new FileSchema().max(2048);
      expect(schema.parse(createValidFile({ size: 2048 }))).toBeDefined();
      expect(schema.parse(createValidFile({ size: 100 }))).toBeDefined();

      const failLarge = schema.safeParse(createValidFile({ size: 3000 }));
      expect(failLarge.success).toBe(false);
      if (!failLarge.success) {
        expect(failLarge.issues[0]?.code).toBe("too_big");
        expect((failLarge.issues[0] as any)?.received).toBe(3000);
        expect((failLarge.issues[0] as any)?.expected).toBe(2048);
        expect(failLarge.issues[0]?.message).toBe("File size must not exceed 2.00 KB");
      }

      const failUndefined = schema.safeParse(createValidFile({ size: undefined }));
      expect(failUndefined.success).toBe(false);
    });

    it("supports custom error message on .max()", () => {
      const schema = new FileSchema().max(100, "Custom max size error");
      const safe = schema.safeParse(createValidFile({ size: 200 }));
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe("Custom max size error");
      }
    });

    it("exercises all formatBytes branches (bytes, KB, MB, GB)", () => {
      const bytesSchema = new FileSchema().min(500);
      const resBytes = bytesSchema.safeParse(createValidFile({ size: 10 }));
      expect(resBytes.success).toBe(false);
      if (!resBytes.success) {
        expect(resBytes.issues[0]?.message).toBe("File size must be at least 500 bytes");
      }

      const kbSchema = new FileSchema().min(1024 * 5);
      const resKb = kbSchema.safeParse(createValidFile({ size: 10 }));
      expect(resKb.success).toBe(false);
      if (!resKb.success) {
        expect(resKb.issues[0]?.message).toBe("File size must be at least 5.00 KB");
      }

      const mbSchema = new FileSchema().min(1024 * 1024 * 5);
      const resMb = mbSchema.safeParse(createValidFile({ size: 10 }));
      expect(resMb.success).toBe(false);
      if (!resMb.success) {
        expect(resMb.issues[0]?.message).toBe("File size must be at least 5.00 MB");
      }

      const gbSchema = new FileSchema().min(1024 * 1024 * 1024 * 2);
      const resGb = gbSchema.safeParse(createValidFile({ size: 10 }));
      expect(resGb.success).toBe(false);
      if (!resGb.success) {
        expect(resGb.issues[0]?.message).toBe("File size must be at least 2.00 GB");
      }
    });

    it("throws TypeError on invalid size parameter passed to min() or max()", () => {
      expect(() => new FileSchema().min(-1)).toThrowError(TypeError);
      expect(() => new FileSchema().min(1.5)).toThrowError(TypeError);
      expect(() => new FileSchema().min(NaN)).toThrowError(TypeError);

      expect(() => new FileSchema().max(-10)).toThrowError(TypeError);
      expect(() => new FileSchema().max(2.5)).toThrowError(TypeError);
    });
  });

  // ==========================================
  // MIME Type Checks
  // ==========================================
  describe("MIME Type Checks (.mime())", () => {
    it("validates exact match, wildcards, and wildcard subtypes", () => {
      const exactSchema = new FileSchema().mime("image/png");
      expect(exactSchema.parse(createValidFile({ mimetype: "image/png" }))).toBeDefined();
      expect(exactSchema.parse(createValidFile({ mimetype: "IMAGE/PNG" }))).toBeDefined();

      const wildcardAllSchema = new FileSchema().mime("*/*");
      expect(wildcardAllSchema.parse(createValidFile({ mimetype: "application/json" }))).toBeDefined();

      const wildcardSubSchema = new FileSchema().mime("image/*");
      expect(wildcardSubSchema.parse(createValidFile({ mimetype: "image/jpeg" }))).toBeDefined();
      expect(wildcardSubSchema.parse(createValidFile({ mimetype: "image/webp" }))).toBeDefined();
      expect(wildcardSubSchema.safeParse(createValidFile({ mimetype: "application/pdf" })).success).toBe(false);
    });

    it("supports array of MIME types with deduplication and trimming", () => {
      const schema = new FileSchema().mime([" image/png ", "application/pdf", "image/png"]);
      expect(schema.parse(createValidFile({ mimetype: "image/png" }))).toBeDefined();
      expect(schema.parse(createValidFile({ mimetype: "application/pdf" }))).toBeDefined();

      const fail = schema.safeParse(createValidFile({ mimetype: "text/plain" }));
      expect(fail.success).toBe(false);
      if (!fail.success) {
        expect(fail.issues[0]?.code).toBe("invalid_value");
        expect((fail.issues[0] as any)?.received).toBe("text/plain");
        expect(fail.issues[0]?.message).toBe(
          "File MIME type must be one of: image/png, application/pdf",
        );
      }
    });

    it("supports custom error message on .mime()", () => {
      const schema = new FileSchema().mime("image/png", "Custom MIME error");
      const safe = schema.safeParse(createValidFile({ mimetype: "application/json" }));
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe("Custom MIME error");
      }
    });

    it("throws TypeError on empty or invalid MIME inputs", () => {
      expect(() => new FileSchema().mime([])).toThrowError(TypeError);
      expect(() => new FileSchema().mime("")).toThrowError(TypeError);
      expect(() => new FileSchema().mime("   ")).toThrowError(TypeError);
      // @ts-expect-error Testing invalid runtime types
      expect(() => new FileSchema().mime([123])).toThrowError(TypeError);
    });
  });

  // ==========================================
  // Extension Checks
  // ==========================================
  describe("Extension Checks (.extension())", () => {
    it("validates file extension with single string and leading dots stripped", () => {
      const schema = new FileSchema().extension(".png");
      expect(schema.parse(createValidFile({ filename: "image.png" }))).toBeDefined();
      expect(schema.parse(createValidFile({ filename: "IMAGE.PNG" }))).toBeDefined();

      const fail = schema.safeParse(createValidFile({ filename: "document.pdf" }));
      expect(fail.success).toBe(false);
      if (!fail.success) {
        expect(fail.issues[0]?.code).toBe("invalid_value");
        expect((fail.issues[0] as any)?.received).toBe("document.pdf");
        expect(fail.issues[0]?.message).toBe("File extension must be one of: .png");
      }
    });

    it("handles filenames without dots or hidden files with leading dots (lastDot <= 0)", () => {
      const schema = new FileSchema().extension("png");
      expect(schema.safeParse(createValidFile({ filename: "no-extension" })).success).toBe(false);
      expect(schema.safeParse(createValidFile({ filename: ".gitignore" })).success).toBe(false);
    });

    it("supports array of extensions and custom error message", () => {
      const schema = new FileSchema().extension(
        [" .png ", "jpg", "png"],
        "Only image extensions allowed",
      );
      expect(schema.parse(createValidFile({ filename: "pic.jpg" }))).toBeDefined();
      expect(schema.parse(createValidFile({ filename: "pic.png" }))).toBeDefined();

      const fail = schema.safeParse(createValidFile({ filename: "doc.txt" }));
      expect(fail.success).toBe(false);
      if (!fail.success) {
        expect(fail.issues[0]?.message).toBe("Only image extensions allowed");
      }
    });

    it("throws TypeError on empty or invalid extension inputs", () => {
      expect(() => new FileSchema().extension([])).toThrowError(TypeError);
      expect(() => new FileSchema().extension("")).toThrowError(TypeError);
      expect(() => new FileSchema().extension("   ")).toThrowError(TypeError);
      // @ts-expect-error Testing invalid runtime types
      expect(() => new FileSchema().extension([123])).toThrowError(TypeError);
    });
  });

  // ==========================================
  // Storage Type Checks
  // ==========================================
  describe("Storage Checks (.storage())", () => {
    it("validates storageType matching memory or disk", () => {
      const memSchema = new FileSchema().storage("memory");
      expect(memSchema.parse(createValidFile({ storageType: "memory" }))).toBeDefined();

      const failMem = memSchema.safeParse(createValidFile({ storageType: "disk" }));
      expect(failMem.success).toBe(false);
      if (!failMem.success) {
        expect(failMem.issues[0]?.code).toBe("invalid_value");
        expect((failMem.issues[0] as any)?.received).toBe("disk");
        expect((failMem.issues[0] as any)?.expected).toBe("memory");
        expect(failMem.issues[0]?.message).toBe('File storage type must be "memory"');
      }

      const diskSchema = new FileSchema().storage("disk", "Must use disk");
      expect(diskSchema.parse(createValidFile({ storageType: "disk" }))).toBeDefined();
      const failDisk = diskSchema.safeParse(createValidFile({ storageType: "memory" }));
      expect(failDisk.success).toBe(false);
      if (!failDisk.success) {
        expect(failDisk.issues[0]?.message).toBe("Must use disk");
      }
    });
  });

  // ==========================================
  // Custom Checks & Fallbacks
  // ==========================================
  describe("Custom Check Kinds & Default Fallbacks", () => {
    it("triggers default branch in getIssueCode and getReceivedValue", () => {
      const customCheck: FileCheck = {
        kind: "custom_kind",
        validate: () => false,
        message: "Custom check failed",
        value: "expected_meta",
      };
      const schema = new FileSchema([customCheck]);
      const file = createValidFile();

      const safe = schema.safeParse(file);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.code).toBe("invalid_value");
        expect((safe.issues[0] as any)?.received).toEqual(file);
        expect((safe.issues[0] as any)?.expected).toBe("expected_meta");
        expect(safe.issues[0]?.message).toBe("Custom check failed");
      }
    });

    it("throws ValidationError on parse() when multiple checks fail", () => {
      const schema = new FileSchema()
        .min(5000)
        .max(1000)
        .mime("application/pdf")
        .extension("pdf")
        .storage("disk");

      const badFile = createValidFile({
        filename: "test.png",
        mimetype: "image/png",
        size: 3000,
        storageType: "memory",
      });

      expect(() => schema.parse(badFile)).toThrowError(ValidationError);
    });
  });
});
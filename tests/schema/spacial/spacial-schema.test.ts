import { describe, it, expect, expectTypeOf } from "vitest";
import {
  FunctionSchema,
  PromiseSchema,
  FileSchema,
  type FileValue,
  type FileCheck,
} from "../../../src/schemas/spacial/spacial-schema.js";
import { Schema } from "../../../src/core/schema.js";
import { addIssue, type ParseContext } from "../../../src/core/context.js";
import {
  makeSuccess,
  makeFailure,
  type DynamicParseReturnType,
  type ParseResult,
} from "../../../src/core/result.js";
import { ValidationError } from "../../../src/core/error.js";
import { TupleSchema } from "../../../src/schemas/composites/collections.js";

// --- Test Harness Concrete Helper Schemas ---

class SyncStringSchema extends Schema<string> {
  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<string> {
    if (typeof input === "string") {
      return makeSuccess(input);
    }
    addIssue(ctx, {
      code: "invalid_type",
      message: "Expected string",
      expected: "string",
      received: typeof input,
    });
    return makeFailure(ctx.issues);
  }
}

class SyncNumberSchema extends Schema<number> {
  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<number> {
    if (typeof input === "number") {
      return makeSuccess(input);
    }
    addIssue(ctx, {
      code: "invalid_type",
      message: "Expected number",
      expected: "number",
      received: typeof input,
    });
    return makeFailure(ctx.issues);
  }
}

class AsyncStringSchema extends Schema<string> {
  async _parse(input: unknown, ctx: ParseContext): Promise<ParseResult<string>> {
    await new Promise((resolve) => setTimeout(resolve, 2));
    if (typeof input === "string") {
      return makeSuccess(input.toUpperCase());
    }
    addIssue(ctx, {
      code: "invalid_type",
      message: "Expected string async",
      expected: "string",
      received: typeof input,
    });
    return makeFailure(ctx.issues);
  }
}

const syncString = new SyncStringSchema();
const syncNumber = new SyncNumberSchema();
const asyncString = new AsyncStringSchema();

describe("Special Schemas (spacial-schema.ts)", () => {
  // ==========================================
  // FunctionSchema
  // ==========================================
  describe("FunctionSchema", () => {
    const argsTuple = new TupleSchema([syncString, syncNumber] as const);
    const fnSchema = new FunctionSchema(argsTuple, syncString);

    describe("Constructor & Type Inference", () => {
      it("stores argsSchema and returnSchema properly", () => {
        expect(fnSchema.argsSchema).toBe(argsTuple);
        expect(fnSchema.returnSchema).toBe(syncString);
      });

      it("verifies static TypeScript output and input types", () => {
        expectTypeOf(fnSchema._output).toEqualTypeOf<
          (args_0: string, args_1: number) => string
        >();
      });
    });

    describe("Validation & Function Execution Wrapper", () => {
      it("parses and wraps a valid target function successfully", () => {
        const rawFn = (name: unknown, age: unknown) =>
          `${String(name)} is ${String(age)}`;
        const wrapped = fnSchema.parse(rawFn);

        expect(typeof wrapped).toBe("function");
        expect(wrapped("Alice", 30)).toBe("Alice is 30");
      });

      it("fails when the input is not a function", () => {
        const nonFunctions: unknown[] = ["not-a-fn", 123, null, undefined, {}, []];

        for (const input of nonFunctions) {
          const safe = fnSchema.safeParse(input);
          expect(safe.success).toBe(false);
          if (!safe.success) {
            expect(safe.error).toBeInstanceOf(ValidationError);
            const issue = safe.issues[0];
            expect(issue?.code).toBe("invalid_type");
            if (issue?.code === "invalid_type") {
              expect(issue.expected).toBe("function");
              expect(issue.received).toBe(typeof input);
              expect(issue.message).toBe(`Expected function, received ${typeof input}`);
            }
          }
        }
      });

      it("throws ValidationError when wrapped function is called with invalid arguments", () => {
        const rawFn = (name: unknown, age: unknown) =>
          `${String(name)} is ${String(age)}`;
        const wrapped = fnSchema.parse(rawFn);

        expect(() => {
          // @ts-expect-error Testing runtime parameter rejection with invalid argument types
          wrapped(12345, "invalid-age");
        }).toThrowError(ValidationError);
      });

      it("throws ValidationError when wrapped function return value violates returnSchema", () => {
        const invalidReturnFn = (_name: unknown, _age: unknown) => 99999;
        const wrapped = fnSchema.parse(invalidReturnFn);

        expect(() => {
          wrapped("Bob", 25);
        }).toThrowError(ValidationError);
      });
    });

    describe("Fluent Builders (.args() & .returns())", () => {
      it(".args() creates a new FunctionSchema with updated parameter tuple", () => {
        const updatedFnSchema = fnSchema.args(syncNumber, syncNumber);

        expect(updatedFnSchema).toBeInstanceOf(FunctionSchema);
        expect(updatedFnSchema.returnSchema).toBe(syncString);

        const addAsString = (a: unknown, b: unknown) => `${Number(a) + Number(b)}`;
        const wrapped = updatedFnSchema.parse(addAsString);

        expect(wrapped(10, 20)).toBe("30");
      });

      it(".returns() creates a new FunctionSchema with updated return schema", () => {
        const updatedFnSchema = fnSchema.returns(syncNumber);

        expect(updatedFnSchema).toBeInstanceOf(FunctionSchema);
        expect(updatedFnSchema.argsSchema).toBe(argsTuple);

        const computeLength = (name: unknown, age: unknown) =>
          String(name).length + Number(age);
        const wrapped = updatedFnSchema.parse(computeLength);

        expect(wrapped("Charlie", 10)).toBe(17);
      });
    });
  });

  // ==========================================
  // PromiseSchema
  // ==========================================
  describe("PromiseSchema", () => {
    const promiseStringSchema = new PromiseSchema(asyncString);

    describe("Constructor & Type Inference", () => {
      it("stores unwrapSchema reference properly", () => {
        expect(promiseStringSchema.unwrapSchema).toBe(asyncString);
      });

      it("verifies static TypeScript output and input types", () => {
        expectTypeOf(promiseStringSchema._output).toEqualTypeOf<Promise<string>>();
        expectTypeOf(promiseStringSchema._input).toEqualTypeOf<Promise<string>>();
      });
    });

    describe("unwrap()", () => {
      it("returns the underlying schema via unwrap()", () => {
        expect(promiseStringSchema.unwrap()).toBe(asyncString);
      });
    });

    describe("Validation & Resolution Wrapper", () => {
      it("parses a valid Promise and unwraps through unwrapSchema successfully", async () => {
        const inputPromise = Promise.resolve("hello promise");
        const wrappedPromise = promiseStringSchema.parse(inputPromise);

        expect(typeof wrappedPromise.then).toBe("function");
        const result = await wrappedPromise;
        expect(result).toBe("HELLO PROMISE");
      });

      it("fails when input is not a Promise instance / thenable", () => {
        const nonPromises: unknown[] = [
          "regular string",
          123,
          null,
          undefined,
          {},
          { then: "not a function" },
          [],
        ];

        for (const input of nonPromises) {
          const safe = promiseStringSchema.safeParse(input);
          expect(safe.success).toBe(false);
          if (!safe.success) {
            expect(safe.error).toBeInstanceOf(ValidationError);
            const issue = safe.issues[0];
            expect(issue?.code).toBe("invalid_type");
            if (issue?.code === "invalid_type") {
              expect(issue.expected).toBe("Promise");
              expect(issue.received).toBe(typeof input);
              expect(issue.message).toBe("Expected Promise instance");
            }
          }
        }
      });

      it("rejects with ValidationError when wrapped Promise resolves with invalid data", async () => {
        const inputPromise = Promise.resolve(12345);
        const wrappedPromise = promiseStringSchema.parse(inputPromise);

        await expect(wrappedPromise).rejects.toThrowError(ValidationError);
      });
    });
  });

  // ==========================================
  // FileSchema
  // ==========================================
  describe("FileSchema", () => {
    const baseFileSchema = new FileSchema();

    describe("Constructor & Type Inference", () => {
      it("initializes with an empty checks array by default and freezes it", () => {
        expect(baseFileSchema.checks).toEqual([]);
        expect(Object.isFrozen(baseFileSchema.checks)).toBe(true);
      });

      it("stores custom checks array when provided directly and freezes it", () => {
        const customCheck: FileCheck = {
          kind: "custom_check",
          validate: (f: FileValue) => f.size > 0,
          message: "File must not be empty",
        };
        const schema = new FileSchema([customCheck]);
        expect(schema.checks).toHaveLength(1);
        expect(schema.checks[0]).toBe(customCheck);
        expect(Object.isFrozen(schema.checks)).toBe(true);
      });

      it("verifies static TypeScript output and input types", () => {
        expectTypeOf(baseFileSchema._output).toEqualTypeOf<FileValue>();
        expectTypeOf(baseFileSchema._input).toEqualTypeOf<FileValue>();
      });
    });

    describe("Basic Structure Validation", () => {
      const validFile: FileValue = {
        name: "document.pdf",
        size: 1024,
        type: "application/pdf",
      };

      it("parses valid FileValue objects containing size and type properties", () => {
        expect(baseFileSchema.parse(validFile)).toEqual(validFile);
      });

      it("fails when input is null", () => {
        const safe = baseFileSchema.safeParse(null);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error).toBeInstanceOf(ValidationError);
          const issue = safe.issues[0];
          expect(issue?.code).toBe("invalid_type");
          if (issue?.code === "invalid_type") {
            expect(issue.expected).toBe("File | Blob");
            expect(issue.received).toBe("null");
            expect(issue.message).toBe("Expected File or Blob-like object");
          }
        }
      });

      it("fails when input is not an object or lacks size/type properties", () => {
        const invalidObjects: unknown[] = [
          "string",
          123,
          true,
          undefined,
          {},
          { size: 100 },
          { type: "image/png" },
        ];

        for (const input of invalidObjects) {
          const safe = baseFileSchema.safeParse(input);
          expect(safe.success).toBe(false);
          if (!safe.success) {
            const issue = safe.issues[0];
            expect(issue?.code).toBe("invalid_type");
            if (issue?.code === "invalid_type") {
              expect(issue.expected).toBe("File | Blob");
              expect(issue.received).toBe(typeof input);
              expect(issue.message).toBe("Expected File or Blob-like object");
            }
          }
        }
      });
    });

    describe("min()", () => {
      it("passes when file size is >= minBytes", () => {
        const schema = baseFileSchema.min(100);
        expect(schema.parse({ size: 100, type: "text/plain" })).toEqual({
          size: 100,
          type: "text/plain",
        });
        expect(schema.parse({ size: 200, type: "text/plain" })).toEqual({
          size: 200,
          type: "text/plain",
        });
      });

      it("fails with default error message when file size < minBytes", () => {
        const schema = baseFileSchema.min(500);
        const smallFile: FileValue = { size: 100, type: "text/plain" };
        const safe = schema.safeParse(smallFile);

        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.issues[0];
          expect(issue?.code).toBe("too_small");
          if (issue?.code === "too_small") {
            expect(issue.minimum).toBe(500);
            expect(issue.inclusive).toBe(true);
            expect(issue.origin).toBe("file");
            expect(issue.message).toBe("File must be >= 500 bytes");
          }
        }
      });

      it("fails with custom error message when provided", () => {
        const schema = baseFileSchema.min(1000, "File upload is too small");
        const safe = schema.safeParse({ size: 50, type: "text/plain" });

        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("File upload is too small");
        }
      });
    });

    describe("max()", () => {
      it("passes when file size is <= maxBytes", () => {
        const schema = baseFileSchema.max(5000);
        expect(schema.parse({ size: 5000, type: "image/png" })).toEqual({
          size: 5000,
          type: "image/png",
        });
        expect(schema.parse({ size: 1000, type: "image/png" })).toEqual({
          size: 1000,
          type: "image/png",
        });
      });

      it("fails with default error message when file size > maxBytes", () => {
        const schema = baseFileSchema.max(1024);
        const largeFile: FileValue = { size: 2048, type: "image/png" };
        const safe = schema.safeParse(largeFile);

        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.issues[0];
          expect(issue?.code).toBe("too_big");
          if (issue?.code === "too_big") {
            expect(issue.maximum).toBe(1024);
            expect(issue.inclusive).toBe(true);
            expect(issue.origin).toBe("file");
            expect(issue.message).toBe("File must be <= 1024 bytes");
          }
        }
      });

      it("fails with custom error message when provided", () => {
        const schema = baseFileSchema.max(2048, "File upload exceeds maximum 2KB limit");
        const safe = schema.safeParse({ size: 4096, type: "image/png" });

        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("File upload exceeds maximum 2KB limit");
        }
      });
    });

    describe("mime()", () => {
      it("validates single string MIME type with default message", () => {
        const schema = baseFileSchema.mime("image/jpeg");
        expect(schema.parse({ size: 100, type: "image/jpeg" })).toEqual({
          size: 100,
          type: "image/jpeg",
        });

        const safe = schema.safeParse({ size: 100, type: "image/png" });
        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.issues[0];
          expect(issue?.code).toBe("invalid_value");
          if (issue?.code === "invalid_value") {
            expect(issue.message).toBe("MIME type must be one of: image/jpeg");
          }
        }
      });

      it("validates multiple MIME types passed as array", () => {
        const schema = baseFileSchema.mime(["image/png", "image/webp"] as const);

        expect(schema.parse({ size: 100, type: "image/png" })).toEqual({
          size: 100,
          type: "image/png",
        });
        expect(schema.parse({ size: 100, type: "image/webp" })).toEqual({
          size: 100,
          type: "image/webp",
        });

        const safe = schema.safeParse({ size: 100, type: "image/gif" });
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe(
            "MIME type must be one of: image/png, image/webp"
          );
        }
      });

      it("fails with custom error message when provided", () => {
        const schema = baseFileSchema.mime("application/pdf", "Only PDF documents allowed");
        const safe = schema.safeParse({ size: 100, type: "text/html" });

        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Only PDF documents allowed");
        }
      });
    });

    describe("Custom File Checks & Fallbacks", () => {
      it("handles custom check kinds in _parse fallback branch", () => {
        const customCheckSchema = new FileSchema([
          {
            kind: "must_have_name",
            validate: (f: FileValue) => Boolean(f.name),
            message: "File must have a filename",
          },
        ]);

        const unnamedFile: FileValue = { size: 100, type: "text/plain" };
        const safe = customCheckSchema.safeParse(unnamedFile);

        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.issues[0];
          expect(issue?.code).toBe("invalid_value");
          if (issue?.code === "invalid_value") {
            expect(issue.received).toEqual(unnamedFile);
            expect(issue.message).toBe("File must have a filename");
          }
        }
      });
    });

    describe("Compound & Chained Validations", () => {
      it("accumulates multiple check failures on invalid file input", () => {
        const schema = baseFileSchema
          .min(1000)
          .max(5000)
          .mime("application/json");

        const badFile: FileValue = { size: 50, type: "text/plain" };
        const safe = schema.safeParse(badFile);

        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues).toHaveLength(2);
          expect(safe.issues[0]?.code).toBe("too_small");
          expect(safe.issues[0]?.message).toBe("File must be >= 1000 bytes");
          expect(safe.issues[1]?.code).toBe("invalid_value");
          expect(safe.issues[1]?.message).toBe(
            "MIME type must be one of: application/json"
          );
        }
      });

      it("passes when all chained file checks succeed", () => {
        const schema = baseFileSchema
          .min(500)
          .max(2000)
          .mime(["image/jpeg", "image/png"]);

        const validUploadedFile: FileValue = {
          name: "photo.jpg",
          size: 1500,
          type: "image/jpeg",
        };

        expect(schema.parse(validUploadedFile)).toEqual(validUploadedFile);
      });
    });
  });
});
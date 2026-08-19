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
  type DynamicParseReturnType,
  type AsyncParseReturnType,
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
    return { success: false, issues: ctx.issues };
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
    return { success: false, issues: ctx.issues };
  }
}

class AsyncStringSchema extends Schema<string> {
  async _parse(input: unknown, ctx: ParseContext): AsyncParseReturnType<string> {
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
    return { success: false, issues: ctx.issues };
  }
}

const syncString = new SyncStringSchema();
const syncNumber = new SyncNumberSchema();
const asyncString = new AsyncStringSchema();

describe("Special Schemas (Function, Promise, File)", () => {
  // ==========================================
  // FunctionSchema
  // ==========================================
  describe("FunctionSchema", () => {
    const argsTuple = new TupleSchema([syncString, syncNumber]);
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
        const rawFn = (name: unknown, age: unknown) => `${String(name)} is ${String(age)}`;
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
            const issue = safe.error.issues[0];
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
        const rawFn = (name: unknown, age: unknown) => `${String(name)} is ${String(age)}`;
        const wrapped = fnSchema.parse(rawFn);

        expect(() => {
          // @ts-expect-error Testing invalid runtime argument types
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
            const issue = safe.error.issues[0];
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
      it("initializes with an empty checks array by default", () => {
        expect(baseFileSchema.checks).toEqual([]);
      });

      it("stores custom checks array when provided directly", () => {
        const customCheck: FileCheck = {
          kind: "custom_check",
          validate: (f) => f.size > 0,
          message: "File must not be empty",
        };
        const schema = new FileSchema([customCheck]);
        expect(schema.checks).toHaveLength(1);
        expect(schema.checks[0]).toBe(customCheck);
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
          const issue = safe.error.issues[0];
          expect(issue?.code).toBe("invalid_type");
          if (issue?.code === "invalid_type") {
            expect(issue.expected).toBe("File | Blob");
            expect(issue.received).toBe("null");
            expect(issue.message).toBe("Expected File or Blob instance");
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
          { size: 100 }, // missing type
          { type: "image/png" }, // missing size
        ];

        for (const input of invalidObjects) {
          const safe = baseFileSchema.safeParse(input);
          expect(safe.success).toBe(false);
          if (!safe.success) {
            const issue = safe.error.issues[0];
            expect(issue?.code).toBe("invalid_type");
            if (issue?.code === "invalid_type") {
              expect(issue.expected).toBe("File | Blob");
              expect(issue.received).toBe(typeof input);
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
          const issue = safe.error.issues[0];
          expect(issue?.code).toBe("invalid_value");
          if (issue?.code === "invalid_value") {
            expect(issue.received).toEqual(smallFile);
            expect(issue.message).toBe("File must be >= 500 bytes");
          }
        }
      });

      it("fails with custom error message when provided", () => {
        const schema = baseFileSchema.min(1000, "File upload is too small");
        const safe = schema.safeParse({ size: 50, type: "text/plain" });

        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error.issues[0]?.message).toBe("File upload is too small");
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
          const issue = safe.error.issues[0];
          expect(issue?.code).toBe("invalid_value");
          if (issue?.code === "invalid_value") {
            expect(issue.received).toEqual(largeFile);
            expect(issue.message).toBe("File must be <= 1024 bytes");
          }
        }
      });

      it("fails with custom error message when provided", () => {
        const schema = baseFileSchema.max(2048, "File upload exceeds maximum 2KB limit");
        const safe = schema.safeParse({ size: 4096, type: "image/png" });

        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error.issues[0]?.message).toBe("File upload exceeds maximum 2KB limit");
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
          const issue = safe.error.issues[0];
          expect(issue?.code).toBe("invalid_value");
          if (issue?.code === "invalid_value") {
            expect(issue.message).toBe("MIME type must be image/jpeg");
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
          expect(safe.error.issues[0]?.message).toBe(
            "MIME type must be image/png, image/webp"
          );
        }
      });

      it("fails with custom error message when provided", () => {
        const schema = baseFileSchema.mime("application/pdf", "Only PDF documents allowed");
        const safe = schema.safeParse({ size: 100, type: "text/html" });

        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error.issues[0]?.message).toBe("Only PDF documents allowed");
        }
      });
    });

    describe("Compound & Chained Validations", () => {
      it("accumulates multiple check failures on invalid file input", () => {
        const schema = baseFileSchema
          .min(1000)
          .max(5000)
          .mime("application/json");

        // Size 50 violates min(1000), MIME text/plain violates application/json
        const badFile: FileValue = { size: 50, type: "text/plain" };
        const safe = schema.safeParse(badFile);

        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error.issues).toHaveLength(2);
          expect(safe.error.issues[0]?.message).toBe("File must be >= 1000 bytes");
          expect(safe.error.issues[1]?.message).toBe("MIME type must be application/json");
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
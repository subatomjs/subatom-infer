import { describe, it, expect, expectTypeOf } from "vitest";
import { OptionalSchema } from "../../../src/schemas/modifiers/optional.js";
import { Schema } from "../../../src/core/schema.js";
import { addIssue, type ParseContext } from "../../../src/core/context.js";
import {
  makeSuccess,
  makeFailure,
  type DynamicParseReturnType,
  type ParseResult,
} from "../../../src/core/result.js";
import { ValidationError } from "../../../src/core/error.js";

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

class AsyncNumberSchema extends Schema<number> {
  async _parse(input: unknown, ctx: ParseContext): Promise<ParseResult<number>> {
    await new Promise((resolve) => setTimeout(resolve, 2));
    if (typeof input === "number") {
      return makeSuccess(input * 3);
    }
    addIssue(ctx, {
      code: "invalid_type",
      message: "Expected number async",
      expected: "number",
      received: typeof input,
    });
    return makeFailure(ctx.issues);
  }
}

const syncString = new SyncStringSchema();
const asyncNumber = new AsyncNumberSchema();

describe("OptionalSchema (optional.ts)", () => {
  describe("Constructor & Type Inference", () => {
    it("stores innerSchema reference properly", () => {
      const schema = new OptionalSchema(syncString);
      expect(schema.innerSchema).toBe(syncString);
    });

    it("verifies static TypeScript output and input types with undefined", () => {
      const schema = new OptionalSchema(syncString);

      expectTypeOf(schema._output).toEqualTypeOf<string | undefined>();
      expectTypeOf(schema._input).toEqualTypeOf<string | undefined>();
    });
  });

  describe("Synchronous Parsing", () => {
    const schema = new OptionalSchema(syncString);

    it("successfully parses undefined input without invoking innerSchema", () => {
      const result = schema.parse(undefined);
      expect(result).toBeUndefined();
    });

    it("successfully parses valid non-undefined value through innerSchema", () => {
      const result = schema.parse("hello world");
      expect(result).toBe("hello world");
    });

    it("fails and propagates validation errors for invalid non-undefined input (null, number, etc.)", () => {
      const invalidInputs: unknown[] = [null, 12345, true, {}, []];

      for (const input of invalidInputs) {
        const safe = schema.safeParse(input);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error).toBeInstanceOf(ValidationError);
          const issue = safe.issues[0];
          expect(issue?.code).toBe("invalid_type");
          if (issue?.code === "invalid_type") {
            expect(issue.expected).toBe("string");
          }
        }
      }
    });

    it("throws ValidationError on failed synchronous parse() invocation", () => {
      expect(() => schema.parse(999)).toThrowError(ValidationError);
    });
  });

  describe("Asynchronous Parsing", () => {
    const asyncSchema = new OptionalSchema(asyncNumber);

    it("parses undefined input directly in parseAsync()", async () => {
      const result = await asyncSchema.parseAsync(undefined);
      expect(result).toBeUndefined();
    });

    it("parses valid non-undefined input through asynchronous innerSchema and wraps with makeSuccess", async () => {
      // asyncNumber multiplies input by 3: 10 * 3 = 30
      const result = await asyncSchema.parseAsync(10);
      expect(result).toBe(30);
    });

    it("propagates asynchronous innerSchema validation failures in safeParseAsync()", async () => {
      const safe = await asyncSchema.safeParseAsync("not_a_number");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error).toBeInstanceOf(ValidationError);
        const issue = safe.issues[0];
        expect(issue?.code).toBe("invalid_type");
        expect(issue?.message).toBe("Expected number async");
      }
    });

    it("rejects with ValidationError on failed async parseAsync()", async () => {
      await expect(asyncSchema.parseAsync(false)).rejects.toThrowError(ValidationError);
    });
  });

  describe("unwrap()", () => {
    it("unwraps and returns the original innerSchema", () => {
      const schema = new OptionalSchema(syncString);
      const unwrapped = schema.unwrap();

      expect(unwrapped).toBe(syncString);
      expect(unwrapped.parse("valid")).toBe("valid");
      expect(() => unwrapped.parse(undefined)).toThrowError(ValidationError);
    });
  });
});
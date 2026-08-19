import { describe, it, expect, expectTypeOf } from "vitest";
import { NullableSchema } from "../../../src/schemas/modifiers/nullable.js";
import { Schema } from "../../../src/core/schema-base.js";
import { addIssue, type ParseContext } from "../../../src/core/context.js";
import {
  makeSuccess,
  type DynamicParseReturnType,
  type AsyncParseReturnType,
} from "../../../src/core/result.js";
import { ValidationError } from "../../../src/core/error.js";

// --- Test Harness Helper Schemas ---

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

class AsyncNumberSchema extends Schema<number> {
  async _parse(input: unknown, ctx: ParseContext): AsyncParseReturnType<number> {
    await new Promise((resolve) => setTimeout(resolve, 2));
    if (typeof input === "number") {
      return makeSuccess(input * 2);
    }
    addIssue(ctx, {
      code: "invalid_type",
      message: "Expected number async",
      expected: "number",
      received: typeof input,
    });
    return { success: false, issues: ctx.issues };
  }
}

const syncString = new SyncStringSchema();
const asyncNumber = new AsyncNumberSchema();

describe("NullableSchema", () => {
  describe("Constructor & Static Type Inference", () => {
    it("stores innerSchema reference properly", () => {
      const schema = new NullableSchema(syncString);
      expect(schema.innerSchema).toBe(syncString);
    });

    it("verifies static TypeScript output and input types with null", () => {
      const schema = new NullableSchema(syncString);

      expectTypeOf(schema._output).toEqualTypeOf<string | null>();
      expectTypeOf(schema._input).toEqualTypeOf<string | null>();
    });
  });

  describe("Synchronous Parsing", () => {
    const schema = new NullableSchema(syncString);

    it("successfully parses null input without calling innerSchema", () => {
      const result = schema.parse(null);
      expect(result).toBeNull();
    });

    it("successfully parses valid non-null value through innerSchema", () => {
      const result = schema.parse("hello world");
      expect(result).toBe("hello world");
    });

    it("fails and propagates validation errors for invalid non-null input (undefined, number, etc.)", () => {
      const invalidInputs: unknown[] = [undefined, 12345, true, {}, []];

      for (const input of invalidInputs) {
        const safe = schema.safeParse(input);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error).toBeInstanceOf(ValidationError);
          const issue = safe.error.issues[0];
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
    const asyncSchema = new NullableSchema(asyncNumber);

    it("parses null input directly in parseAsync()", async () => {
      const result = await asyncSchema.parseAsync(null);
      expect(result).toBeNull();
    });

    it("parses valid non-null input through asynchronous innerSchema", async () => {
      // asyncNumber multiplies by 2: 25 * 2 = 50
      const result = await asyncSchema.parseAsync(25);
      expect(result).toBe(50);
    });

    it("propagates asynchronous innerSchema validation failures in safeParseAsync()", async () => {
      const safe = await asyncSchema.safeParseAsync("not_a_number");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error).toBeInstanceOf(ValidationError);
        const issue = safe.error.issues[0];
        expect(issue?.code).toBe("invalid_type");
        expect(issue?.message).toBe("Expected number async");
      }
    });

    it("rejects with ValidationError on failed async parseAsync()", async () => {
      await expect(asyncSchema.parseAsync(false)).rejects.toThrowError(ValidationError);
    });
  });
});
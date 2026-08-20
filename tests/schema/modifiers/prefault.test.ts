import { describe, it, expect, expectTypeOf } from "vitest";
import { PrefaultSchema } from "../../../src/schemas/modifiers/prefault.js";
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
    if (typeof input === "string") return makeSuccess(input);
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
    if (typeof input === "number") return makeSuccess(input * 2);
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

describe("PrefaultSchema (prefault.ts)", () => {
  describe("Constructor & Type Inference", () => {
    it("stores innerSchema and literal defaultValue correctly", () => {
      const schema = new PrefaultSchema(syncString, "literal_prefault");
      expect(schema.innerSchema).toBe(syncString);
      expect(schema.defaultValue).toBe("literal_prefault");
    });

    it("stores innerSchema and generator function defaultValue correctly", () => {
      const generator = () => "dynamic_prefault";
      const schema = new PrefaultSchema(syncString, generator);
      expect(schema.innerSchema).toBe(syncString);
      expect(schema.defaultValue).toBe(generator);
    });

    it("verifies static TypeScript output and input types with undefined", () => {
      const schema = new PrefaultSchema(syncString, "test");
      expectTypeOf(schema._output).toEqualTypeOf<string>();
      expectTypeOf(schema._input).toEqualTypeOf<string | undefined>();
    });
  });

  describe("Static Default Values", () => {
    const schema = new PrefaultSchema(syncString, "prefilled_fallback");

    it("substitutes literal default value when input is undefined and runs innerSchema", () => {
      const result = schema.parse(undefined);
      expect(result).toBe("prefilled_fallback");
    });

    it("passes provided valid input directly through to innerSchema", () => {
      const result = schema.parse("custom_string");
      expect(result).toBe("custom_string");
    });

    it("passes non-undefined invalid inputs directly to innerSchema without defaulting", () => {
      const invalidInputs: unknown[] = [null, 123, true, {}, []];

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

    it("validates the default value itself against innerSchema if invalid default is provided", () => {
      // Test the path where the default value itself is invalid for the inner schema
      const invalidDefaultSchema = new PrefaultSchema(
        syncString,
        12345 as unknown as string
      );
      const safe = invalidDefaultSchema.safeParse(undefined);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error).toBeInstanceOf(ValidationError);
        const issue = safe.issues[0];
        expect(issue?.code).toBe("invalid_type");
        if (issue?.code === "invalid_type") {
          expect(issue.expected).toBe("string");
          expect(issue.received).toBe("number");
        }
      }
    });
  });

  describe("Dynamic Factory Default Values", () => {
    it("evaluates the generator function on each undefined input parse", () => {
      let count = 0;
      const generator = () => `pre_${++count}`;
      const schema = new PrefaultSchema(syncString, generator);

      expect(schema.parse(undefined)).toBe("pre_1");
      expect(schema.parse(undefined)).toBe("pre_2");
      expect(schema.parse(undefined)).toBe("pre_3");
    });

    it("does not invoke generator function when explicit input is provided", () => {
      let called = false;
      const generator = () => {
        called = true;
        return "not_used";
      };
      const schema = new PrefaultSchema(syncString, generator);

      const result = schema.parse("explicit_value");
      expect(result).toBe("explicit_value");
      expect(called).toBe(false);
    });
  });

  describe("Asynchronous Parsing Integration", () => {
    const asyncSchema = new PrefaultSchema(asyncNumber, 50);

    it("pre-fills literal default value and executes async innerSchema when input is undefined", async () => {
      // asyncNumber doubles input: 50 * 2 = 100
      const result = await asyncSchema.parseAsync(undefined);
      expect(result).toBe(100);
    });

    it("executes async innerSchema directly with provided valid input", async () => {
      // asyncNumber doubles input: 20 * 2 = 40
      const result = await asyncSchema.parseAsync(20);
      expect(result).toBe(40);
    });

    it("pre-fills dynamic functional default and executes async innerSchema when input is undefined", async () => {
      const dynamicAsyncSchema = new PrefaultSchema(asyncNumber, () => 15);
      // asyncNumber doubles input: 15 * 2 = 30
      const result = await dynamicAsyncSchema.parseAsync(undefined);
      expect(result).toBe(30);
    });

    it("propagates async innerSchema validation errors for invalid input", async () => {
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
      await expect(asyncSchema.parseAsync(null)).rejects.toThrowError(ValidationError);
    });
  });
});
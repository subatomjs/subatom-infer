/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import { DefaultSchema } from "../../../src/schemas/modifiers/default.js";
import { Schema } from "../../../src/core/schema.js";
import { addIssue, type ParseContext } from "../../../src/core/context.js";
import {
  makeSuccess,
  makeFailure,
  type DynamicParseReturnType,
  type ParseResult,
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
    return makeFailure(ctx.issues);
  }
}

class AsyncNumberSchema extends Schema<number> {
  async _parse(input: unknown, ctx: ParseContext): Promise<ParseResult<number>> {
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
    return makeFailure(ctx.issues);
  }
}

const syncString = new SyncStringSchema();
const asyncNumber = new AsyncNumberSchema();

describe("DefaultSchema (default.ts)", () => {
  describe("Constructor & Property Inspection", () => {
    it("stores innerSchema and literal defaultValue correctly", () => {
      const schema = new DefaultSchema(syncString, "default_literal");

      expect(schema.innerSchema).toBe(syncString);
      expect(schema.defaultValue).toBe("default_literal");
    });

    it("stores innerSchema and factory function defaultValue correctly", () => {
      const generator = () => "generated_value";
      const schema = new DefaultSchema(syncString, generator);

      expect(schema.innerSchema).toBe(syncString);
      expect(schema.defaultValue).toBe(generator);
    });

    it("verifies static TypeScript input/output type resolution", () => {
      const schema = new DefaultSchema(syncString, "default_literal");

      expectTypeOf(schema._output).toEqualTypeOf<string>();
      expectTypeOf(schema._input).toEqualTypeOf<string | undefined>();
    });
  });

  describe("Static Default Values", () => {
    const schema = new DefaultSchema(syncString, "fallback_value");

    it("returns static default value when input is undefined", () => {
      const result = schema.parse(undefined);
      expect(result).toBe("fallback_value");
    });

    it("parses valid provided input instead of default value", () => {
      const result = schema.parse("custom_value");
      expect(result).toBe("custom_value");
    });

    it("passes null to innerSchema and fails if innerSchema rejects null", () => {
      const safe = schema.safeParse(null);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error).toBeInstanceOf(ValidationError);
        const issue = safe.issues[0];
        expect(issue?.code).toBe("invalid_type");
        if (issue?.code === "invalid_type") {
          expect(issue.received).toBe("object");
        }
      }
    });

    it("propagates innerSchema validation errors for invalid non-undefined types", () => {
      expect(() => schema.parse(12345)).toThrowError(ValidationError);
    });
  });

  describe("Dynamic Factory Default Values", () => {
    it("calls generator function on each parse invocation when input is undefined", () => {
      let counter = 0;
      const generator = () => `item_${++counter}`;
      const schema = new DefaultSchema(syncString, generator);

      expect(schema.parse(undefined)).toBe("item_1");
      expect(schema.parse(undefined)).toBe("item_2");
      expect(schema.parse(undefined)).toBe("item_3");
    });

    it("does not invoke generator function when valid input is supplied", () => {
      let called = false;
      const generator = () => {
        called = true;
        return "not_called";
      };
      const schema = new DefaultSchema(syncString, generator);

      const result = schema.parse("provided");
      expect(result).toBe("provided");
      expect(called).toBe(false);
    });
  });

  describe("Asynchronous Inner Schema Integration", () => {
    const asyncDefaultSchema = new DefaultSchema(asyncNumber, 100);

    it("returns default value when input is undefined in parseAsync()", async () => {
      const result = await asyncDefaultSchema.parseAsync(undefined);
      expect(result).toBe(100);
    });

    it("parses provided valid input asynchronously through innerSchema", async () => {
      const result = await asyncDefaultSchema.parseAsync(25);
      expect(result).toBe(50);
    });

    it("propagates asynchronous innerSchema validation failures", async () => {
      const safe = await asyncDefaultSchema.safeParseAsync("invalid_number");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error).toBeInstanceOf(ValidationError);
        expect(safe.issues[0]?.message).toBe("Expected number async");
      }
    });

    it("returns factory function default value in asynchronous pipeline when input is undefined", async () => {
      const dynamicAsyncSchema = new DefaultSchema(asyncNumber, () => 999);
      const result = await dynamicAsyncSchema.parseAsync(undefined);
      expect(result).toBe(999);
    });
  });

  describe("removeDefault()", () => {
    it("unwraps and returns the original innerSchema", () => {
      const schema = new DefaultSchema(syncString, "default_literal");
      const unwrapped = schema.removeDefault();

      expect(unwrapped).toBe(syncString);
      expect(unwrapped.parse("test")).toBe("test");
      expect(() => unwrapped.parse(undefined)).toThrowError(ValidationError);
    });
  });
});
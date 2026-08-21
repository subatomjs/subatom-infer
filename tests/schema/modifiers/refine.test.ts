/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */


import { describe, it, expect, expectTypeOf } from "vitest";
import { RefinementSchema } from "../../../src/schemas/modifiers/refine.js";
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

describe("RefinementSchema (refine.ts)", () => {
  describe("Constructor & Type Inference", () => {
    it("stores innerSchema, predicate, and default error message properly", () => {
      const predicate = (val: string) => val.length > 0;
      const schema = new RefinementSchema(syncString, predicate);

      expect(schema.innerSchema).toBe(syncString);
      expect(schema.refinement).toBe(predicate);
      expect(schema.message).toBe("Invalid input");
    });

    it("stores custom string or functional error message", () => {
      const customMsg = "Custom failure message";
      const customFn = (val: string) => `Failed for ${val}`;

      const schemaA = new RefinementSchema(syncString, () => true, customMsg);
      const schemaB = new RefinementSchema(syncString, () => true, customFn);

      expect(schemaA.message).toBe(customMsg);
      expect(schemaB.message).toBe(customFn);
    });

    it("preserves static TypeScript output and input types", () => {
      const schema = new RefinementSchema(syncString, (v) => v.length > 0);
      expectTypeOf(schema._output).toEqualTypeOf<string>();
      expectTypeOf(schema._input).toEqualTypeOf<string>();
    });
  });

  describe("Synchronous Inner Schema + Synchronous Refinement", () => {
    it("returns parsed value when refinement predicate returns true", () => {
      const schema = new RefinementSchema(syncString, (val) => val.startsWith("ok_"));
      expect(schema.parse("ok_test")).toBe("ok_test");
    });

    it("fails with default error message when synchronous refinement returns false", () => {
      const schema = new RefinementSchema(syncString, (val) => val.length > 5);

      const safe = schema.safeParse("abc");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error).toBeInstanceOf(ValidationError);
        const issue = safe.issues[0];
        expect(issue?.code).toBe("custom");
        expect(issue?.message).toBe("Invalid input");
      }
    });

    it("fails with dynamic functional error message when synchronous refinement returns false", () => {
      const schema = new RefinementSchema(
        syncString,
        (val) => val.includes("@"),
        (val) => `Expected email format, received '${val}'`
      );

      const safe = schema.safeParse("invalid-email");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe(
          "Expected email format, received 'invalid-email'"
        );
      }
    });

    it("short-circuits and skips refinement if innerSchema fails synchronously", () => {
      let refinementCalled = false;
      const schema = new RefinementSchema(syncString, () => {
        refinementCalled = true;
        return true;
      });

      const safe = schema.safeParse(12345);
      expect(safe.success).toBe(false);
      expect(refinementCalled).toBe(false);
      if (!safe.success) {
        const issue = safe.issues[0];
        expect(issue?.code).toBe("invalid_type");
        if (issue?.code === "invalid_type") {
          expect(issue.expected).toBe("string");
        }
      }
    });
  });

  describe("Synchronous Inner Schema + Asynchronous Refinement", () => {
    it("throws an error when async refinement is executed during synchronous parse()", () => {
      const schema = new RefinementSchema(syncString, async (val) => val === "test");
      expect(() => schema.parse("test")).toThrowError(
        "Asynchronous refinement executed during synchronous parse."
      );
    });

    it("parses valid input when async refinement resolves to true via parseAsync()", async () => {
      const schema = new RefinementSchema(syncString, async (val) => {
        await new Promise((res) => setTimeout(res, 2));
        return val === "async_valid";
      });

      const res = await schema.parseAsync("async_valid");
      expect(res).toBe("async_valid");
    });

    it("fails with static error message when async refinement resolves to false", async () => {
      const schema = new RefinementSchema(
        syncString,
        async (val) => {
          await new Promise((res) => setTimeout(res, 2));
          return val.length > 10;
        },
        "String is too short asynchronously"
      );

      const safe = await schema.safeParseAsync("short");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error).toBeInstanceOf(ValidationError);
        expect(safe.issues[0]?.message).toBe(
          "String is too short asynchronously"
        );
      }
    });

    it("fails with dynamic functional message when async refinement resolves to false", async () => {
      const schema = new RefinementSchema(
        syncString,
        async (val) => {
          await new Promise((res) => setTimeout(res, 2));
          return val.startsWith("user_");
        },
        (val) => `Invalid username prefix: ${val}`
      );

      const safe = await schema.safeParseAsync("admin_123");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe(
          "Invalid username prefix: admin_123"
        );
      }
    });
  });

  describe("Asynchronous Inner Schema Integration", () => {
    it("parses valid input when async inner schema and sync refinement both succeed", async () => {
      // asyncNumber doubles input: 15 * 2 = 30
      const schema = new RefinementSchema(asyncNumber, (val) => val % 10 === 0);
      const res = await schema.parseAsync(15);
      expect(res).toBe(30);
    });

    it("fails when sync refinement returns false after async inner schema succeeds", async () => {
      // asyncNumber doubles input: 11 * 2 = 22 (not divisible by 10)
      const schema = new RefinementSchema(
        asyncNumber,
        (val) => val % 10 === 0,
        (val) => `Value ${val} is not a multiple of 10`
      );

      const safe = await schema.safeParseAsync(11);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe(
          "Value 22 is not a multiple of 10"
        );
      }
    });

    it("short-circuits and skips refinement when async inner schema fails", async () => {
      let refinementInvoked = false;
      const schema = new RefinementSchema(asyncNumber, () => {
        refinementInvoked = true;
        return true;
      });

      const safe = await schema.safeParseAsync("not_a_number");
      expect(safe.success).toBe(false);
      expect(refinementInvoked).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe("Expected number async");
      }
    });

    it("parses valid input when both inner schema and refinement are asynchronous", async () => {
      // asyncNumber doubles input: 25 * 2 = 50
      const schema = new RefinementSchema(asyncNumber, async (val) => {
        await new Promise((res) => setTimeout(res, 2));
        return val >= 50;
      });

      const res = await schema.parseAsync(25);
      expect(res).toBe(50);
    });

    it("fails when async refinement resolves to false after async inner schema succeeds", async () => {
      // asyncNumber doubles input: 10 * 2 = 20 (< 50)
      const schema = new RefinementSchema(
        asyncNumber,
        async (val) => {
          await new Promise((res) => setTimeout(res, 2));
          return val >= 50;
        },
        "Calculated value is below minimum threshold"
      );

      const safe = await schema.safeParseAsync(10);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe(
          "Calculated value is below minimum threshold"
        );
      }
    });
  });
});
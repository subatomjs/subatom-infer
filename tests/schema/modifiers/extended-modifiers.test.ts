import { describe, it, expect, expectTypeOf } from "vitest";
import { SuperRefineSchema } from "../../../src/schemas/modifiers/extended-modifiers.js";
import { Schema } from "../../../src/core/schema-base.js";
import { type RefinementContext } from "../../../src/core/schema.js";
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

describe("SuperRefineSchema", () => {
  describe("Constructor & Static Typing", () => {
    it("stores innerSchema and refinement function properly", () => {
      const refinement = (val: string, _ctx: RefinementContext) => {
        void val;
      };
      const schema = new SuperRefineSchema(syncString, refinement);

      expect(schema.innerSchema).toBe(syncString);
      expect(schema.refinement).toBe(refinement);
    });

    it("preserves static input and output types", () => {
      const schema = new SuperRefineSchema(syncString, (_val, _ctx) => {});
      expectTypeOf(schema._output).toEqualTypeOf<string>();
      expectTypeOf(schema._input).toEqualTypeOf<string>();
    });
  });

  describe("Synchronous Inner Schema + Synchronous SuperRefine", () => {
    it("parses valid input when superRefine adds no issues", () => {
      const schema = new SuperRefineSchema(syncString, (val, ctx) => {
        if (val.length < 3) {
          ctx.addIssue({ code: "custom", message: "String too short" });
        }
      });

      expect(schema.parse("hello")).toBe("hello");
    });

    it("fails when superRefine adds issues synchronously", () => {
      const schema = new SuperRefineSchema(syncString, (val, ctx) => {
        if (!val.startsWith("valid_")) {
          ctx.addIssue({ code: "custom", message: "Must start with valid_" });
        }
      });

      const safe = schema.safeParse("invalid_value");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error).toBeInstanceOf(ValidationError);
        const issue = safe.error.issues[0];
        expect(issue?.code).toBe("custom");
        expect(issue?.message).toBe("Must start with valid_");
      }
    });

    it("short-circuits and skips superRefine if innerSchema fails synchronously", () => {
      let superRefineCalled = false;

      const schema = new SuperRefineSchema(syncString, (_val, _ctx) => {
        superRefineCalled = true;
      });

      const safe = schema.safeParse(12345);
      expect(safe.success).toBe(false);
      expect(superRefineCalled).toBe(false);
      if (!safe.success) {
        const issue = safe.error.issues[0];
        expect(issue?.code).toBe("invalid_type");
      }
    });
  });

  describe("Synchronous Inner Schema + Asynchronous SuperRefine", () => {
    it("parses valid input with async superRefine in parseAsync()", async () => {
      const schema = new SuperRefineSchema(syncString, async (val, ctx) => {
        await new Promise((res) => setTimeout(res, 2));
        if (val === "forbidden") {
          ctx.addIssue({ code: "custom", message: "Forbidden string" });
        }
      });

      const res = await schema.parseAsync("allowed");
      expect(res).toBe("allowed");
    });

    it("fails with ValidationError when async superRefine adds issues in parseAsync()", async () => {
      const schema = new SuperRefineSchema(syncString, async (val, ctx) => {
        await new Promise((res) => setTimeout(res, 2));
        if (val === "forbidden") {
          ctx.addIssue({ code: "custom", message: "Forbidden string" });
        }
      });

      const safe = await schema.safeParseAsync("forbidden");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error.issues[0]?.message).toBe("Forbidden string");
      }
    });

    it("throws an error when async superRefine is executed during synchronous parse()", () => {
      const schema = new SuperRefineSchema(syncString, async () => {
        await new Promise((res) => setTimeout(res, 2));
      });

      expect(() => schema.parse("trigger")).toThrowError(
        "Asynchronous superRefine executed during synchronous parse mode."
      );
    });
  });

  describe("Asynchronous Inner Schema Integration", () => {
    it("parses valid input when async inner schema and sync superRefine succeed", async () => {
      const schema = new SuperRefineSchema(asyncNumber, (val, ctx) => {
        if (val > 100) {
          ctx.addIssue({ code: "custom", message: "Number exceeds maximum" });
        }
      });

      // asyncNumber doubles input: 20 * 2 = 40
      const res = await schema.parseAsync(20);
      expect(res).toBe(40);
    });

    it("fails when sync superRefine adds issues after async inner schema succeeds", async () => {
      const schema = new SuperRefineSchema(asyncNumber, (val, ctx) => {
        if (val > 50) {
          ctx.addIssue({ code: "custom", message: "Doubled value too large" });
        }
      });

      // asyncNumber doubles input: 30 * 2 = 60 (> 50)
      const safe = await schema.safeParseAsync(30);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error.issues[0]?.message).toBe("Doubled value too large");
      }
    });

    it("short-circuits and skips superRefine if async inner schema fails", async () => {
      let superRefineInvoked = false;

      const schema = new SuperRefineSchema(asyncNumber, (_val, _ctx) => {
        superRefineInvoked = true;
      });

      const safe = await schema.safeParseAsync("not_a_number");
      expect(safe.success).toBe(false);
      expect(superRefineInvoked).toBe(false);
      if (!safe.success) {
        expect(safe.error.issues[0]?.message).toBe("Expected number async");
      }
    });

    it("parses valid input when both inner schema and superRefine are asynchronous", async () => {
      const schema = new SuperRefineSchema(asyncNumber, async (val, ctx) => {
        await new Promise((res) => setTimeout(res, 2));
        if (val % 2 !== 0) {
          ctx.addIssue({ code: "custom", message: "Must be even" });
        }
      });

      const res = await schema.parseAsync(10); // 10 * 2 = 20 (even)
      expect(res).toBe(20);
    });
  });

  describe("RefinementContext Contract", () => {
    it("provides the current context path and adds issues correctly", () => {
      let observedPath: readonly (string | number | symbol)[] = [];

      const schema = new SuperRefineSchema(syncString, (_val, ctx) => {
        observedPath = ctx.path;
        ctx.addIssue({ code: "custom", message: "Path validation check" });
      });

      const safe = schema.safeParse("test");
      expect(safe.success).toBe(false);
      expect(observedPath).toEqual([]);
      if (!safe.success) {
        expect(safe.error.issues[0]?.path).toEqual([]);
        expect(safe.error.issues[0]?.message).toBe("Path validation check");
      }
    });
  });
});
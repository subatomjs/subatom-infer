import { describe, it, expect, vi } from "vitest";
import { SuperRefineSchema } from "../../../src/schemas/modifiers/super-refine.js";
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
    if (typeof input === "string") return makeSuccess(input);
    addIssue(ctx, { code: "invalid_type", message: "Expected string", expected: "string", received: typeof input });
    return makeFailure(ctx.issues);
  }
}

class AsyncNumberSchema extends Schema<number> {
  async _parse(input: unknown, ctx: ParseContext): Promise<ParseResult<number>> {
    await new Promise((resolve) => setTimeout(resolve, 2));
    if (typeof input === "number") return makeSuccess(input * 2);
    addIssue(ctx, { code: "invalid_type", message: "Expected number", expected: "number", received: typeof input });
    return makeFailure(ctx.issues);
  }
}

const syncString = new SyncStringSchema();
const asyncNumber = new AsyncNumberSchema();

describe("SuperRefineSchema (super-refine.ts)", () => {
  describe("Synchronous Parsing", () => {
    it("successfully parses value when refinement adds no issues", () => {
      const schema = new SuperRefineSchema(syncString, (val, ctx) => {
        if (val === "fail") {
          ctx.addIssue({ code: "custom", message: "Explicit failure" });
        }
      });

      expect(schema.parse("ok")).toBe("ok");
    });

    it("fails and returns inner issues if refinement adds issues", () => {
      const schema = new SuperRefineSchema(syncString, (val, ctx) => {
        if (val === "fail") {
          ctx.addIssue({ code: "custom", message: "Explicit failure" });
        }
      });

      const safe = schema.safeParse("fail");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe("Explicit failure");
      }
    });

    it("short-circuits if innerSchema fails", () => {
      let refined = false;
      const schema = new SuperRefineSchema(syncString, () => {
        refined = true;
      });

      const safe = schema.safeParse(123);
      expect(safe.success).toBe(false);
      expect(refined).toBe(false);
    });

    it("throws error if refinement is async during synchronous parse", () => {
      const schema = new SuperRefineSchema(syncString, async () => {});
      expect(() => schema.parse("test")).toThrowError(
        "Asynchronous superRefine executed during synchronous parse mode."
      );
    });
  });

  describe("Asynchronous Parsing", () => {
    it("successfully parses when async refinement resolves with no issues", async () => {
      const schema = new SuperRefineSchema(syncString, async (val, ctx) => {
        await new Promise((res) => setTimeout(res, 2));
        if (val === "bad") {
          ctx.addIssue({ code: "custom", message: "Async fail" });
        }
      });

      const res = await schema.parseAsync("good");
      expect(res).toBe("good");
    });

    it("fails when async refinement resolves with issues", async () => {
      const schema = new SuperRefineSchema(syncString, async (val, ctx) => {
        await new Promise((res) => setTimeout(res, 2));
        if (val === "bad") {
          ctx.addIssue({ code: "custom", message: "Async fail" });
        }
      });

      const safe = await schema.safeParseAsync("bad");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe("Async fail");
      }
    });

    it("works correctly with an async inner schema", async () => {
      const schema = new SuperRefineSchema(asyncNumber, (val, ctx) => {
        if (val > 100) {
          ctx.addIssue({ code: "custom", message: "Too high" });
        }
      });

      const res = await schema.parseAsync(10); // 10 * 2 = 20
      expect(res).toBe(20);

      const safe = await schema.safeParseAsync(60); // 60 * 2 = 120
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe("Too high");
      }
    });

    it("propagates inner schema failure in async mode", async () => {
      const schema = new SuperRefineSchema(asyncNumber, () => {});
      const safe = await schema.safeParseAsync("not_a_number");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe("Expected number");
      }
    });
  });

  describe("Context path preservation", () => {
    it("preserves the context path when adding issues via RefinementContext", () => {
      const schema = new SuperRefineSchema(syncString, (_, ctx) => {
        ctx.addIssue({ code: "custom", message: "Path test" });
      });

      const safe = schema.safeParse("test");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.path).toEqual([]);
      }
    });
  });
});
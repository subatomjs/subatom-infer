import { describe, it, expect, expectTypeOf } from "vitest";
import { TransformSchema } from "../../../src/schemas/modifiers/transform.js";
import { Schema } from "../../../src/core/schema.js";
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

describe("TransformSchema", () => {
  describe("Constructor & Static Type Inference", () => {
    it("stores innerSchema and transformer reference properly", () => {
      const transformer = (val: string) => val.length;
      const schema = new TransformSchema(syncString, transformer);

      expect(schema.innerSchema).toBe(syncString);
      expect(schema.transformer).toBe(transformer);
    });

    it("verifies static TypeScript output transformation types", () => {
      const schema = new TransformSchema(syncString, (val: string) => Number(val));

      expectTypeOf(schema._output).toEqualTypeOf<number>();
      expectTypeOf(schema._input).toEqualTypeOf<string>();
    });
  });

  describe("Synchronous Inner Schema + Synchronous Transform", () => {
    it("transforms parsed data successfully in synchronous parse mode", () => {
      const schema = new TransformSchema(syncString, (val) => val.toUpperCase());
      expect(schema.parse("hello")).toBe("HELLO");
    });

    it("catches Error instances thrown inside transformer and creates custom validation issue", () => {
      const schema = new TransformSchema(syncString, () => {
        throw new Error("Transformation failed explicitly");
      });

      const safe = schema.safeParse("trigger");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error).toBeInstanceOf(ValidationError);
        const issue = safe.error.issues[0];
        expect(issue?.code).toBe("custom");
        expect(issue?.message).toBe("Transformation failed explicitly");
      }
    });

    it("catches non-Error thrown objects inside transformer and falls back to default message", () => {
      const schema = new TransformSchema(syncString, () => {
        throw "string error"; // Non-Error instance throw
      });

      const safe = schema.safeParse("trigger");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error).toBeInstanceOf(ValidationError);
        const issue = safe.error.issues[0];
        expect(issue?.code).toBe("custom");
        expect(issue?.message).toBe("Transformer thrown an error");
      }
    });

    it("short-circuits and skips transformer when innerSchema fails synchronously", () => {
      let transformCalled = false;
      const schema = new TransformSchema(syncString, (val) => {
        transformCalled = true;
        return val.length;
      });

      const safe = schema.safeParse(12345);
      expect(safe.success).toBe(false);
      expect(transformCalled).toBe(false);
      if (!safe.success) {
        const issue = safe.error.issues[0];
        expect(issue?.code).toBe("invalid_type");
      }
    });
  });

  describe("Synchronous Inner Schema + Asynchronous Transform", () => {
    it("transforms parsed data asynchronously via parseAsync()", async () => {
      const schema = new TransformSchema(syncString, async (val) => {
        await new Promise((res) => setTimeout(res, 2));
        return val.length;
      });

      const result = await schema.parseAsync("hello world");
      expect(result).toBe(11);
    });

    it("throws when async transformer is executed in synchronous parse() mode", () => {
      const schema = new TransformSchema(syncString, async (val) => {
        await new Promise((res) => setTimeout(res, 2));
        return val.length;
      });

      const safe = schema.safeParse("trigger");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error.issues[0]?.message).toBe(
          "Asynchronous transform executed during synchronous parse."
        );
      }
    });
  });

  describe("Asynchronous Inner Schema Integration", () => {
    it("transforms data synchronously after asynchronous inner schema succeeds", async () => {
      // asyncNumber doubles input: 20 * 2 = 40; then transformer maps to string: "40"
      const schema = new TransformSchema(asyncNumber, (val) => `val_${val}`);
      const result = await schema.parseAsync(20);
      expect(result).toBe("val_40");
    });

    it("transforms data asynchronously after asynchronous inner schema succeeds", async () => {
      // asyncNumber doubles input: 15 * 2 = 30; then async transformer computes 30 + 5 = 35
      const schema = new TransformSchema(asyncNumber, async (val) => {
        await new Promise((res) => setTimeout(res, 2));
        return val + 5;
      });

      const result = await schema.parseAsync(15);
      expect(result).toBe(35);
    });

    it("short-circuits and skips transformer when asynchronous inner schema fails", async () => {
      let transformInvoked = false;
      const schema = new TransformSchema(asyncNumber, (val) => {
        transformInvoked = true;
        return val;
      });

      const safe = await schema.safeParseAsync("invalid_number");
      expect(safe.success).toBe(false);
      expect(transformInvoked).toBe(false);
      if (!safe.success) {
        expect(safe.error.issues[0]?.message).toBe("Expected number async");
      }
    });
  });
});
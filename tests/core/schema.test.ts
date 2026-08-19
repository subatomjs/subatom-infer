import { describe, it, expect, vi } from "vitest";
import type { ParseContext } from "../../src/core/context.js";
import type { AsyncParseReturnType, DynamicParseReturnType } from "../../src/core/result.js";
import { makeSuccess, makeFailure } from "../../src/core/result.js";
import { ValidationError } from "../../src/core/error.js";

// Mock the modifier & combinator modules matching the exact path from this test file
vi.mock("../../src/schemas/modifiers/optional.js", () => ({
  OptionalSchema: class MockOptionalSchema {
    constructor(public inner: unknown) {}
  },
}));

vi.mock("../../src/schemas/modifiers/nullable.js", () => ({
  NullableSchema: class MockNullableSchema {
    constructor(public inner: unknown) {}
  },
}));

vi.mock("../../src/schemas/modifiers/default.js", () => ({
  DefaultSchema: class MockDefaultSchema {
    constructor(public inner: unknown, public defaultValue: unknown) {}
  },
}));

vi.mock("../../src/schemas/modifiers/prefault.js", () => ({
  PrefaultSchema: class MockPrefaultSchema {
    constructor(public inner: unknown, public defaultValue: unknown) {}
  },
}));

vi.mock("../../src/schemas/modifiers/extended-modifiers.js", () => ({
  CatchSchema: class MockCatchSchema {
    constructor(public inner: unknown, public catchValue: unknown) {}
  },
  PipeSchema: class MockPipeSchema {
    constructor(public inner: unknown, public nextSchema: unknown) {}
  },
  TransformSchema: class MockTransformSchema {
    constructor(public inner: unknown, public transformer: unknown) {}
  },
  RefinementSchema: class MockRefinementSchema {
    constructor(
      public inner: unknown,
      public predicate: unknown,
      public message: unknown
    ) {}
  },
  SuperRefineSchema: class MockSuperRefineSchema {
    constructor(public inner: unknown, public refinement: unknown) {}
  },
}));

vi.mock("../../src/schemas/composites/combinators.js", () => ({
  UnionSchema: class MockUnionSchema {
    constructor(public options: unknown[]) {}
  },
  IntersectionSchema: class MockIntersectionSchema {
    constructor(public left: unknown, public right: unknown) {}
  },
}));

// Now import Schema and the mocked classes
import { Schema, type RefinementContext } from "../../src/core/schema.js";
import { OptionalSchema } from "../../src/schemas/modifiers/optional.js";
import { NullableSchema } from "../../src/schemas/modifiers/nullable.js";
import { DefaultSchema } from "../../src/schemas/modifiers/default.js";
import { PrefaultSchema } from "../../src/schemas/modifiers/prefault.js";
import {
  CatchSchema,
  PipeSchema,
  TransformSchema,
  RefinementSchema,
  SuperRefineSchema,
} from "../../src/schemas/modifiers/extended-modifiers.js";
import {
  UnionSchema,
  IntersectionSchema,
} from "../../src/schemas/composites/combinators.js";

// Test Harness Concrete Implementations
class SyncSuccessSchema extends Schema<string> {
  _parse(input: unknown, _ctx: ParseContext): DynamicParseReturnType<string> {
    if (typeof input === "string") {
      return makeSuccess(input);
    }
    return makeFailure([
      {
        code: "invalid_type",
        path: [],
        message: "Expected string",
        expected: "string",
        received: typeof input,
      },
    ]);
  }
}

class AsyncSuccessSchema extends Schema<string> {
  async _parse(
    input: unknown,
    _ctx: ParseContext
  ): AsyncParseReturnType<string> {
    await new Promise((res) => setTimeout(res, 5));
    if (typeof input === "string") {
      return makeSuccess(input.toUpperCase());
    }
    return makeFailure([
      {
        code: "invalid_type",
        path: [],
        message: "Expected string asynchronously",
        expected: "string",
        received: typeof input,
      },
    ]);
  }
}

class ThrowingSchema extends Schema<string> {
  _parse(_input: unknown, _ctx: ParseContext): DynamicParseReturnType<string> {
    throw new TypeError("Fatal runtime error during parse execution");
  }
}

describe("Schema Abstract Class", () => {
  describe("Synchronous Parsing (parse & safeParse)", () => {
    const schema = new SyncSuccessSchema();

    it("returns parsed data on successful sync parse", () => {
      const data = schema.parse("hello");
      expect(data).toBe("hello");
    });

    it("throws ValidationError on failed sync parse", () => {
      expect(() => schema.parse(123)).toThrowError(ValidationError);
      try {
        schema.parse(123);
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        expect((err as ValidationError).issues[0]?.message).toBe(
          "Expected string"
        );
      }
    });

    it("throws an error if parse() encounters an asynchronous operation", () => {
      const asyncSchema = new AsyncSuccessSchema();
      expect(() => asyncSchema.parse("test")).toThrowError(
        "Synchronous parse encountered an asynchronous operation. Use .parseAsync() instead."
      );
    });

    it("returns success object with data on safeParse()", () => {
      const res = schema.safeParse("safe string");
      expect(res).toEqual({
        success: true,
        data: "safe string",
      });
    });

    it("returns failure object with ValidationError on safeParse()", () => {
      const res = schema.safeParse(12345);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(ValidationError);
        expect(res.error.issues).toHaveLength(1);
      }
    });

    it("re-throws unexpected non-ValidationError exceptions in safeParse()", () => {
      const throwingSchema = new ThrowingSchema();
      expect(() => throwingSchema.safeParse("test")).toThrowError(TypeError);
    });
  });

  describe("Asynchronous Parsing (parseAsync, safeParseAsync, spa)", () => {
    const syncSchema = new SyncSuccessSchema();
    const asyncSchema = new AsyncSuccessSchema();

    it("handles synchronous schemas inside parseAsync() correctly", async () => {
      const res = await syncSchema.parseAsync("sync value");
      expect(res).toBe("sync value");
    });

    it("handles asynchronous schemas inside parseAsync() successfully", async () => {
      const res = await asyncSchema.parseAsync("async value");
      expect(res).toBe("ASYNC VALUE");
    });

    it("throws ValidationError on async parse failure", async () => {
      await expect(asyncSchema.parseAsync(999)).rejects.toThrowError(
        ValidationError
      );
    });

    it("returns success on safeParseAsync()", async () => {
      const res = await asyncSchema.safeParseAsync("async safe");
      expect(res).toEqual({
        success: true,
        data: "ASYNC SAFE",
      });
    });

    it("returns failure with error on safeParseAsync()", async () => {
      const res = await asyncSchema.safeParseAsync(false);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(ValidationError);
      }
    });

    it("re-throws unexpected errors in safeParseAsync()", async () => {
      const throwingSchema = new ThrowingSchema();
      await expect(throwingSchema.safeParseAsync("test")).rejects.toThrowError(
        TypeError
      );
    });

    it("verifies that spa() is an exact alias for safeParseAsync()", async () => {
      const spy = vi.spyOn(asyncSchema, "safeParseAsync");
      const res = await asyncSchema.spa("spa input");

      expect(spy).toHaveBeenCalledWith("spa input");
      expect(res).toEqual({
        success: true,
        data: "SPA INPUT",
      });
      spy.mockRestore();
    });
  });

  describe("Metadata Management (describe & meta)", () => {
    it("attaches description fluently", () => {
      const schema = new SyncSuccessSchema();
      const returned = schema.describe("A simple string validator");

      expect(returned).toBe(schema);
      expect(schema.metadata.description).toBe("A simple string validator");
    });

    it("attaches metadata with object freezing from undefined initial state", () => {
      const schema = new SyncSuccessSchema();
      const returned = schema.meta({ tag: "user-input", priority: 1 });

      expect(returned).toBe(schema);
      expect(schema.metadata.meta).toEqual({
        tag: "user-input",
        priority: 1,
      });
      expect(Object.isFrozen(schema.metadata.meta)).toBe(true);
    });

    it("merges additional metadata when meta() was previously set", () => {
      const schema = new SyncSuccessSchema();
      schema.meta({ first: "1" });
      schema.meta({ second: "2" });

      expect(schema.metadata.meta).toEqual({
        first: "1",
        second: "2",
      });
      expect(Object.isFrozen(schema.metadata.meta)).toBe(true);
    });
  });

  describe("Modifier & Combinator Schema Factories", () => {
    const schema = new SyncSuccessSchema();

    it("creates OptionalSchema with .optional()", () => {
      const opt = schema.optional();
      expect(opt).toBeInstanceOf(OptionalSchema);
      expect((opt as unknown as { inner: unknown }).inner).toBe(schema);
    });

    it("creates NullableSchema with .nullable()", () => {
      const nul = schema.nullable();
      expect(nul).toBeInstanceOf(NullableSchema);
      expect((nul as unknown as { inner: unknown }).inner).toBe(schema);
    });

    it("creates composite NullableSchema(OptionalSchema) with .nullish()", () => {
      const nullish = schema.nullish();
      expect(nullish).toBeInstanceOf(NullableSchema);
      const innerOpt = (nullish as unknown as { inner: unknown }).inner;
      expect(innerOpt).toBeInstanceOf(OptionalSchema);
      expect((innerOpt as unknown as { inner: unknown }).inner).toBe(schema);
    });

    it("creates DefaultSchema with .default()", () => {
      const def = schema.default("fallback");
      expect(def).toBeInstanceOf(DefaultSchema);
      expect((def as unknown as { inner: unknown; defaultValue: unknown }).inner).toBe(schema);
      expect((def as unknown as { inner: unknown; defaultValue: unknown }).defaultValue).toBe("fallback");
    });

    it("creates PrefaultSchema with .prefault()", () => {
      const pref = schema.prefault(() => "pre-fallback");
      expect(pref).toBeInstanceOf(PrefaultSchema);
      expect((pref as unknown as { inner: unknown; defaultValue: unknown }).inner).toBe(schema);
      expect(
        typeof (pref as unknown as { defaultValue: () => string }).defaultValue
      ).toBe("function");
    });

    it("creates CatchSchema with .catch()", () => {
      const caught = schema.catch("default-on-error");
      expect(caught).toBeInstanceOf(CatchSchema);
      expect((caught as unknown as { inner: unknown; catchValue: unknown }).inner).toBe(schema);
      expect((caught as unknown as { inner: unknown; catchValue: unknown }).catchValue).toBe("default-on-error");
    });

    it("creates UnionSchema with .or()", () => {
      const other = new SyncSuccessSchema();
      const union = schema.or(other);
      expect(union).toBeInstanceOf(UnionSchema);
      expect((union as unknown as { options: unknown[] }).options).toEqual([
        schema,
        other,
      ]);
    });

    it("creates IntersectionSchema with .and()", () => {
      const other = new SyncSuccessSchema();
      const intersection = schema.and(other);
      expect(intersection).toBeInstanceOf(IntersectionSchema);
      expect(
        (intersection as unknown as { left: unknown; right: unknown }).left
      ).toBe(schema);
      expect(
        (intersection as unknown as { left: unknown; right: unknown }).right
      ).toBe(other);
    });

    it("creates RefinementSchema with default and custom messages via .refine()", () => {
      const predicate = (val: string) => val.length > 3;

      const refinedDefault = schema.refine(predicate);
      expect(refinedDefault).toBeInstanceOf(RefinementSchema);
      expect(
        (refinedDefault as unknown as { inner: unknown; predicate: unknown; message: unknown }).message
      ).toBe("Invalid input");

      const refinedCustom = schema.refine(predicate, "Must be > 3 chars");
      expect(refinedCustom).toBeInstanceOf(RefinementSchema);
      expect(
        (refinedCustom as unknown as { inner: unknown; predicate: unknown; message: unknown }).message
      ).toBe("Must be > 3 chars");
    });

    it("creates SuperRefineSchema with .superRefine()", () => {
      const refinement = (val: string, ctx: RefinementContext) => {
        if (val.length === 0) {
          ctx.addIssue({ code: "custom", message: "Cannot be empty" });
        }
      };
      const superRefined = schema.superRefine(refinement);
      expect(superRefined).toBeInstanceOf(SuperRefineSchema);
      expect(
        (superRefined as unknown as { inner: unknown; refinement: unknown }).refinement
      ).toBe(refinement);
    });

    it("delegates .check() to .refine() with default message", () => {
      const refineSpy = vi.spyOn(schema, "refine");
      const validator = (val: string) => Boolean(val);

      schema.check(validator);
      expect(refineSpy).toHaveBeenCalledWith(validator, "Check failed");

      schema.check(validator, "Custom check failed");
      expect(refineSpy).toHaveBeenCalledWith(validator, "Custom check failed");
      refineSpy.mockRestore();
    });

    it("creates TransformSchema with .transform()", () => {
      const transformer = (val: string) => val.length;
      const transformed = schema.transform(transformer);
      expect(transformed).toBeInstanceOf(TransformSchema);
      expect(
        (transformed as unknown as { inner: unknown; transformer: unknown }).transformer
      ).toBe(transformer);
    });

    it("creates PipeSchema with .pipe()", () => {
      const nextSchema = new SyncSuccessSchema();
      const piped = schema.pipe(nextSchema);
      expect(piped).toBeInstanceOf(PipeSchema);
      expect(
        (piped as unknown as { inner: unknown; nextSchema: unknown }).nextSchema
      ).toBe(nextSchema);
    });
  });
});
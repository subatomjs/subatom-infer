/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so mock classes are initialized before vi.mock calls run
const {
  MockOptionalSchema,
  MockNullableSchema,
  MockDefaultSchema,
  MockPrefaultSchema,
  MockCatchSchema,
  MockPipeSchema,
  MockReadonlySchema,
  MockTransformSchema,
  MockRefinementSchema,
  SuperRefineMockSchema,
} = vi.hoisted(() => {
  class BaseMock {
    optional() {
      return new MockOptionalSchema(this);
    }
  }

  class MockOptionalSchema extends BaseMock {
    constructor(public readonly inner: unknown) {
      super();
    }
  }

  class MockNullableSchema extends BaseMock {
    constructor(public readonly inner: unknown) {
      super();
    }
  }

  class MockDefaultSchema extends BaseMock {
    constructor(
      public readonly inner: unknown,
      public readonly defaultValue: unknown
    ) {
      super();
    }
  }

  class MockPrefaultSchema extends BaseMock {
    constructor(
      public readonly inner: unknown,
      public readonly defaultValue: unknown
    ) {
      super();
    }
  }

  class MockCatchSchema extends BaseMock {
    constructor(
      public readonly inner: unknown,
      public readonly catchValue: unknown
    ) {
      super();
    }
  }

  class MockPipeSchema extends BaseMock {
    constructor(
      public readonly first: unknown,
      public readonly second: unknown
    ) {
      super();
    }
  }

  class MockReadonlySchema extends BaseMock {
    constructor(public readonly inner: unknown) {
      super();
    }
  }

  class MockTransformSchema extends BaseMock {
    constructor(
      public readonly inner: unknown,
      public readonly transformer: unknown
    ) {
      super();
    }
  }

  class MockRefinementSchema extends BaseMock {
    constructor(
      public readonly inner: unknown,
      public readonly refinement: unknown,
      public readonly message: unknown
    ) {
      super();
    }
  }

  class SuperRefineMockSchema extends BaseMock {
    constructor(
      public readonly inner: unknown,
      public readonly refinement: unknown
    ) {
      super();
    }
  }

  return {
    MockOptionalSchema,
    MockNullableSchema,
    MockDefaultSchema,
    MockPrefaultSchema,
    MockCatchSchema,
    MockPipeSchema,
    MockReadonlySchema,
    MockTransformSchema,
    MockRefinementSchema,
    SuperRefineMockSchema,
  };
});

// Mock modifier modules
vi.mock("../../src/schemas/modifiers/optional.js", () => ({
  OptionalSchema: MockOptionalSchema,
}));

vi.mock("../../src/schemas/modifiers/nullable.js", () => ({
  NullableSchema: MockNullableSchema,
}));

vi.mock("../../src/schemas/modifiers/default.js", () => ({
  DefaultSchema: MockDefaultSchema,
}));

vi.mock("../../src/schemas/modifiers/prefault.js", () => ({
  PrefaultSchema: MockPrefaultSchema,
}));

vi.mock("../../src/schemas/modifiers/transform.js", () => ({
  TransformSchema: MockTransformSchema,
}));

vi.mock("../../src/schemas/modifiers/refine.js", () => ({
  RefinementSchema: MockRefinementSchema,
}));

vi.mock("../../src/schemas/modifiers/super-refine.js", () => ({
  SuperRefineSchema: SuperRefineMockSchema,
}));

vi.mock("../../src/schemas/modifiers/all-modifiers.js", () => ({
  CatchSchema: MockCatchSchema,
  PipeSchema: MockPipeSchema,
  ReadonlySchema: MockReadonlySchema,
}));

import type { ParseContext } from "../../src/core/context.js";
import type { DynamicParseReturnType, ParseResult } from "../../src/core/result.js";
import { makeSuccess, makeFailure } from "../../src/core/result.js";
import { ValidationError } from "../../src/core/error.js";
import { Schema, schemaRegistry, type RefinementContext } from "../../src/core/schema.js";

import { OptionalSchema } from "../../src/schemas/modifiers/optional.js";
import { NullableSchema } from "../../src/schemas/modifiers/nullable.js";
import { DefaultSchema } from "../../src/schemas/modifiers/default.js";
import { PrefaultSchema } from "../../src/schemas/modifiers/prefault.js";
import { TransformSchema } from "../../src/schemas/modifiers/transform.js";
import { RefinementSchema } from "../../src/schemas/modifiers/refine.js";
import { SuperRefineSchema } from "../../src/schemas/modifiers/super-refine.js";
import {
  CatchSchema,
  PipeSchema,
  ReadonlySchema,
} from "../../src/schemas/modifiers/all-modifiers.js";

// Bridge registry setup
function registerAllMocks() {
  schemaRegistry.optional = (schema) => new OptionalSchema(schema) as any;
  schemaRegistry.nullable = (schema) => new NullableSchema(schema) as any;
  schemaRegistry.default = (schema, def) => new DefaultSchema(schema, def) as any;
  schemaRegistry.prefault = (schema, def) => new PrefaultSchema(schema, def) as any;
  schemaRegistry.transform = (schema, fn) => new TransformSchema(schema, fn) as any;
  schemaRegistry.refine = (schema, check, msg) => new RefinementSchema(schema, check, msg) as any;
  schemaRegistry.superRefine = (schema, refiner) => new SuperRefineSchema(schema, refiner) as any;
  schemaRegistry.pipe = (first, second) => new PipeSchema(first, second) as any;
  schemaRegistry.readonly = (schema) => new ReadonlySchema(schema) as any;
  schemaRegistry.catch = (schema, fallback) => new CatchSchema(schema, fallback) as any;
}

// Test Harness Concrete Classes
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
  ): Promise<ParseResult<string>> {
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

class ThrowingValidationErrorSchema extends Schema<string> {
  _parse(_input: unknown, _ctx: ParseContext): DynamicParseReturnType<string> {
    throw new ValidationError([
      {
        code: "custom",
        path: ["root"],
        message: "Thrown ValidationError directly",
      },
    ]);
  }
}

class ThrowingTypeErrorSchema extends Schema<string> {
  _parse(_input: unknown, _ctx: ParseContext): DynamicParseReturnType<string> {
    throw new TypeError("Fatal runtime error during parse execution");
  }
}

describe("Schema Abstract Class", () => {
  beforeEach(() => {
    registerAllMocks();
  });

  describe("Synchronous Parsing (parse & safeParse)", () => {
    const schema = new SyncSuccessSchema();

    it("returns parsed data on successful sync parse()", () => {
      const data = schema.parse("hello");
      expect(data).toBe("hello");
    });

    it("throws ValidationError on failed sync parse()", () => {
      expect(() => schema.parse(123)).toThrowError(ValidationError);
      try {
        schema.parse(123);
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        expect((err as ValidationError).issues[0]?.message).toBe("Expected string");
      }
    });

    it("throws an error if parse() encounters an asynchronous operation", () => {
      const asyncSchema = new AsyncSuccessSchema();
      expect(() => asyncSchema.parse("test")).toThrowError(
        "Asynchronous validation occurred during synchronous parse(). Use parseAsync() instead."
      );
    });

    it("returns success result on safeParse()", () => {
      const res = schema.safeParse("safe string");
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toBe("safe string");
      }
    });

    it("returns failure result on failed safeParse()", () => {
      const res = schema.safeParse(12345);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.issues).toHaveLength(1);
      }
    });

    it("throws an error if safeParse() encounters an asynchronous operation", () => {
      const asyncSchema = new AsyncSuccessSchema();
      expect(() => asyncSchema.safeParse("test")).toThrowError(
        "Encountered Promise during synchronous safeParse(). Use safeParseAsync()."
      );
    });

    it("catches thrown ValidationError in safeParse() and returns failure result", () => {
      const throwingSchema = new ThrowingValidationErrorSchema();
      const res = throwingSchema.safeParse("test");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.issues[0]?.message).toBe("Thrown ValidationError directly");
      }
    });

    it("re-throws unexpected non-ValidationError exceptions in safeParse()", () => {
      const throwingSchema = new ThrowingTypeErrorSchema();
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
      await expect(asyncSchema.parseAsync(999)).rejects.toThrowError(ValidationError);
    });

    it("returns success on safeParseAsync()", async () => {
      const res = await asyncSchema.safeParseAsync("async safe");
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toBe("ASYNC SAFE");
      }
    });

    it("returns failure on safeParseAsync() with invalid input", async () => {
      const res = await asyncSchema.safeParseAsync(false);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.issues).toHaveLength(1);
      }
    });

    it("catches thrown ValidationError in safeParseAsync() and returns failure result", async () => {
      const throwingSchema = new ThrowingValidationErrorSchema();
      const res = await throwingSchema.safeParseAsync("test");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.issues[0]?.message).toBe("Thrown ValidationError directly");
      }
    });

    it("re-throws unexpected non-ValidationError errors in safeParseAsync()", async () => {
      const throwingSchema = new ThrowingTypeErrorSchema();
      await expect(throwingSchema.safeParseAsync("test")).rejects.toThrowError(TypeError);
    });

    it("verifies that spa() is an alias for safeParseAsync()", async () => {
      const spy = vi.spyOn(asyncSchema, "safeParseAsync");
      const res = await asyncSchema.spa("spa input");

      expect(spy).toHaveBeenCalledWith("spa input");
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toBe("SPA INPUT");
      }
      spy.mockRestore();
    });
  });

  describe("Modifier Factory Methods", () => {
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

    it("creates composite NullableSchema wrapping OptionalSchema with .nullish()", () => {
      const nullish = schema.nullish();
      expect(nullish).toBeInstanceOf(OptionalSchema);
      const innerNullable = (nullish as unknown as { inner: unknown }).inner;
      expect(innerNullable).toBeInstanceOf(NullableSchema);
      expect((innerNullable as unknown as { inner: unknown }).inner).toBe(schema);
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

    it("creates ReadonlySchema with .readonly()", () => {
      const read = schema.readonly();
      expect(read).toBeInstanceOf(ReadonlySchema);
      expect((read as unknown as { inner: unknown }).inner).toBe(schema);
    });

    it("creates TransformSchema with .transform()", () => {
      const transformer = (val: string) => val.length;
      const transformed = schema.transform(transformer);
      expect(transformed).toBeInstanceOf(TransformSchema);
      expect(
        (transformed as unknown as { inner: unknown; transformer: unknown }).transformer
      ).toBe(transformer);
    });

    it("creates RefinementSchema with default message via .refine()", () => {
      const predicate = (val: string) => val.length > 3;
      const refinedDefault = schema.refine(predicate);
      expect(refinedDefault).toBeInstanceOf(RefinementSchema);
      expect(
        (refinedDefault as unknown as { inner: unknown; refinement: unknown; message: unknown }).message
      ).toBe("Invalid input");
    });

    it("creates RefinementSchema with custom message via .refine()", () => {
      const predicate = (val: string) => val.length > 3;
      const refinedCustom = schema.refine(predicate, "Must be > 3 chars");
      expect(refinedCustom).toBeInstanceOf(RefinementSchema);
      expect(
        (refinedCustom as unknown as { inner: unknown; refinement: unknown; message: unknown }).message
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

    it("creates PipeSchema with .pipe()", () => {
      const nextSchema = new SyncSuccessSchema();
      const piped = schema.pipe(nextSchema);
      expect(piped).toBeInstanceOf(PipeSchema);
      expect(
        (piped as unknown as { first: unknown; second: unknown }).second
      ).toBe(nextSchema);
    });
  });

  describe("Unregistered Bridge Error Guards", () => {
    const schema = new SyncSuccessSchema();

    it("throws when registry bridges are not configured", () => {
      delete schemaRegistry.optional;
      delete schemaRegistry.nullable;
      delete schemaRegistry.default;
      delete schemaRegistry.prefault;
      delete schemaRegistry.catch;
      delete schemaRegistry.transform;
      delete schemaRegistry.refine;
      delete schemaRegistry.superRefine;
      delete schemaRegistry.pipe;
      delete schemaRegistry.readonly;

      expect(() => schema.optional()).toThrowError("OptionalSchema not registered");
      expect(() => schema.nullable()).toThrowError("NullableSchema not registered");
      expect(() => schema.default("fallback")).toThrowError("DefaultSchema not registered");
      expect(() => schema.prefault("fallback")).toThrowError("PrefaultSchema not registered");
      expect(() => schema.catch("fallback")).toThrowError("CatchSchema not registered");
      expect(() => schema.transform((v) => v)).toThrowError("TransformSchema not registered");
      expect(() => schema.refine(() => true)).toThrowError("RefinementSchema not registered");
      expect(() => schema.superRefine(() => {})).toThrowError("SuperRefineSchema not registered");
      expect(() => schema.pipe(schema)).toThrowError("PipeSchema not registered");
      expect(() => schema.readonly()).toThrowError("ReadonlySchema not registered");
    });
  });
});
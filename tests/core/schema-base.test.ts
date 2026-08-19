import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  Schema,
  registerSchemaConstructor,
  getCtor,
  schemaRegistry,
  type RefinementContext,
} from "../../src/core/schema-base.js";
import { ValidationError } from "../../src/core/error.js";
import type { ParseContext } from "../../src/core/context.js";
import {
  makeSuccess,
  makeFailure,
  type DynamicParseReturnType,
  type AsyncParseReturnType,
} from "../../src/core/result.js";

// Mock Constructors to verify schema registry integration
class MockOptionalSchema {
  constructor(public inner: unknown) {}
}
class MockNullableSchema {
  constructor(public inner: unknown) {}
}
class MockDefaultSchema {
  constructor(public inner: unknown, public defaultValue: unknown) {}
}
class MockPrefaultSchema {
  constructor(public inner: unknown, public defaultValue: unknown) {}
}
class MockCatchSchema {
  constructor(public inner: unknown, public catchValue: unknown) {}
}
class MockUnionSchema {
  constructor(public schemas: unknown[]) {}
}
class MockIntersectionSchema {
  constructor(public left: unknown, public right: unknown) {}
}
class MockRefinementSchema {
  constructor(
    public inner: unknown,
    public predicate: unknown,
    public message: unknown
  ) {}
}
class MockSuperRefineSchema {
  constructor(public inner: unknown, public refinement: unknown) {}
}
class MockTransformSchema {
  constructor(public inner: unknown, public transformer: unknown) {}
}
class MockPipeSchema {
  constructor(public inner: unknown, public nextSchema: unknown) {}
}

// Test Harness Concrete Schemas
class SyncTestSchema extends Schema<string> {
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

class AsyncTestSchema extends Schema<string> {
  async _parse(
    input: unknown,
    _ctx: ParseContext
  ): AsyncParseReturnType<string> {
    await new Promise((res) => setTimeout(res, 2));
    if (typeof input === "string") {
      return makeSuccess(input.toUpperCase());
    }
    return makeFailure([
      {
        code: "invalid_type",
        path: [],
        message: "Expected string async",
        expected: "string",
        received: typeof input,
      },
    ]);
  }
}

class ThrowingSchema extends Schema<string> {
  _parse(_input: unknown, _ctx: ParseContext): DynamicParseReturnType<string> {
    throw new TypeError("Uncaught runtime exception");
  }
}

describe("Schema Core & Registry Module", () => {
  beforeEach(() => {
    // Clear and re-populate the schema registry before each test
    for (const key of Object.keys(schemaRegistry)) {
      delete schemaRegistry[key];
    }

    registerSchemaConstructor("OptionalSchema", MockOptionalSchema);
    registerSchemaConstructor("NullableSchema", MockNullableSchema);
    registerSchemaConstructor("DefaultSchema", MockDefaultSchema);
    registerSchemaConstructor("PrefaultSchema", MockPrefaultSchema);
    registerSchemaConstructor("CatchSchema", MockCatchSchema);
    registerSchemaConstructor("UnionSchema", MockUnionSchema);
    registerSchemaConstructor("IntersectionSchema", MockIntersectionSchema);
    registerSchemaConstructor("RefinementSchema", MockRefinementSchema);
    registerSchemaConstructor("SuperRefineSchema", MockSuperRefineSchema);
    registerSchemaConstructor("TransformSchema", MockTransformSchema);
    registerSchemaConstructor("PipeSchema", MockPipeSchema);
  });

  // ==========================================
  // Schema Registry Functions
  // ==========================================
  describe("Schema Registry (registerSchemaConstructor & getCtor)", () => {
    it("registers and retrieves a schema constructor", () => {
      class CustomSchema {}
      registerSchemaConstructor("CustomSchema", CustomSchema);
      expect(getCtor("CustomSchema")).toBe(CustomSchema);
    });

    it("throws an error when attempting to retrieve an unregistered constructor", () => {
      expect(() => getCtor("UnregisteredSchema")).toThrowError(
        "Schema constructor 'UnregisteredSchema' is not registered in schemaRegistry."
      );
    });
  });

  // ==========================================
  // Synchronous Parsing (parse, safeParse)
  // ==========================================
  describe("Synchronous Parsing", () => {
    const schema = new SyncTestSchema();

    it("returns parsed value on successful synchronous parse()", () => {
      expect(schema.parse("valid input")).toBe("valid input");
    });

    it("throws ValidationError when synchronous parse() fails", () => {
      expect(() => schema.parse(12345)).toThrowError(ValidationError);
      try {
        schema.parse(12345);
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        expect((err as ValidationError).issues[0]?.message).toBe(
          "Expected string"
        );
      }
    });

    it("throws an error when parse() encounters an asynchronous operation", () => {
      const asyncSchema = new AsyncTestSchema();
      expect(() => asyncSchema.parse("test")).toThrowError(
        "Synchronous parse encountered an asynchronous operation. Use .parseAsync() instead."
      );
    });

    it("returns { success: true, data } on safeParse() success", () => {
      const res = schema.safeParse("safe data");
      expect(res).toEqual({
        success: true,
        data: "safe data",
      });
    });

    it("returns { success: false, error } on safeParse() validation failure", () => {
      const res = schema.safeParse(999);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(ValidationError);
        expect(res.error.issues).toHaveLength(1);
      }
    });

    it("re-throws unexpected non-ValidationError exceptions in safeParse()", () => {
      const throwingSchema = new ThrowingSchema();
      expect(() => throwingSchema.safeParse("trigger")).toThrowError(
        TypeError
      );
    });
  });

  // ==========================================
  // Asynchronous Parsing (parseAsync, safeParseAsync, spa)
  // ==========================================
  describe("Asynchronous Parsing", () => {
    const syncSchema = new SyncTestSchema();
    const asyncSchema = new AsyncTestSchema();

    it("correctly handles synchronous schema resolution inside parseAsync()", async () => {
      const res = await syncSchema.parseAsync("sync value");
      expect(res).toBe("sync value");
    });

    it("correctly resolves asynchronous promises inside parseAsync()", async () => {
      const res = await asyncSchema.parseAsync("async value");
      expect(res).toBe("ASYNC VALUE");
    });

    it("throws ValidationError on failed parseAsync()", async () => {
      await expect(asyncSchema.parseAsync(123)).rejects.toThrowError(
        ValidationError
      );
    });

    it("returns { success: true, data } on successful safeParseAsync()", async () => {
      const res = await asyncSchema.safeParseAsync("valid safe async");
      expect(res).toEqual({
        success: true,
        data: "VALID SAFE ASYNC",
      });
    });

    it("returns { success: false, error } on failed safeParseAsync()", async () => {
      const res = await asyncSchema.safeParseAsync(false);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(ValidationError);
      }
    });

    it("re-throws unexpected non-ValidationError exceptions in safeParseAsync()", async () => {
      const throwingSchema = new ThrowingSchema();
      await expect(throwingSchema.safeParseAsync("test")).rejects.toThrowError(
        TypeError
      );
    });

    it("delegates spa() as an alias to safeParseAsync()", async () => {
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

  // ==========================================
  // Metadata Management (describe, meta)
  // ==========================================
  describe("Metadata Management", () => {
    it("sets description fluently via .describe() and returns this", () => {
      const schema = new SyncTestSchema();
      const ref = schema.describe("Input string format");

      expect(ref).toBe(schema);
      expect(schema.metadata.description).toBe("Input string format");
    });

    it("initializes and freezes metadata when .meta() is first called", () => {
      const schema = new SyncTestSchema();
      const ref = schema.meta({ tag: "user", level: 1 });

      expect(ref).toBe(schema);
      expect(schema.metadata.meta).toEqual({ tag: "user", level: 1 });
      expect(Object.isFrozen(schema.metadata.meta)).toBe(true);
    });

    it("merges additional metadata cleanly into previously existing meta", () => {
      const schema = new SyncTestSchema();
      schema.meta({ first: "1" });
      schema.meta({ second: "2" });

      expect(schema.metadata.meta).toEqual({
        first: "1",
        second: "2",
      });
      expect(Object.isFrozen(schema.metadata.meta)).toBe(true);
    });
  });

  // ==========================================
  // Modifier and Combinator Factory Methods
  // ==========================================
  describe("Modifier and Combinator Factories", () => {
    const schema = new SyncTestSchema();

    it("instantiates OptionalSchema via .optional()", () => {
      const res = schema.optional() as unknown as MockOptionalSchema;
      expect(res).toBeInstanceOf(MockOptionalSchema);
      expect(res.inner).toBe(schema);
    });

    it("instantiates NullableSchema via .nullable()", () => {
      const res = schema.nullable() as unknown as MockNullableSchema;
      expect(res).toBeInstanceOf(MockNullableSchema);
      expect(res.inner).toBe(schema);
    });

    it("instantiates NullableSchema(OptionalSchema) via .nullish()", () => {
      const res = schema.nullish() as unknown as MockNullableSchema;
      expect(res).toBeInstanceOf(MockNullableSchema);
      expect(res.inner).toBeInstanceOf(MockOptionalSchema);
      expect((res.inner as MockOptionalSchema).inner).toBe(schema);
    });

    it("instantiates DefaultSchema via .default()", () => {
      const res = schema.default("default_value") as unknown as MockDefaultSchema;
      expect(res).toBeInstanceOf(MockDefaultSchema);
      expect(res.inner).toBe(schema);
      expect(res.defaultValue).toBe("default_value");
    });

    it("instantiates PrefaultSchema via .prefault()", () => {
      const factory = () => "dynamic_prefault";
      const res = schema.prefault(factory) as unknown as MockPrefaultSchema;
      expect(res).toBeInstanceOf(MockPrefaultSchema);
      expect(res.inner).toBe(schema);
      expect(res.defaultValue).toBe(factory);
    });

    it("instantiates CatchSchema via .catch()", () => {
      const res = schema.catch("fallback") as unknown as MockCatchSchema;
      expect(res).toBeInstanceOf(MockCatchSchema);
      expect(res.inner).toBe(schema);
      expect(res.catchValue).toBe("fallback");
    });

    it("instantiates UnionSchema via .or()", () => {
      const other = new SyncTestSchema();
      const res = schema.or(other) as unknown as MockUnionSchema;
      expect(res).toBeInstanceOf(MockUnionSchema);
      expect(res.schemas).toEqual([schema, other]);
    });

    it("instantiates IntersectionSchema via .and()", () => {
      const other = new SyncTestSchema();
      const res = schema.and(other) as unknown as MockIntersectionSchema;
      expect(res).toBeInstanceOf(MockIntersectionSchema);
      expect(res.left).toBe(schema);
      expect(res.right).toBe(other);
    });

    it("instantiates RefinementSchema with default message via .refine()", () => {
      const predicate = (val: string) => val.length > 0;
      const res = schema.refine(predicate) as unknown as MockRefinementSchema;
      expect(res).toBeInstanceOf(MockRefinementSchema);
      expect(res.inner).toBe(schema);
      expect(res.predicate).toBe(predicate);
      expect(res.message).toBe("Invalid input");
    });

    it("instantiates RefinementSchema with custom message via .refine()", () => {
      const predicate = (val: string) => val.length > 3;
      const res = schema.refine(predicate, "Must be > 3") as unknown as MockRefinementSchema;
      expect(res).toBeInstanceOf(MockRefinementSchema);
      expect(res.inner).toBe(schema);
      expect(res.predicate).toBe(predicate);
      expect(res.message).toBe("Must be > 3");
    });

    it("instantiates SuperRefineSchema via .superRefine()", () => {
      const refinement = (val: string, ctx: RefinementContext) => {
        if (val === "") ctx.addIssue({ code: "custom", message: "Empty string" });
      };
      const res = schema.superRefine(refinement) as unknown as MockSuperRefineSchema;
      expect(res).toBeInstanceOf(MockSuperRefineSchema);
      expect(res.inner).toBe(schema);
      expect(res.refinement).toBe(refinement);
    });

    it("delegates .check() to .refine() with default and custom message", () => {
      const refineSpy = vi.spyOn(schema, "refine");
      const validator = (val: string) => val.startsWith("a");

      schema.check(validator);
      expect(refineSpy).toHaveBeenCalledWith(validator, "Check failed");

      schema.check(validator, "Must start with a");
      expect(refineSpy).toHaveBeenCalledWith(validator, "Must start with a");
      refineSpy.mockRestore();
    });

    it("instantiates TransformSchema via .transform()", () => {
      const transformer = (val: string) => val.length;
      const res = schema.transform(transformer) as unknown as MockTransformSchema;
      expect(res).toBeInstanceOf(MockTransformSchema);
      expect(res.inner).toBe(schema);
      expect(res.transformer).toBe(transformer);
    });

    it("instantiates PipeSchema via .pipe()", () => {
      const nextSchema = new SyncTestSchema();
      const res = schema.pipe(nextSchema) as unknown as MockPipeSchema;
      expect(res).toBeInstanceOf(MockPipeSchema);
      expect(res.inner).toBe(schema);
      expect(res.nextSchema).toBe(nextSchema);
    });
  });
});
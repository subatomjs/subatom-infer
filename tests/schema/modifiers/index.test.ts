import { describe, it, expect, expectTypeOf } from "vitest";
import * as Modifiers from "../../../src/schemas/modifiers/index.js";
import {
  OptionalSchema,
  NullableSchema,
  DefaultSchema,
  PrefaultSchema,
  RefinementSchema,
  SuperRefineSchema,
  TransformSchema,
  CatchSchema,
  PipeSchema,
  ReadonlySchema,
  PreprocessSchema,
  BrandSchema,
  Codec,
  BrandSymbol,
  type Brand,
} from "../../../src/schemas/modifiers/index.js";
import { schemaRegistry, Schema, type RefinementContext } from "../../../src/core/schema.js";
import { addIssue, type ParseContext } from "../../../src/core/context.js";
import {
  makeSuccess,
  makeFailure,
  type DynamicParseReturnType,
} from "../../../src/core/result.js";

// --- Test Harness Concrete Schema ---
class MockStringSchema extends Schema<string> {
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

class MockNumberSchema extends Schema<number> {
  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<number> {
    if (typeof input === "number") return makeSuccess(input);
    addIssue(ctx, {
      code: "invalid_type",
      message: "Expected number",
      expected: "number",
      received: typeof input,
    });
    return makeFailure(ctx.issues);
  }
}

const dummyStringSchema = new MockStringSchema();
const dummyNumberSchema = new MockNumberSchema();

describe("Modifiers Barrel & Registry Bridge (src/schemas/modifiers/index.ts)", () => {
  // ==========================================
  // Barrel Exports Verification
  // ==========================================
  describe("Barrel Namespace Re-exports", () => {
    it("re-exports all modifier schema classes on the namespace", () => {
      expect(Modifiers.OptionalSchema).toBe(OptionalSchema);
      expect(Modifiers.NullableSchema).toBe(NullableSchema);
      expect(Modifiers.DefaultSchema).toBe(DefaultSchema);
      expect(Modifiers.PrefaultSchema).toBe(PrefaultSchema);
      expect(Modifiers.RefinementSchema).toBe(RefinementSchema);
      expect(Modifiers.SuperRefineSchema).toBe(SuperRefineSchema);
      expect(Modifiers.TransformSchema).toBe(TransformSchema);
      expect(Modifiers.CatchSchema).toBe(CatchSchema);
      expect(Modifiers.PipeSchema).toBe(PipeSchema);
      expect(Modifiers.ReadonlySchema).toBe(ReadonlySchema);
      expect(Modifiers.PreprocessSchema).toBe(PreprocessSchema);
      expect(Modifiers.BrandSchema).toBe(BrandSchema);
      expect(Modifiers.Codec).toBe(Codec);
      expect(Modifiers.BrandSymbol).toBe(BrandSymbol);
    });

    it("verifies type-level exports from modifiers barrel", () => {
      type BrandedStr = Brand<string, "UserId">;
      expectTypeOf<BrandedStr>().toMatchTypeOf<string & { readonly [BrandSymbol]: "UserId" }>();
    });
  });

  // ==========================================
  // Direct Registry Bridge Function Tests
  // ==========================================
  describe("schemaRegistry Bridge Function Invocations", () => {
    it("instantiates OptionalSchema via schemaRegistry.optional", () => {
      expect(schemaRegistry.optional).toBeDefined();
      const res = schemaRegistry.optional!(dummyStringSchema);
      expect(res).toBeInstanceOf(OptionalSchema);
      expect((res as unknown as OptionalSchema<string, string>).innerSchema).toBe(dummyStringSchema);
    });

    it("instantiates NullableSchema via schemaRegistry.nullable", () => {
      expect(schemaRegistry.nullable).toBeDefined();
      const res = schemaRegistry.nullable!(dummyStringSchema);
      expect(res).toBeInstanceOf(NullableSchema);
      expect((res as unknown as NullableSchema<string, string>).innerSchema).toBe(dummyStringSchema);
    });

    it("instantiates DefaultSchema via schemaRegistry.default", () => {
      expect(schemaRegistry.default).toBeDefined();
      const res = schemaRegistry.default!(dummyStringSchema, "default_val");
      expect(res).toBeInstanceOf(DefaultSchema);
      expect((res as unknown as DefaultSchema<string, string>).innerSchema).toBe(dummyStringSchema);
      expect((res as unknown as DefaultSchema<string, string>).defaultValue).toBe("default_val");
    });

    it("instantiates PrefaultSchema via schemaRegistry.prefault", () => {
      expect(schemaRegistry.prefault).toBeDefined();
      const res = schemaRegistry.prefault!(dummyStringSchema, "prefault_val");
      expect(res).toBeInstanceOf(PrefaultSchema);
      expect((res as unknown as PrefaultSchema<string, string>).innerSchema).toBe(dummyStringSchema);
      expect((res as unknown as PrefaultSchema<string, string>).defaultValue).toBe("prefault_val");
    });

    it("instantiates RefinementSchema via schemaRegistry.refine", () => {
      expect(schemaRegistry.refine).toBeDefined();
      const predicate = (val: string) => val.length > 0;
      const res = schemaRegistry.refine!(dummyStringSchema, predicate, "Must not be empty");
      expect(res).toBeInstanceOf(RefinementSchema);
      expect((res as unknown as RefinementSchema<string, string>).innerSchema).toBe(dummyStringSchema);
      expect((res as unknown as RefinementSchema<string, string>).refinement).toBe(predicate);
      expect((res as unknown as RefinementSchema<string, string>).message).toBe("Must not be empty");
    });

    it("instantiates SuperRefineSchema via schemaRegistry.superRefine", () => {
      expect(schemaRegistry.superRefine).toBeDefined();
      const refiner = (_val: string, _ctx: RefinementContext) => {};
      const res = schemaRegistry.superRefine!(dummyStringSchema, refiner);
      expect(res).toBeInstanceOf(SuperRefineSchema);
      expect((res as unknown as SuperRefineSchema<string, string>).innerSchema).toBe(dummyStringSchema);
      expect((res as unknown as SuperRefineSchema<string, string>).refinement).toBe(refiner);
    });

    it("instantiates TransformSchema via schemaRegistry.transform", () => {
      expect(schemaRegistry.transform).toBeDefined();
      const transformer = (val: string) => val.length;
      const res = schemaRegistry.transform!(dummyStringSchema, transformer);
      expect(res).toBeInstanceOf(TransformSchema);
      expect((res as unknown as TransformSchema<string, string, number>).innerSchema).toBe(dummyStringSchema);
      expect((res as unknown as TransformSchema<string, string, number>).transformer).toBe(transformer);
    });

    it("instantiates PipeSchema via schemaRegistry.pipe", () => {
      expect(schemaRegistry.pipe).toBeDefined();
      const res = schemaRegistry.pipe!(dummyStringSchema, dummyNumberSchema as any);
      expect(res).toBeInstanceOf(PipeSchema);
      expect((res as unknown as PipeSchema<string, string, number>).first).toBe(dummyStringSchema);
      expect((res as unknown as PipeSchema<string, string, number>).second).toBe(dummyNumberSchema);
    });

    it("instantiates ReadonlySchema via schemaRegistry.readonly", () => {
      expect(schemaRegistry.readonly).toBeDefined();
      const res = schemaRegistry.readonly!(dummyStringSchema);
      expect(res).toBeInstanceOf(ReadonlySchema);
      expect((res as unknown as ReadonlySchema<string, string>).innerSchema).toBe(dummyStringSchema);
    });

    it("instantiates CatchSchema via schemaRegistry.catch", () => {
      expect(schemaRegistry.catch).toBeDefined();
      const res = schemaRegistry.catch!(dummyStringSchema, "caught_val");
      expect(res).toBeInstanceOf(CatchSchema);
      expect((res as unknown as CatchSchema<string, string>).innerSchema).toBe(dummyStringSchema);
      expect((res as unknown as CatchSchema<string, string>).catchValue).toBe("caught_val");
    });
  });

  // ==========================================
  // End-to-End Fluent Chaining Integration
  // ==========================================
  describe("Fluent Method Chaining on Schema Base", () => {
    it("chains .optional(), .nullable(), and .nullish() fluently", () => {
      const opt = dummyStringSchema.optional();
      expect(opt).toBeInstanceOf(OptionalSchema);
      expect(opt.parse(undefined)).toBeUndefined();
      expect(opt.parse("hello")).toBe("hello");

      const nul = dummyStringSchema.nullable();
      expect(nul).toBeInstanceOf(NullableSchema);
      expect(nul.parse(null)).toBeNull();
      expect(nul.parse("hello")).toBe("hello");

      const nullish = dummyStringSchema.nullish();
      expect(nullish).toBeInstanceOf(OptionalSchema);
      expect(nullish.parse(undefined)).toBeUndefined();
      expect(nullish.parse(null)).toBeNull();
      expect(nullish.parse("hello")).toBe("hello");
    });

    it("chains .default() and .prefault() fluently", () => {
      const def = dummyStringSchema.default("fallback");
      expect(def).toBeInstanceOf(DefaultSchema);
      expect(def.parse(undefined)).toBe("fallback");

      const pref = dummyStringSchema.prefault("prefilled");
      expect(pref).toBeInstanceOf(PrefaultSchema);
      expect(pref.parse(undefined)).toBe("prefilled");
    });

    it("chains .refine() and .superRefine() fluently", () => {
      const refined = dummyStringSchema.refine((s) => s.length > 2, "Too short");
      expect(refined).toBeInstanceOf(RefinementSchema);
      expect(refined.parse("abc")).toBe("abc");
      expect(refined.safeParse("a").success).toBe(false);

      const superRefined = dummyStringSchema.superRefine((s, ctx) => {
        if (!s.startsWith("sub_")) {
          ctx.addIssue({ code: "custom", message: "Must start with sub_" });
        }
      });
      expect(superRefined).toBeInstanceOf(SuperRefineSchema);
      expect(superRefined.parse("sub_atomic")).toBe("sub_atomic");
      expect(superRefined.safeParse("atomic").success).toBe(false);
    });

    it("chains .transform(), .pipe(), .readonly(), and .catch() fluently", () => {
      const transformed = dummyStringSchema.transform((s) => s.toUpperCase());
      expect(transformed).toBeInstanceOf(TransformSchema);
      expect(transformed.parse("lowercase")).toBe("LOWERCASE");

      const piped = dummyStringSchema.pipe(dummyStringSchema);
      expect(piped).toBeInstanceOf(PipeSchema);
      expect(piped.parse("piped")).toBe("piped");

      const readonlySchema = dummyStringSchema.readonly();
      expect(readonlySchema).toBeInstanceOf(ReadonlySchema);
      expect(readonlySchema.parse("data")).toBe("data");

      const caught = dummyStringSchema.catch("default_on_error");
      expect(caught).toBeInstanceOf(CatchSchema);
      expect(caught.parse(12345)).toBe("default_on_error");
    });
  });
});
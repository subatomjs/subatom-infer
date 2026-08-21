/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import * as Primitives from "../../../src/schemas/primitives/index.js";
import {
  StringSchema,
  NumberSchema,
  BigIntSchema,
  BooleanSchema,
  DateSchema,
  LiteralSchema,
  NullSchema,
  UndefinedSchema,
  AnySchema,
  UnknownSchema,
  NeverSchema,
  SymbolSchema,
  NaNSchema,
  CoercedStringSchema,
  CoercedNumberSchema,
  CoercedBooleanSchema,
  CoercedBigIntSchema,
  CoercedDateSchema,
  coerce,
  type StringCheck,
  type NumberCheck,
  type BigIntCheck,
  type LiteralValue,
} from "../../../src/schemas/primitives/index.js";

describe("Primitives Barrel Index (src/schemas/primitives/index.ts)", () => {
  // ==========================================
  // Barrel Namespace & Named Export Integrity
  // ==========================================
  describe("Exports Integrity", () => {
    it("exports all primitive schema constructors on the namespace", () => {
      // String & Number
      expect(Primitives.StringSchema).toBe(StringSchema);
      expect(Primitives.NumberSchema).toBe(NumberSchema);

      // BigInt
      expect(Primitives.BigIntSchema).toBe(BigIntSchema);

      // Advanced Primitives
      expect(Primitives.BooleanSchema).toBe(BooleanSchema);
      expect(Primitives.DateSchema).toBe(DateSchema);
      expect(Primitives.LiteralSchema).toBe(LiteralSchema);
      expect(Primitives.NullSchema).toBe(NullSchema);
      expect(Primitives.UndefinedSchema).toBe(UndefinedSchema);
      expect(Primitives.AnySchema).toBe(AnySchema);
      expect(Primitives.UnknownSchema).toBe(UnknownSchema);
      expect(Primitives.NeverSchema).toBe(NeverSchema);
      expect(Primitives.SymbolSchema).toBe(SymbolSchema);
      expect(Primitives.NaNSchema).toBe(NaNSchema);

      // Coercion Classes & Factory
      expect(Primitives.CoercedStringSchema).toBe(CoercedStringSchema);
      expect(Primitives.CoercedNumberSchema).toBe(CoercedNumberSchema);
      expect(Primitives.CoercedBooleanSchema).toBe(CoercedBooleanSchema);
      expect(Primitives.CoercedBigIntSchema).toBe(CoercedBigIntSchema);
      expect(Primitives.CoercedDateSchema).toBe(CoercedDateSchema);
      expect(Primitives.coerce).toBe(coerce);
    });
  });

  // ==========================================
  // Direct Instantiation & Validation via Barrel
  // ==========================================
  describe("Instantiation & Parsing via Barrel Exports", () => {
    it("instantiates and validates StringSchema", () => {
      const schema = new Primitives.StringSchema();
      expect(schema).toBeInstanceOf(Primitives.StringSchema);
      expect(schema.parse("hello")).toBe("hello");
      expect(schema.safeParse(123).success).toBe(false);
    });

    it("instantiates and validates NumberSchema", () => {
      const schema = new Primitives.NumberSchema();
      expect(schema).toBeInstanceOf(Primitives.NumberSchema);
      expect(schema.parse(42)).toBe(42);
      expect(schema.safeParse("42").success).toBe(false);
    });

    it("instantiates and validates BigIntSchema", () => {
      const schema = new Primitives.BigIntSchema();
      expect(schema).toBeInstanceOf(Primitives.BigIntSchema);
      expect(schema.parse(100n)).toBe(100n);
      expect(schema.safeParse(100).success).toBe(false);
    });

    it("instantiates and validates BooleanSchema", () => {
      const schema = new Primitives.BooleanSchema();
      expect(schema).toBeInstanceOf(Primitives.BooleanSchema);
      expect(schema.parse(true)).toBe(true);
      expect(schema.safeParse("true").success).toBe(false);
    });

    it("instantiates and validates DateSchema", () => {
      const schema = new Primitives.DateSchema();
      const now = new Date("2026-08-20T12:00:00.000Z");
      expect(schema).toBeInstanceOf(Primitives.DateSchema);
      expect(schema.parse(now)).toEqual(now);
      expect(schema.safeParse("2026-08-20").success).toBe(false);
    });

    it("instantiates and validates LiteralSchema", () => {
      const schema = new Primitives.LiteralSchema("CONSTANT");
      expect(schema).toBeInstanceOf(Primitives.LiteralSchema);
      expect(schema.value).toBe("CONSTANT");
      expect(schema.parse("CONSTANT")).toBe("CONSTANT");
      expect(schema.safeParse("OTHER").success).toBe(false);
    });

    it("instantiates and validates NullSchema and UndefinedSchema", () => {
      const nullSchema = new Primitives.NullSchema();
      expect(nullSchema.parse(null)).toBeNull();
      expect(nullSchema.safeParse(undefined).success).toBe(false);

      const undefinedSchema = new Primitives.UndefinedSchema();
      expect(undefinedSchema.parse(undefined)).toBeUndefined();
      expect(undefinedSchema.safeParse(null).success).toBe(false);
    });

    it("instantiates and validates AnySchema and UnknownSchema", () => {
      const anySchema = new Primitives.AnySchema();
      const unknownSchema = new Primitives.UnknownSchema();

      expect(anySchema.parse(123)).toBe(123);
      expect(unknownSchema.parse("data")).toBe("data");
    });

    it("instantiates and validates NeverSchema, SymbolSchema, and NaNSchema", () => {
      const neverSchema = new Primitives.NeverSchema();
      expect(neverSchema.safeParse("anything").success).toBe(false);

      const sym = Symbol("barrel_sym");
      const symbolSchema = new Primitives.SymbolSchema();
      expect(symbolSchema.parse(sym)).toBe(sym);
      expect(symbolSchema.safeParse("not_a_sym").success).toBe(false);

      const nanSchema = new Primitives.NaNSchema();
      expect(Number.isNaN(nanSchema.parse(Number.NaN))).toBe(true);
      expect(nanSchema.safeParse(123).success).toBe(false);
    });
  });

  // ==========================================
  // Coercion Exports via Barrel
  // ==========================================
  describe("Coercion Exports via Barrel", () => {
    it("instantiates coerced schemas directly and via coerce namespace", () => {
      expect(new Primitives.CoercedStringSchema().parse(123)).toBe("123");
      expect(Primitives.coerce.string().parse(true)).toBe("true");

      expect(new Primitives.CoercedNumberSchema().parse("42")).toBe(42);
      expect(Primitives.coerce.number().parse("3.14")).toBe(3.14);

      expect(new Primitives.CoercedBooleanSchema().parse("false")).toBe(false);
      expect(Primitives.coerce.boolean().parse("true")).toBe(true);

      expect(new Primitives.CoercedBigIntSchema().parse("500")).toBe(500n);
      expect(Primitives.coerce.bigint().parse(500)).toBe(500n);

      const dateStr = "2026-08-20T12:00:00.000Z";
      expect(new Primitives.CoercedDateSchema().parse(dateStr)).toEqual(new Date(dateStr));
      expect(Primitives.coerce.date().parse(dateStr)).toEqual(new Date(dateStr));
    });
  });

  // ==========================================
  // Static Type-Level Exports Verification
  // ==========================================
  describe("Type-Level Exports Verification", () => {
    it("validates all exported interface and type aliases", () => {
      expectTypeOf<LiteralValue>().toEqualTypeOf<
        string | number | boolean | bigint | symbol | null | undefined
      >();

      expectTypeOf<StringCheck>().toMatchTypeOf<{
        kind: string;
        validate: (val: string) => boolean;
        mutate?: (val: string) => string;
        message: string;
        metadata?: Record<string, unknown>;
      }>();

      expectTypeOf<NumberCheck>().toMatchTypeOf<{
        kind: string;
        validate: (val: number) => boolean;
        message: string;
        metadata?: Record<string, unknown>;
      }>();

      expectTypeOf<BigIntCheck>().toMatchTypeOf<{
        kind: string;
        validate: (val: bigint) => boolean;
        message: string;
        limit?: bigint;
      }>();
    });
  });
});
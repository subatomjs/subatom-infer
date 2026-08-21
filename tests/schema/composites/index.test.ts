/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */


import { describe, it, expect, expectTypeOf } from "vitest";
import * as Composites from "../../../src/schemas/composites/index.js";
import {
  EnumSchema,
  NativeEnumSchema,
  ObjectSchema,
  ArraySchema,
  TupleSchema,
  RecordSchema,
  SetSchema,
  MapSchema,
  UnionSchema,
  DiscriminatedUnionSchema,
  IntersectionSchema,
  LazySchema,
  type RawShape,
  type InferObjectOutput,
  type InferObjectInput,
  type ObjectPolicy,
  type TupleSchemas,
  type InferTupleOutput,
  type InferTupleInput,
  type UnionOptions,
} from "../../../src/schemas/composites/index.js";

describe("Composites Barrel Index (src/schemas/composites/index.ts)", () => {
  it("exports all composite schema constructors on the namespace", () => {
    // Enum exports
    expect(Composites.EnumSchema).toBe(EnumSchema);
    expect(Composites.NativeEnumSchema).toBe(NativeEnumSchema);

    // Object exports
    expect(Composites.ObjectSchema).toBe(ObjectSchema);

    // Collection exports
    expect(Composites.ArraySchema).toBe(ArraySchema);
    expect(Composites.TupleSchema).toBe(TupleSchema);
    expect(Composites.RecordSchema).toBe(RecordSchema);
    expect(Composites.SetSchema).toBe(SetSchema);
    expect(Composites.MapSchema).toBe(MapSchema);

    // Combinator exports
    expect(Composites.UnionSchema).toBe(UnionSchema);
    expect(Composites.DiscriminatedUnionSchema).toBe(DiscriminatedUnionSchema);
    expect(Composites.IntersectionSchema).toBe(IntersectionSchema);
    expect(Composites.LazySchema).toBe(LazySchema);
  });

  it("instantiates re-exported schema classes correctly", () => {
    const enumSchema = new Composites.EnumSchema(["admin", "user"] as const);
    expect(enumSchema).toBeInstanceOf(Composites.EnumSchema);
    expect(enumSchema.options).toEqual(["admin", "user"]);

    const objSchema = new Composites.ObjectSchema({});
    expect(objSchema).toBeInstanceOf(Composites.ObjectSchema);

    const arrSchema = new Composites.ArraySchema(enumSchema);
    expect(arrSchema).toBeInstanceOf(Composites.ArraySchema);

    const tupleSchema = new Composites.TupleSchema([enumSchema] as const);
    expect(tupleSchema).toBeInstanceOf(Composites.TupleSchema);

    const recordSchema = new Composites.RecordSchema(enumSchema, enumSchema);
    expect(recordSchema).toBeInstanceOf(Composites.RecordSchema);

    const setSchema = new Composites.SetSchema(enumSchema);
    expect(setSchema).toBeInstanceOf(Composites.SetSchema);

    const mapSchema = new Composites.MapSchema(enumSchema, enumSchema);
    expect(mapSchema).toBeInstanceOf(Composites.MapSchema);

    const unionSchema = new Composites.UnionSchema([enumSchema] as const);
    expect(unionSchema).toBeInstanceOf(Composites.UnionSchema);

    const lazySchema = new Composites.LazySchema(() => enumSchema);
    expect(lazySchema).toBeInstanceOf(Composites.LazySchema);
  });

  it("verifies type-level exports from all re-exported modules", () => {
    expectTypeOf<ObjectPolicy>().toEqualTypeOf<"strip" | "strict" | "passthrough">();
    expectTypeOf<RawShape>().toMatchTypeOf<Record<string, any>>();
    expectTypeOf<TupleSchemas>().toMatchTypeOf<readonly [any, ...any[]]>();
    expectTypeOf<UnionOptions>().toMatchTypeOf<readonly [any, ...any[]]>();

    type SampleShape = { a: EnumSchema<["admin"]> };
    expectTypeOf<InferObjectOutput<SampleShape>>().toEqualTypeOf<{ a: "admin" }>();
    expectTypeOf<InferObjectInput<SampleShape>>().toEqualTypeOf<{ a: "admin" }>();

    type SampleTuple = [EnumSchema<["admin"]>];
    expectTypeOf<InferTupleOutput<SampleTuple>>().toEqualTypeOf<["admin"]>();
    expectTypeOf<InferTupleInput<SampleTuple>>().toEqualTypeOf<["admin"]>();
  });
});
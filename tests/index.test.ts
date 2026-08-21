/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */


import { describe, it, expect, expectTypeOf } from "vitest";
import infer, {
  s,
  Schema,
  ValidationError,
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
  ArraySchema,
  TupleSchema,
  RecordSchema,
  SetSchema,
  MapSchema,
  ObjectSchema,
  EnumSchema,
  NativeEnumSchema,
  UnionSchema,
  DiscriminatedUnionSchema,
  IntersectionSchema,
  LazySchema,
  PreprocessSchema,
  PipeSchema,
  BrandSchema,
  Codec,
  FunctionSchema,
  PromiseSchema,
  FileSchema,
  CustomSchema,
  type Infer,
  type Input,
  type Output,
} from "../src/index.js";
import type { RawShape } from "../src/schemas/composites/object.js";

describe("Root Index & infer Facade (src/index.ts)", () => {
  // ==========================================
  // Exports & Compatibility Aliases
  // ==========================================
  describe("Exports & Compatibility Aliases", () => {
    it("exports default infer and alias s referencing the exact same facade", () => {
      expect(infer).toBe(s);
      expect(typeof infer).toBe("object");
      expect(typeof infer.string).toBe("function");
    });

    it("exports core base classes and error classes", () => {
      expect(Schema).toBeDefined();
      expect(ValidationError).toBeDefined();
      expect(CustomSchema).toBeDefined();
    });

    it("resolves static Infer, Input, and Output generic types correctly", () => {
      const userSchema = infer.object({
        name: infer.string(),
        age: infer.number(),
      });

      type UserOutput = Infer<typeof userSchema>;
      type UserInput = Input<typeof userSchema>;
      type UserOut = Output<typeof userSchema>;

      expectTypeOf<UserOutput>().toEqualTypeOf<{ name: string; age: number }>();
      expectTypeOf<UserInput>().toEqualTypeOf<{ name: string; age: number }>();
      expectTypeOf<UserOut>().toEqualTypeOf<{ name: string; age: number }>();
    });
  });

  // ==========================================
  // CustomSchema & infer.custom()
  // ==========================================
  describe("CustomSchema & infer.custom()", () => {
    it("parses valid input synchronously when validator returns true", () => {
      const customString = infer.custom<string>(
        (val) => typeof val === "string" && val.length > 2
      );
      expect(customString).toBeInstanceOf(CustomSchema);
      expect(customString.parse("hello")).toBe("hello");
    });

    it("fails synchronously with default message when validator returns false", () => {
      const customNum = infer.custom<number>((val) => typeof val === "number" && val > 0);
      const safe = customNum.safeParse(-1);

      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error).toBeInstanceOf(ValidationError);
        expect(safe.issues[0]?.message).toBe("Custom validation failed");
      }
    });

    it("fails synchronously with custom error message when provided", () => {
      const customSchema = infer.custom<string>(
        (val) => val === "allowed",
        "Value is strictly forbidden"
      );
      const safe = customSchema.safeParse("disallowed");

      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe("Value is strictly forbidden");
      }
    });

    it("throws Error when async validator is executed during synchronous parse()", () => {
      const asyncCustom = infer.custom<string>(async (val) => val === "valid");
      expect(() => asyncCustom.parse("valid")).toThrowError(
        "Asynchronous custom validator executed during synchronous parse."
      );
    });

    it("parses valid input asynchronously via parseAsync()", async () => {
      const asyncCustom = infer.custom<string>(async (val) => {
        await new Promise((res) => setTimeout(res, 2));
        return val === "async_valid";
      });

      const res = await asyncCustom.parseAsync("async_valid");
      expect(res).toBe("async_valid");
    });

    it("fails asynchronously with custom message via safeParseAsync()", async () => {
      const asyncCustom = infer.custom<string>(
        async (val) => {
          await new Promise((res) => setTimeout(res, 2));
          return val === "ok";
        },
        "Async check rejected"
      );

      const safe = await asyncCustom.safeParseAsync("bad");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe("Async check rejected");
      }
    });
  });

  // ==========================================
  // Primitive Factory Builders
  // ==========================================
  describe("Primitive Factory Builders", () => {
    it("instantiates each primitive schema correctly", () => {
      expect(infer.string()).toBeInstanceOf(StringSchema);
      expect(infer.number()).toBeInstanceOf(NumberSchema);
      expect(infer.bigint()).toBeInstanceOf(BigIntSchema);
      expect(infer.boolean()).toBeInstanceOf(BooleanSchema);
      expect(infer.date()).toBeInstanceOf(DateSchema);
      expect(infer.literal("ADMIN")).toBeInstanceOf(LiteralSchema);
      expect(infer.null()).toBeInstanceOf(NullSchema);
      expect(infer.undefined()).toBeInstanceOf(UndefinedSchema);
      expect(infer.void()).toBeInstanceOf(UndefinedSchema);
      expect(infer.any()).toBeInstanceOf(AnySchema);
      expect(infer.unknown()).toBeInstanceOf(UnknownSchema);
      expect(infer.never()).toBeInstanceOf(NeverSchema);
      expect(infer.symbol()).toBeInstanceOf(SymbolSchema);
      expect(infer.nan()).toBeInstanceOf(NaNSchema);
    });

    it("validates data through primitive schemas created via infer", () => {
      expect(infer.string().parse("str")).toBe("str");
      expect(infer.number().parse(42)).toBe(42);
      expect(infer.bigint().parse(10n)).toBe(10n);
      expect(infer.boolean().parse(false)).toBe(false);
      expect(infer.void().parse(undefined)).toBeUndefined();
      expect(infer.literal("ACTIVE").parse("ACTIVE")).toBe("ACTIVE");
    });
  });

  // ==========================================
  // Direct Format Shortcuts
  // ==========================================
  describe("Direct Format Shortcuts", () => {
    it("validates formats with default messages", () => {
      expect(infer.uuid().parse("123e4567-e89b-12d3-a456-426614174000")).toBe(
        "123e4567-e89b-12d3-a456-426614174000"
      );
      expect(infer.email().parse("dev@domain.com")).toBe("dev@domain.com");
    });

    it("fails with custom error messages when supplied", () => {
      const badUuid = infer.uuid("Invalid UUID custom").safeParse("invalid");
      expect(badUuid.success).toBe(false);
      if (!badUuid.success) {
        expect(badUuid.issues[0]?.message).toBe("Invalid UUID custom");
      }

      const badEmail = infer.email("Invalid email custom").safeParse("invalid");
      expect(badEmail.success).toBe(false);
      if (!badEmail.success) {
        expect(badEmail.issues[0]?.message).toBe("Invalid email custom");
      }
    });
  });

  // ==========================================
  // Composite Builders
  // ==========================================
  describe("Composite Builders", () => {
    it("instantiates ObjectSchema with object(), strictObject(), and passthroughObject()", () => {
      const standardObj = infer.object({ id: infer.number() });
      expect(standardObj).toBeInstanceOf(ObjectSchema);
      expect(standardObj.policy).toBe("strip");

      const strictObj = infer.strictObject({ id: infer.number() });
      expect(strictObj).toBeInstanceOf(ObjectSchema);
      expect(strictObj.policy).toBe("strict");

      const passObj = infer.passthroughObject({ id: infer.number() });
      expect(passObj).toBeInstanceOf(ObjectSchema);
      expect(passObj.policy).toBe("passthrough");
    });

    it("instantiates collections: array, tuple, record, set, map", () => {
      const arr = infer.array(infer.string());
      expect(arr).toBeInstanceOf(ArraySchema);
      expect(arr.parse(["a", "b"])).toEqual(["a", "b"]);

      const tup = infer.tuple([infer.string(), infer.number()] as const);
      expect(tup).toBeInstanceOf(TupleSchema);
      expect(tup.parse(["key", 100])).toEqual(["key", 100]);

      const rec = infer.record(infer.string(), infer.number());
      expect(rec).toBeInstanceOf(RecordSchema);
      expect(rec.parse({ x: 10, y: 20 })).toEqual({ x: 10, y: 20 });

      const setSchema = infer.set(infer.string());
      expect(setSchema).toBeInstanceOf(SetSchema);
      expect(setSchema.parse(new Set(["a"]))).toEqual(new Set(["a"]));

      const mapSchema = infer.map(infer.string(), infer.number());
      expect(mapSchema).toBeInstanceOf(MapSchema);
      const inputMap = new Map([["count", 1]]);
      expect(mapSchema.parse(inputMap)).toEqual(inputMap);
    });

    it("instantiates enum and nativeEnum schemas", () => {
      const roles = infer.enum(["ADMIN", "USER"] as const);
      expect(roles).toBeInstanceOf(EnumSchema);
      expect(roles.parse("ADMIN")).toBe("ADMIN");

      enum Mode {
        Dev = "DEV",
        Prod = "PROD",
      }
      const nativeEnumSchema = infer.nativeEnum(Mode);
      expect(nativeEnumSchema).toBeInstanceOf(NativeEnumSchema);
      expect(nativeEnumSchema.parse(Mode.Dev)).toBe(Mode.Dev);
    });
  });

  // ==========================================
  // Combinator Builders
  // ==========================================
  describe("Combinator Builders", () => {
    it("instantiates union from array of schemas or rest arguments", () => {
      const arrayUnion = infer.union([infer.string(), infer.number()] as const);
      expect(arrayUnion).toBeInstanceOf(UnionSchema);
      expect(arrayUnion.parse("test")).toBe("test");
      expect(arrayUnion.parse(10)).toBe(10);

      const restUnion = infer.union(infer.string(), infer.number(), infer.boolean());
      expect(restUnion).toBeInstanceOf(UnionSchema);
      expect(restUnion.parse(true)).toBe(true);
      expect(restUnion.parse("str")).toBe("str");
      expect(restUnion.parse(5)).toBe(5);
    });

it("instantiates discriminatedUnion, intersection, and lazy schemas", () => {
      const square = infer.object({
        kind: infer.literal("square"),
        size: infer.number(),
      });
      const circle = infer.object({
        kind: infer.literal("circle"),
        radius: infer.number(),
      });

      const discUnion = infer.discriminatedUnion("kind", [
        square as any,
        circle,
      ]);
      expect(discUnion).toBeInstanceOf(DiscriminatedUnionSchema);
      expect(discUnion.parse({ kind: "square", size: 4 })).toEqual({
        kind: "square",
        size: 4,
      });

      const inter = infer.intersection(
        infer.object({ a: infer.string() }),
        infer.object({ b: infer.number() })
      );
      expect(inter).toBeInstanceOf(IntersectionSchema);
      expect(inter.parse({ a: "test", b: 123 })).toEqual({ a: "test", b: 123 });

      type Tree = { value: string; child?: Tree };
      const treeSchema: Schema<Tree> = infer.lazy(() =>
        infer.object({
          value: infer.string(),
          child: treeSchema.optional(),
        })
      );
      expect(treeSchema).toBeInstanceOf(LazySchema);
      expect(treeSchema.parse({ value: "root" })).toEqual({
        value: "root",
        child: undefined,
      });
    });
  });

  // ==========================================
  // Modifiers & Transforms
  // ==========================================
  describe("Modifiers & Transforms", () => {
    it("instantiates preprocess, pipe, brand, and codec schemas", () => {
      const pre = infer.preprocess((v) => String(v), infer.string());
      expect(pre).toBeInstanceOf(PreprocessSchema);
      expect(pre.parse(1234)).toBe("1234");

      const piped = infer.pipe(
        infer.string(),
        infer.preprocess((v) => Number(v), infer.number())
      );
      expect(piped).toBeInstanceOf(PipeSchema);
      expect(piped.parse("42")).toBe(42);

      const branded = infer.brand(infer.string(), "UserId");
      expect(branded).toBeInstanceOf(BrandSchema);
      expect(branded.parse("user_1")).toBe("user_1");

      const codecInstance = infer.codec(
        infer.preprocess((v) => Number(v), infer.number()),
        (output: number) => String(output)
      );
      expect(codecInstance).toBeInstanceOf(Codec);
      expect(codecInstance.parse("100")).toBe(100);
      expect(codecInstance.encode(100)).toBe("100");
    });
  });

  // ==========================================
  // Special Type Builders
  // ==========================================
  describe("Special Type Builders", () => {
    it("instantiates function schema with defaults and custom parameters", () => {
      const defaultFn = infer.function();
      expect(defaultFn).toBeInstanceOf(FunctionSchema);
      const wrappedDefault = defaultFn.parse(() => 42);
      expect(typeof wrappedDefault).toBe("function");

      const mathFn = infer.function(
        infer.tuple([infer.number(), infer.number()] as const),
        infer.number()
      );
      expect(mathFn).toBeInstanceOf(FunctionSchema);
      const add = mathFn.parse((a: number, b: number) => a + b);
      expect(add(10, 20)).toBe(30);
    });

    it("instantiates promise and file schemas", async () => {
      const prom = infer.promise(infer.string());
      expect(prom).toBeInstanceOf(PromiseSchema);
      const parsedProm = await prom.parse(Promise.resolve("hello"));
      expect(parsedProm).toBe("hello");

      const fileInst = infer.file();
      expect(fileInst).toBeInstanceOf(FileSchema);
      expect(fileInst.parse({ size: 100, type: "image/png" })).toEqual({
        size: 100,
        type: "image/png",
      });
    });
  });

  // ==========================================
  // Coercion Facade
  // ==========================================
  describe("Coercion Facade", () => {
    it("exposes coerce helpers under infer.coerce namespace", () => {
      expect(infer.coerce).toBeDefined();
      expect(infer.coerce.string().parse(100)).toBe("100");
      expect(infer.coerce.number().parse("200")).toBe(200);
      expect(infer.coerce.boolean().parse("true")).toBe(true);
      expect(infer.coerce.bigint().parse("300")).toBe(300n);
      expect(
        infer.coerce.date().parse("2026-08-20T12:00:00.000Z")
      ).toBeInstanceOf(Date);
    });
  });
});
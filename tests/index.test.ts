import { describe, it, expect, expectTypeOf } from "vitest";
import infer, {
  z,
  infer as namedInfer,
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
  FunctionSchema,
  PromiseSchema,
  FileSchema,
  OptionalSchema,
  NullableSchema,
  DefaultSchema,
  PrefaultSchema,
  CatchSchema,
  PreprocessSchema,
  PipeSchema,
  ReadonlySchema,
  BrandSchema,
  Codec,
  RefinementSchema,
  SuperRefineSchema,
  TransformSchema,
  type Infer,
  type Input,
  type Output,
} from "../index.js";
import { RawShape } from "../src/schemas/composites/object.js";

describe("Root Index & infer API Facade", () => {
  describe("Exports & Compatibility Aliases", () => {
    it("exports infer as default, named, and z alias matching identical references", () => {
      expect(infer).toBe(namedInfer);
      expect(z).toBe(infer);
      expect(typeof infer).toBe("object");
      expect(typeof infer.string).toBe("function");
    });

    it("exports Schema base and ValidationError classes", () => {
      expect(Schema).toBeDefined();
      expect(ValidationError).toBeDefined();
    });

    it("verifies static Infer, Input, Output type helpers", () => {
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

  describe("Primitive Builders", () => {
    it("instantiates primitive schemas properly", () => {
      expect(infer.string()).toBeInstanceOf(StringSchema);
      expect(infer.number()).toBeInstanceOf(NumberSchema);
      expect(infer.boolean()).toBeInstanceOf(BooleanSchema);
      expect(infer.bigint()).toBeInstanceOf(BigIntSchema);
      expect(infer.date()).toBeInstanceOf(DateSchema);
      expect(infer.symbol()).toBeInstanceOf(SymbolSchema);
      expect(infer.undefined()).toBeInstanceOf(UndefinedSchema);
      expect(infer.null()).toBeInstanceOf(NullSchema);
      expect(infer.void()).toBeInstanceOf(UndefinedSchema);
      expect(infer.any()).toBeInstanceOf(AnySchema);
      expect(infer.unknown()).toBeInstanceOf(UnknownSchema);
      expect(infer.never()).toBeInstanceOf(NeverSchema);
      expect(infer.nan()).toBeInstanceOf(NaNSchema);
      expect(infer.literal("ADMIN")).toBeInstanceOf(LiteralSchema);
    });

    it("validates data through primitive schemas created via infer", () => {
      expect(infer.string().parse("test")).toBe("test");
      expect(infer.number().parse(123)).toBe(123);
      expect(infer.boolean().parse(true)).toBe(true);
      expect(infer.bigint().parse(50n)).toBe(50n);
      expect(infer.void().parse(undefined)).toBeUndefined();
      expect(infer.literal(42).parse(42)).toBe(42);
    });
  });

  describe("String Formats & Shortcuts", () => {
    it("instantiates string format schemas with default and custom messages", () => {
      // Default messages
      expect(infer.uuid().parse("123e4567-e89b-12d3-a456-426614174000")).toBe(
        "123e4567-e89b-12d3-a456-426614174000"
      );
      expect(infer.guid().parse("123e4567-e89b-12d3-a456-426614174000")).toBe(
        "123e4567-e89b-12d3-a456-426614174000"
      );
      expect(infer.email().parse("user@domain.com")).toBe("user@domain.com");
      expect(infer.url().parse("https://test.com")).toBe("https://test.com");
      expect(infer.httpUrl().parse("http://test.com")).toBe("http://test.com");
      expect(infer.cuid().parse("cjh0qofyx0000r39yoe6ko13d")).toBe(
        "cjh0qofyx0000r39yoe6ko13d"
      );
      expect(infer.cuid2().parse("a1b2c3d4e5")).toBe("a1b2c3d4e5");
      expect(infer.ulid().parse("01ARZ3NDEKTSV4RRFFQ69G5FAV")).toBe(
        "01ARZ3NDEKTSV4RRFFQ69G5FAV"
      );
      expect(infer.nanoid().parse("V1StGXR8_Z5jdHi6B-myT")).toBe(
        "V1StGXR8_Z5jdHi6B-myT"
      );
      expect(infer.datetime().parse("2026-08-19T12:00:00.000Z")).toBe(
        "2026-08-19T12:00:00.000Z"
      );
      expect(infer.ipv4().parse("127.0.0.1")).toBe("127.0.0.1");
      expect(infer.ipv6().parse("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(
        "2001:0db8:85a3:0000:0000:8a2e:0370:7334"
      );
      expect(infer.hostname().parse("sub.example.com")).toBe("sub.example.com");

      // Custom message branches
      expect(infer.uuid("Bad UUID").safeParse("invalid").success).toBe(false);
      expect(infer.guid("Bad GUID").safeParse("invalid").success).toBe(false);
      expect(infer.email("Bad Email").safeParse("invalid").success).toBe(false);
      expect(infer.url("Bad URL").safeParse("invalid").success).toBe(false);
      expect(infer.httpUrl("Bad Web URL").safeParse("ftp://invalid").success).toBe(
        false
      );
      expect(infer.cuid("Bad CUID").safeParse("invalid").success).toBe(false);
      expect(infer.cuid2("Bad CUID2").safeParse("123").success).toBe(false);
      expect(infer.ulid("Bad ULID").safeParse("invalid").success).toBe(false);
      expect(infer.nanoid("Bad NanoID").safeParse("invalid").success).toBe(false);
      expect(infer.datetime("Bad ISO").safeParse("invalid").success).toBe(false);
      expect(infer.ipv4("Bad IPv4").safeParse("invalid").success).toBe(false);
      expect(infer.ipv6("Bad IPv6").safeParse("invalid").success).toBe(false);
      expect(infer.hostname("Bad Host").safeParse("-bad").success).toBe(false);
    });
  });

  describe("Composite Builders", () => {
    it("instantiates ObjectSchemas with different policies", () => {
      const obj = infer.object({ id: infer.number() });
      expect(obj).toBeInstanceOf(ObjectSchema);
      expect(obj.policy).toBe("strip");

      const strictObj = infer.strictObject({ id: infer.number() });
      expect(strictObj).toBeInstanceOf(ObjectSchema);
      expect(strictObj.policy).toBe("strict");

      const looseObj = infer.looseObject({ id: infer.number() });
      expect(looseObj).toBeInstanceOf(ObjectSchema);
      expect(looseObj.policy).toBe("passthrough");
    });

    it("instantiates collection schemas (array, tuple, record, set, map)", () => {
      const arr = infer.array(infer.string());
      expect(arr).toBeInstanceOf(ArraySchema);
      expect(arr.parse(["a", "b"])).toEqual(["a", "b"]);

      const tup = infer.tuple([infer.string(), infer.number()]);
      expect(tup).toBeInstanceOf(TupleSchema);
      expect(tup.parse(["hello", 10])).toEqual(["hello", 10]);

      const rec = infer.record(infer.string(), infer.number());
      expect(rec).toBeInstanceOf(RecordSchema);
      expect(rec.parse({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });

      const setSchema = infer.set(infer.string());
      expect(setSchema).toBeInstanceOf(SetSchema);
      expect(setSchema.parse(new Set(["x", "y"]))).toEqual(new Set(["x", "y"]));

      const mapSchema = infer.map(infer.string(), infer.number());
      expect(mapSchema).toBeInstanceOf(MapSchema);
      const inputMap = new Map([["key", 100]]);
      expect(mapSchema.parse(inputMap)).toEqual(inputMap);
    });

    it("instantiates enum schemas (enum, nativeEnum)", () => {
      const roles = infer.enum(["admin", "user"] as const);
      expect(roles).toBeInstanceOf(EnumSchema);
      expect(roles.parse("admin")).toBe("admin");

      enum Status {
        Active = "ACTIVE",
        Inactive = "INACTIVE",
      }
      const statusSchema = infer.nativeEnum(Status);
      expect(statusSchema).toBeInstanceOf(NativeEnumSchema);
      expect(statusSchema.parse(Status.Active)).toBe(Status.Active);
    });
  });

  describe("Combinator Builders", () => {
    it("instantiates union, discriminatedUnion, intersection, and lazy schemas", () => {
      const union = infer.union([infer.string(), infer.number()]);
      expect(union).toBeInstanceOf(UnionSchema);
      expect(union.parse(10)).toBe(10);

      const circle = infer.object({
        type: infer.literal("circle"),
        radius: infer.number(),
      });
      const square = infer.object({
        type: infer.literal("square"),
        size: infer.number(),
      });
      const discUnion = infer.discriminatedUnion("type", [circle, square] as unknown as ObjectSchema<RawShape>[]);
      expect(discUnion).toBeInstanceOf(DiscriminatedUnionSchema);
      expect(discUnion.parse({ type: "circle", radius: 5 })).toEqual({
        type: "circle",
        radius: 5,
      });

      const intersection = infer.intersection(
        infer.object({ a: infer.string() }),
        infer.object({ b: infer.number() })
      );
      expect(intersection).toBeInstanceOf(IntersectionSchema);
      expect(intersection.parse({ a: "test", b: 42 })).toEqual({
        a: "test",
        b: 42,
      });

      type Node = { value: string; next?: Node };
      const nodeSchema: Schema<Node> = infer.lazy(() =>
        infer.object({
          value: infer.string(),
          next: infer.optional(nodeSchema),
        })
      );
      expect(nodeSchema).toBeInstanceOf(LazySchema);
      expect(nodeSchema.parse({ value: "head" })).toEqual({
        value: "head",
        next: undefined,
      });
    });
  });

  describe("Special Type Builders", () => {
    it("instantiates function schema with default arguments and returns", () => {
      const defaultFnSchema = infer.function();
      expect(defaultFnSchema).toBeInstanceOf(FunctionSchema);

      const dummyFn = () => "result";
      const wrapped = defaultFnSchema.parse(dummyFn);
      expect(typeof wrapped).toBe("function");
      expect((wrapped as () => string)()).toBe("result");
    });

    it("instantiates function schema with explicit args and return schema", () => {
      const customFnSchema = infer.function(
        infer.tuple([infer.number(), infer.number()]),
        infer.number()
      );
      expect(customFnSchema).toBeInstanceOf(FunctionSchema);

      const add = (a: unknown, b: unknown) => Number(a) + Number(b);
      const wrapped = customFnSchema.parse(add);
      expect(wrapped(2, 3)).toBe(5);
    });

    it("instantiates promise and file schemas", async () => {
      const promiseSchema = infer.promise(infer.string());
      expect(promiseSchema).toBeInstanceOf(PromiseSchema);
      const res = await promiseSchema.parse(Promise.resolve("async_val"));
      expect(res).toBe("async_val");

      const fileSchema = infer.file();
      expect(fileSchema).toBeInstanceOf(FileSchema);
      expect(fileSchema.parse({ size: 100, type: "image/png" })).toEqual({
        size: 100,
        type: "image/png",
      });
    });
  });

  describe("Modifier & Transformation Builders", () => {
    it("instantiates optional, nullable, and nullish schemas", () => {
      const opt = infer.optional(infer.string());
      expect(opt).toBeInstanceOf(OptionalSchema);
      expect(opt.parse(undefined)).toBeUndefined();

      const nullAble = infer.nullable(infer.string());
      expect(nullAble).toBeInstanceOf(NullableSchema);
      expect(nullAble.parse(null)).toBeNull();

      const nullIsh = infer.nullish(infer.string());
      expect(nullIsh).toBeInstanceOf(NullableSchema);
      expect(nullIsh.parse(null)).toBeNull();
      expect(nullIsh.parse(undefined)).toBeUndefined();
      expect(nullIsh.parse("valid")).toBe("valid");
    });

    it("instantiates default and prefault schemas", () => {
      const defaultSchema = infer.default(infer.string(), "default_val");
      expect(defaultSchema).toBeInstanceOf(DefaultSchema);
      expect(defaultSchema.parse(undefined)).toBe("default_val");

      const prefaultSchema = infer.prefault(infer.string(), "prefault_val");
      expect(prefaultSchema).toBeInstanceOf(PrefaultSchema);
      expect(prefaultSchema.parse(undefined)).toBe("prefault_val");
    });

    it("instantiates catch, preprocess, pipe, transform, readonly, brand, codec", () => {
      const catchSchema = infer.catch(infer.string(), "fallback");
      expect(catchSchema).toBeInstanceOf(CatchSchema);
      expect(catchSchema.parse("valid")).toBe("valid");

      const preprocessSchema = infer.preprocess(
        (val) => String(val),
        infer.string()
      );
      expect(preprocessSchema).toBeInstanceOf(PreprocessSchema);
      expect(preprocessSchema.parse(999)).toBe("999");

      const pipeSchema = infer.pipe(
        infer.string(),
        infer.preprocess((v) => Number(v), infer.number())
      );
      expect(pipeSchema).toBeInstanceOf(PipeSchema);
      expect(pipeSchema.parse("50")).toBe(50);

      const transformSchema = infer.transform(infer.string(), (v) => v.length);
      expect(transformSchema).toBeInstanceOf(TransformSchema);
      expect(transformSchema.parse("hello")).toBe(5);

      const readonlySchema = infer.readonly(infer.object({ a: infer.string() }));
      expect(readonlySchema).toBeInstanceOf(ReadonlySchema);
      const frozenObj = readonlySchema.parse({ a: "test" });
      expect(Object.isFrozen(frozenObj)).toBe(true);

      const brandSchema = infer.brand(infer.string(), "UserId");
      expect(brandSchema).toBeInstanceOf(BrandSchema);
      expect(brandSchema.parse("u1")).toBe("u1");

      const codecSchema = infer.codec(
        infer.preprocess((v) => Number(v), infer.number()),
        (output: number) => String(output)
      );
      expect(codecSchema).toBeInstanceOf(Codec);
      expect(codecSchema.parse("100")).toBe(100);
      expect(codecSchema.encode(100)).toBe("100");
    });

    it("instantiates refine with default and custom message, and superRefine", () => {
      // refine with default message
      const refineDefault = infer.refine(infer.number(), (v) => v > 0);
      expect(refineDefault).toBeInstanceOf(RefinementSchema);
      expect(refineDefault.parse(10)).toBe(10);
      const safeDefault = refineDefault.safeParse(-1);
      expect(safeDefault.success).toBe(false);
      if (!safeDefault.success) {
        expect(safeDefault.error.issues[0]?.message).toBe("Invalid input");
      }

      // refine with custom message
      const refineCustom = infer.refine(
        infer.number(),
        (v) => v > 0,
        "Must be positive number"
      );
      expect(refineCustom).toBeInstanceOf(RefinementSchema);
      const safeCustom = refineCustom.safeParse(-5);
      expect(safeCustom.success).toBe(false);
      if (!safeCustom.success) {
        expect(safeCustom.error.issues[0]?.message).toBe("Must be positive number");
      }

      // superRefine
      const superRefine = infer.superRefine(infer.string(), (val, ctx) => {
        if (!val.startsWith("admin_")) {
          ctx.addIssue({ code: "custom", message: "Prefix missing" });
        }
      });
      expect(superRefine).toBeInstanceOf(SuperRefineSchema);
      expect(superRefine.parse("admin_alice")).toBe("admin_alice");
      expect(superRefine.safeParse("user_bob").success).toBe(false);
    });
  });

  describe("Coercion Accessor", () => {
    it("exposes coerce helpers under infer.coerce namespace", () => {
      expect(infer.coerce).toBeDefined();
      expect(infer.coerce.string().parse(123)).toBe("123");
      expect(infer.coerce.number().parse("456")).toBe(456);
      expect(infer.coerce.boolean().parse("true")).toBe(true);
      expect(infer.coerce.bigint().parse("100")).toBe(100n);
      expect(
        infer.coerce.date().parse("2026-08-19T12:00:00.000Z")
      ).toBeInstanceOf(Date);
    });
  });
});
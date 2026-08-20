import { describe, it, expect, expectTypeOf } from "vitest";
import {
  CatchSchema,
  PreprocessSchema,
  PipeSchema,
  ReadonlySchema,
  BrandSchema,
  Codec,
  BrandSymbol,
  type Brand,
} from "../../../src/schemas/modifiers/all-modifiers.js";
import { Schema } from "../../../src/core/schema.js";
import { addIssue, type ParseContext } from "../../../src/core/context.js";
import {
  makeSuccess,
  makeFailure,
  type DynamicParseReturnType,
  type ParseResult,
} from "../../../src/core/result.js";
import { ValidationError } from "../../../src/core/error.js";
import type { ValidationIssue } from "../../../src/core/issue.js";

// --- Test Harness Concrete Helper Schemas ---

class SyncStringSchema extends Schema<string> {
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

class SyncNumberSchema extends Schema<number> {
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

class AsyncStringSchema extends Schema<string> {
  async _parse(input: unknown, ctx: ParseContext): Promise<ParseResult<string>> {
    await new Promise((resolve) => setTimeout(resolve, 2));
    if (typeof input === "string") return makeSuccess(input.toUpperCase());
    addIssue(ctx, {
      code: "invalid_type",
      message: "Expected string async",
      expected: "string",
      received: typeof input,
    });
    return makeFailure(ctx.issues);
  }
}

class AsyncNumberSchema extends Schema<number> {
  async _parse(input: unknown, ctx: ParseContext): Promise<ParseResult<number>> {
    await new Promise((resolve) => setTimeout(resolve, 2));
    if (typeof input === "number") return makeSuccess(input * 2);
    addIssue(ctx, {
      code: "invalid_type",
      message: "Expected number async",
      expected: "number",
      received: typeof input,
    });
    return makeFailure(ctx.issues);
  }
}

class SyncObjectSchema extends Schema<{ name: string }> {
  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<{ name: string }> {
    if (
      typeof input === "object" &&
      input !== null &&
      "name" in input &&
      typeof (input as { name: unknown }).name === "string"
    ) {
      return makeSuccess({ name: (input as { name: string }).name });
    }
    addIssue(ctx, {
      code: "invalid_type",
      message: "Expected object with name",
      expected: "object",
      received: typeof input,
    });
    return makeFailure(ctx.issues);
  }
}

class AsyncObjectSchema extends Schema<{ name: string }> {
  async _parse(input: unknown, ctx: ParseContext): Promise<ParseResult<{ name: string }>> {
    await new Promise((resolve) => setTimeout(resolve, 2));
    if (
      typeof input === "object" &&
      input !== null &&
      "name" in input &&
      typeof (input as { name: unknown }).name === "string"
    ) {
      return makeSuccess({ name: (input as { name: string }).name.toUpperCase() });
    }
    addIssue(ctx, {
      code: "invalid_type",
      message: "Expected object async with name",
      expected: "object",
      received: typeof input,
    });
    return makeFailure(ctx.issues);
  }
}

const syncString = new SyncStringSchema();
const syncNumber = new SyncNumberSchema();
const asyncString = new AsyncStringSchema();
const asyncNumber = new AsyncNumberSchema();
const syncObject = new SyncObjectSchema();
const asyncObject = new AsyncObjectSchema();

describe("All Modifiers Module (all-modifiers.ts)", () => {
  // ==========================================
  // CatchSchema
  // ==========================================
  describe("CatchSchema", () => {
    it("returns parsed value when synchronous validation succeeds", () => {
      const schema = new CatchSchema(syncString, "fallback");
      expect(schema.innerSchema).toBe(syncString);
      expect(schema.catchValue).toBe("fallback");
      expect(schema.parse("valid input")).toBe("valid input");
    });

    it("returns static fallback value and clears issues on synchronous validation failure", () => {
      const schema = new CatchSchema(syncString, "fallback");
      const safe = schema.safeParse(12345);
      expect(safe.success).toBe(true);
      if (safe.success) {
        expect(safe.data).toBe("fallback");
      }
    });

    it("evaluates functional fallback with contextual error and input payload synchronously", () => {
      let capturedContext: { error: unknown; input: unknown } | undefined;

      const schema = new CatchSchema(syncString, (ctx) => {
        capturedContext = ctx;
        return "dynamic_fallback";
      });

      const result = schema.parse(999);
      expect(result).toBe("dynamic_fallback");
      expect(capturedContext?.input).toBe(999);
      expect(Array.isArray(capturedContext?.error)).toBe(true);
      expect((capturedContext?.error as ValidationIssue[])[0]?.code).toBe("invalid_type");
    });

    it("returns parsed data when asynchronous validation succeeds", async () => {
      const schema = new CatchSchema(asyncString, "async_fallback");
      const res = await schema.parseAsync("async input");
      expect(res).toBe("ASYNC INPUT");
    });

    it("returns static fallback value when asynchronous validation fails", async () => {
      const schema = new CatchSchema(asyncString, "async_fallback");
      const res = await schema.parseAsync(123);
      expect(res).toBe("async_fallback");
    });

    it("evaluates functional fallback callback when asynchronous validation fails", async () => {
      const schema = new CatchSchema(asyncString, ({ input }) => `fallback_for_${String(input)}`);
      const res = await schema.parseAsync(false);
      expect(res).toBe("fallback_for_false");
    });
  });

  // ==========================================
  // PreprocessSchema
  // ==========================================
  describe("PreprocessSchema", () => {
    it("transforms raw input before passing to inner synchronous schema", () => {
      const preprocessor = (val: unknown) => String(val);
      const schema = new PreprocessSchema(preprocessor, syncString);
      expect(schema.preprocessor).toBe(preprocessor);
      expect(schema.innerSchema).toBe(syncString);
      expect(schema.parse(12345)).toBe("12345");
      expect(schema.parse(true)).toBe("true");
    });

    it("passes transformed input to inner asynchronous schema via parseAsync()", async () => {
      const schema = new PreprocessSchema((val) => `preprocessed_${String(val)}`, asyncString);
      const res = await schema.parseAsync("hello");
      expect(res).toBe("PREPROCESSED_HELLO");
    });

    it("fails validation if preprocessed value does not satisfy inner schema", () => {
      const schema = new PreprocessSchema(() => null, syncString);
      expect(() => schema.parse("anything")).toThrowError(ValidationError);
    });
  });

  // ==========================================
  // PipeSchema
  // ==========================================
  describe("PipeSchema", () => {
    const stringToNumberTransformer = new PreprocessSchema((val) => Number(val), syncNumber);

    it("pipes output of first schema into second schema synchronously", () => {
      const schema = new PipeSchema(syncString, stringToNumberTransformer);
      expect(schema.first).toBe(syncString);
      expect(schema.second).toBe(stringToNumberTransformer);
      const res = schema.parse("42");
      expect(res).toBe(42);
    });

    it("fails early if first schema fails synchronously", () => {
      const schema = new PipeSchema(syncString, stringToNumberTransformer);
      const safe = schema.safeParse(123);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error.issues[0]?.message).toBe("Expected string");
      }
    });

    it("fails if second schema fails synchronously", () => {
      const alwaysFailingSecond = new PreprocessSchema(() => "not a number", syncNumber);
      const schema = new PipeSchema(syncString, alwaysFailingSecond);
      const safe = schema.safeParse("valid string");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error.issues[0]?.message).toBe("Expected number");
      }
    });

    it("pipes output asynchronously when first schema is async and succeeds", async () => {
      const schema = new PipeSchema(asyncString, syncString);
      const res = await schema.parseAsync("hello");
      expect(res).toBe("HELLO");
    });

    it("returns early failure when first async schema fails", async () => {
      const schema = new PipeSchema(asyncString, syncString);
      const safe = await schema.safeParseAsync(999);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error.issues[0]?.message).toBe("Expected string async");
      }
    });

    it("pipes output asynchronously when second schema is async", async () => {
      const schema = new PipeSchema(syncNumber, asyncNumber);
      const res = await schema.parseAsync(21);
      expect(res).toBe(42);
    });
  });

  // ==========================================
  // ReadonlySchema
  // ==========================================
  describe("ReadonlySchema", () => {
    it("freezes object outputs from synchronous parsing", () => {
      const schema = new ReadonlySchema(syncObject);
      expect(schema.innerSchema).toBe(syncObject);

      const res = schema.parse({ name: "Alice" });
      expect(res).toEqual({ name: "Alice" });
      expect(Object.isFrozen(res)).toBe(true);
      expect(() => {
        // @ts-expect-error Testing runtime freeze protection
        res.name = "Bob";
      }).toThrowError(TypeError);
    });

    it("passes through non-object outputs unchanged without error synchronously", () => {
      const schema = new ReadonlySchema(syncString);
      const res = schema.parse("primitive text");
      expect(res).toBe("primitive text");
    });

    it("propagates synchronous validation failures", () => {
      const schema = new ReadonlySchema(syncObject);
      expect(() => schema.parse("invalid")).toThrowError(ValidationError);
    });

    it("freezes object outputs from asynchronous parsing via parseAsync()", async () => {
      const schema = new ReadonlySchema(asyncObject);
      const res = await schema.parseAsync({ name: "Charlie" });

      expect(res).toEqual({ name: "CHARLIE" });
      expect(Object.isFrozen(res)).toBe(true);
      expect(() => {
        // @ts-expect-error Testing runtime freeze protection
        res.name = "David";
      }).toThrowError(TypeError);
    });

    it("passes through non-object async outputs unchanged", async () => {
      const schema = new ReadonlySchema(asyncString);
      const res = await schema.parseAsync("async text");
      expect(res).toBe("ASYNC TEXT");
    });

    it("propagates asynchronous validation failures", async () => {
      const schema = new ReadonlySchema(asyncObject);
      const safe = await schema.safeParseAsync(12345);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error.issues[0]?.message).toBe("Expected object async with name");
      }
    });
  });

  // ==========================================
  // BrandSchema
  // ==========================================
  describe("BrandSchema", () => {
    type UserId = Brand<string, "UserId">;

    it("maintains brand symbol and parses valid data synchronously", () => {
      const schema = new BrandSchema<string, string, "UserId">(syncString, "UserId");
      expect(schema.innerSchema).toBe(syncString);
      expect(schema.brandName).toBe("UserId");
      expect(typeof BrandSymbol).toBe("symbol");

      const res: UserId = schema.parse("user_123");
      expect(res).toBe("user_123");
      expectTypeOf(res).toMatchTypeOf<UserId>();
    });

    it("fails synchronous parse on invalid input", () => {
      const schema = new BrandSchema<string, string, "UserId">(syncString, "UserId");
      expect(() => schema.parse(12345)).toThrowError(ValidationError);
    });

    it("parses valid data asynchronously via parseAsync()", async () => {
      const schema = new BrandSchema<string, string, "UserId">(asyncString, "UserId");
      const res = await schema.parseAsync("user_async");
      expect(res).toBe("USER_ASYNC");
    });

    it("supports symbol brand names", () => {
      const CustomBrand = Symbol("CustomBrand");
      const schema = new BrandSchema<number, number, typeof CustomBrand>(syncNumber, CustomBrand);
      expect(schema.brandName).toBe(CustomBrand);
      expect(schema.parse(42)).toBe(42);
    });
  });

  // ==========================================
  // Codec
  // ==========================================
  describe("Codec", () => {
    const stringToNumberCodec = new Codec(
      new PreprocessSchema((val) => Number(val), syncNumber),
      (output: number) => String(output)
    );

    it("stores decoder and encoder in constructor", () => {
      const encoder = (n: number) => String(n);
      const codec = new Codec(syncNumber, encoder as any);
      expect(codec.decoder).toBe(syncNumber);
      expect(codec.encoder).toBe(encoder);
    });

    it("decodes input using decoder schema via parse()", () => {
      const decoded = stringToNumberCodec.parse("100");
      expect(decoded).toBe(100);
    });

    it("encodes output back to input format using encoder function", () => {
      const encoded = stringToNumberCodec.encode(250);
      expect(encoded).toBe("250");
    });

    it("supports asynchronous decoder schemas via parseAsync()", async () => {
      const asyncCodec = new Codec(
        new PreprocessSchema((val) => String(val), asyncString),
        (output: string) => output.toLowerCase()
      );

      const decoded = await asyncCodec.parseAsync(500);
      expect(decoded).toBe("500");
      expect(asyncCodec.encode("OUTPUT_VALUE")).toBe("output_value");
    });

    it("fails decoding when input is invalid for decoder schema", () => {
      const strictCodec = new Codec(syncNumber, (output: number) => output);
      expect(() => strictCodec.parse("not a number")).toThrowError(ValidationError);
    });
  });
});
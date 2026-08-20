import { describe, it, expect } from "vitest";
import { ObjectSchema, type RawShape } from "../../../src/schemas/composites/object.js";
import { Schema } from "../../../src/core/schema.js";
import { addIssue, type ParseContext } from "../../../src/core/context.js";
import {
  makeSuccess,
  makeFailure,
  type DynamicParseReturnType,
  type ParseResult,
} from "../../../src/core/result.js";
import { ValidationError } from "../../../src/core/error.js";
import { OptionalSchema } from "../../../src/schemas/modifiers/optional.js";
import { EnumSchema } from "../../../src/schemas/composites/enum.js";

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
    return makeFailure(ctx.issues);
  }
}

class SyncNumberSchema extends Schema<number> {
  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<number> {
    if (typeof input === "number") {
      return makeSuccess(input);
    }
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
    await new Promise((res) => setTimeout(res, 2));
    if (typeof input === "string") {
      return makeSuccess(input.toUpperCase());
    }
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
    await new Promise((res) => setTimeout(res, 2));
    if (typeof input === "number") {
      return makeSuccess(input * 2);
    }
    addIssue(ctx, {
      code: "invalid_type",
      message: "Expected number async",
      expected: "number",
      received: typeof input,
    });
    return makeFailure(ctx.issues);
  }
}

const syncString = new SyncStringSchema();
const syncNumber = new SyncNumberSchema();
const asyncString = new AsyncStringSchema();
const asyncNumber = new AsyncNumberSchema();

describe("ObjectSchema", () => {
  describe("Constructor & Immutability", () => {
    it("freezes the shape dictionary upon instantiation", () => {
      const shape = { name: syncString };
      const schema = new ObjectSchema(shape);

      expect(schema.shape).toEqual({ name: syncString });
      expect(Object.isFrozen(schema.shape)).toBe(true);
      expect(schema.policy).toBe("strip");
      expect(schema.catchallSchema).toBeUndefined();
    });
  });

  describe("Validation & Type Checking", () => {
    const userSchema = new ObjectSchema({
      name: syncString,
      age: syncNumber,
    });

    it("parses valid synchronous object inputs", () => {
      const data = { name: "Alice", age: 30 };
      const result = userSchema.parse(data);
      expect(result).toEqual({ name: "Alice", age: 30 });
    });

    it("fails when input is not a plain object (primitives, null, arrays)", () => {
      const invalidInputs: unknown[] = [null, [1, 2, 3], "string", 123, true, undefined];

      for (const input of invalidInputs) {
        const safe = userSchema.safeParse(input);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.issues[0];
          expect(issue?.code).toBe("invalid_type");
          if (issue?.code === "invalid_type") {
            expect(issue.expected).toBe("object");
            const expectedReceived =
              input === null ? "null" : Array.isArray(input) ? "array" : typeof input;
            expect(issue.received).toBe(expectedReceived);
          }
        }
      }
    });

    it("collects nested property issues with exact path segments", () => {
      const safe = userSchema.safeParse({ name: 123, age: "invalid" });
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues).toHaveLength(2);
        expect(safe.issues[0]?.path).toEqual(["name"]);
        expect(safe.issues[1]?.path).toEqual(["age"]);
      }
    });

    it("handles undefined fieldSchema inside shape cleanly", () => {
      const sparseShape = {
        valid: syncString,
        missing: undefined as unknown as Schema<unknown, unknown>,
      };
      const schema = new ObjectSchema(sparseShape);
      const res = schema.parse({ valid: "ok", missing: "ignored" });
      expect(res).toEqual({ valid: "ok" });
    });
  });

  describe("Policies (strip, strict, passthrough, loose)", () => {
    const baseShape = { id: syncNumber };

    it("strips unrecognized keys by default", () => {
      const schema = new ObjectSchema(baseShape);
      const res = schema.parse({ id: 101, extra: "dropped", other: true });
      expect(res).toEqual({ id: 101 });
      expect((res as Record<string, unknown>).extra).toBeUndefined();
    });

    it("creates strict schema with .strict() and fails on extra keys", () => {
      const schema = new ObjectSchema(baseShape).strict();
      expect(schema.policy).toBe("strict");

      const safe = schema.safeParse({ id: 101, extra1: "a", extra2: "b" });
      expect(safe.success).toBe(false);
      if (!safe.success) {
        const issue = safe.issues[0];
        expect(issue?.code).toBe("unrecognized_keys");
        if (issue?.code === "unrecognized_keys") {
          expect(issue.keys).toEqual(["extra1", "extra2"]);
          expect(issue.message).toBe("Unrecognized key(s) in object: extra1, extra2");
        }
      }
    });

    it("passes through extra keys with .passthrough() and .loose()", () => {
      const passthroughSchema = new ObjectSchema(baseShape).passthrough();
      expect(passthroughSchema.policy).toBe("passthrough");
      expect(passthroughSchema.parse({ id: 101, extra: "preserved" })).toEqual({
        id: 101,
        extra: "preserved",
      });

      const looseSchema = new ObjectSchema(baseShape).loose();
      expect(looseSchema.policy).toBe("passthrough");
      expect(looseSchema.parse({ id: 202, extra: "kept" })).toEqual({
        id: 202,
        extra: "kept",
      });
    });

    it("resets policy to strip using .strip()", () => {
      const strictSchema = new ObjectSchema(baseShape).strict();
      const strippedSchema = strictSchema.strip();

      expect(strippedSchema.policy).toBe("strip");
      expect(strippedSchema.parse({ id: 101, extra: "dropped" })).toEqual({ id: 101 });
    });
  });

  describe("Catchall Schema", () => {
    it("validates extra keys against synchronous catchall schema", () => {
      const schema = new ObjectSchema({ id: syncNumber }).catchall(syncString);
      expect(schema.catchallSchema).toBe(syncString);

      const parsed = schema.parse({ id: 1, extraA: "valid", extraB: "also valid" });
      expect(parsed).toEqual({ id: 1, extraA: "valid", extraB: "also valid" });

      const failed = schema.safeParse({ id: 1, extraA: 12345 });
      expect(failed.success).toBe(false);
      if (!failed.success) {
        expect(failed.issues[0]?.path).toEqual(["extraA"]);
      }
    });

    it("validates extra keys against asynchronous catchall schema via parseAsync()", async () => {
      const schema = new ObjectSchema({ id: syncNumber }).catchall(asyncString);

      const parsed = await schema.parseAsync({ id: 1, note: "async note" });
      expect(parsed).toEqual({ id: 1, note: "ASYNC NOTE" });

      const failed = await schema.safeParseAsync({ id: 1, note: 999 });
      expect(failed.success).toBe(false);
      if (!failed.success) {
        expect(failed.issues[0]?.path).toEqual(["note"]);
      }
    });

    it("preserves extra keys under passthrough policy during async parsing", async () => {
      const schema = new ObjectSchema({ id: asyncNumber }).passthrough();
      const result = await schema.parseAsync({ id: 5, extra: "preserved_async" });
      expect(result).toEqual({ id: 10, extra: "preserved_async" });
    });
  });

  describe("Prototype Safety", () => {
    it("ignores __proto__ and constructor in input and shape keys", () => {
      const maliciousShape: RawShape = {
        name: syncString,
        __proto__: syncString,
        constructor: syncString,
      };

      const schema = new ObjectSchema(maliciousShape).strict();
      const input = JSON.parse('{"name":"safe","__proto__":{"polluted":true},"constructor":"test"}');

      const result = schema.parse(input);
      expect(result).toEqual({ name: "safe" });
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
  });

  describe("Asynchronous Parsing (parseAsync & safeParseAsync)", () => {
    const asyncUserSchema = new ObjectSchema({
      username: asyncString,
      score: asyncNumber,
    });

    it("parses valid asynchronous object properties successfully", async () => {
      const res = await asyncUserSchema.parseAsync({ username: "john", score: 50 });
      expect(res).toEqual({ username: "JOHN", score: 100 });
    });

    it("fails asynchronously when nested properties fail validation", async () => {
      const safe = await asyncUserSchema.safeParseAsync({ username: 123, score: "invalid" });
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues).toHaveLength(2);
      }
    });

    it("throws an error when async properties are encountered during synchronous parse()", () => {
      expect(() => asyncUserSchema.parse({ username: "john", score: 50 })).toThrowError(
        "Synchronous parse encountered asynchronous nested object parsing."
      );
    });
  });

  describe("Object Transformation Methods", () => {
    const baseObj = new ObjectSchema({
      a: syncString,
      b: syncNumber,
    });

    it(".extend() and .safeExtend() add and overwrite shape keys", () => {
      const extended = baseObj.extend({ c: syncString, b: syncString });
      expect(extended.shape.a).toBe(syncString);
      expect(extended.shape.c).toBe(syncString);
      expect(extended.parse({ a: "a", b: "b_string", c: "c" })).toEqual({
        a: "a",
        b: "b_string",
        c: "c",
      });

      const safeExt = baseObj.safeExtend({ d: syncNumber });
      expect(safeExt.parse({ a: "a", b: 1, d: 2 })).toEqual({ a: "a", b: 1, d: 2 });
    });

    it(".merge() merges two ObjectSchemas preserving policies and catchalls", () => {
      const otherObj = new ObjectSchema({ c: syncNumber });
      const merged = baseObj.merge(otherObj);

      expect(merged.shape).toEqual({
        a: syncString,
        b: syncNumber,
        c: syncNumber,
      });
      expect(merged.parse({ a: "hello", b: 1, c: 2 })).toEqual({
        a: "hello",
        b: 1,
        c: 2,
      });
    });

    it(".pick() handles truthy, falsey, and non-existent mask keys", () => {
      const picked = baseObj.pick({
        a: true,
        b: false,
        nonExistent: true as unknown as boolean,
      } as Record<string, boolean>);

      expect(Object.keys(picked.shape)).toEqual(["a"]);
      expect(picked.parse({ a: "only_a", b: 123 })).toEqual({ a: "only_a" });
    });

    it(".omit() handles truthy and falsey mask keys", () => {
      const omitted = baseObj.omit({ a: true, b: false });
      expect(Object.keys(omitted.shape)).toEqual(["b"]);
      expect(omitted.parse({ a: "ignored", b: 456 })).toEqual({ b: 456 });
    });

    it(".partial() wraps all top-level properties in OptionalSchema", () => {
      const partialSchema = baseObj.partial();
      expect(partialSchema.shape.a).toBeInstanceOf(OptionalSchema);
      expect(partialSchema.shape.b).toBeInstanceOf(OptionalSchema);

      expect(partialSchema.parse({})).toEqual({
        a: undefined,
        b: undefined,
      });
      expect(partialSchema.parse({ a: "present" })).toEqual({
        a: "present",
        b: undefined,
      });
    });

    it(".required() unwraps OptionalSchema properties and preserves non-optional properties", () => {
      const mixedObj = new ObjectSchema({
        opt: new OptionalSchema(syncString),
        req: syncNumber,
      });

      const requiredSchema = mixedObj.required();

      expect(requiredSchema.shape.opt).toBe(syncString);
      expect(requiredSchema.shape.req).toBe(syncNumber);
      expect(() => requiredSchema.parse({ opt: undefined, req: 1 })).toThrowError(ValidationError);
      expect(requiredSchema.parse({ opt: "val", req: 1 })).toEqual({
        opt: "val",
        req: 1,
      });
    });

    it(".deepPartial() recursively makes nested ObjectSchemas optional", () => {
      const nestedSchema = new ObjectSchema({
        user: new ObjectSchema({
          name: syncString,
          profile: new ObjectSchema({
            bio: syncString,
          }),
        }),
        active: syncNumber,
      });

      const deepPartialSchema = nestedSchema.deepPartial();
      expect(deepPartialSchema.parse({})).toEqual({
        user: undefined,
        active: undefined,
      });

      expect(
        deepPartialSchema.parse({
          user: { profile: {} },
        })
      ).toEqual({
        user: {
          name: undefined,
          profile: {
            bio: undefined,
          },
        },
        active: undefined,
      });
    });

    describe(".keyof()", () => {
      it("returns an EnumSchema matching the keys of the shape", () => {
        const keySchema = baseObj.keyof();
        expect(keySchema).toBeInstanceOf(EnumSchema);
        expect(keySchema.parse("a")).toBe("a");
        expect(keySchema.parse("b")).toBe("b");
        expect(keySchema.safeParse("c").success).toBe(false);
      });

      it("throws an error when called on an empty shape", () => {
        const emptySchema = new ObjectSchema({});
        expect(() => emptySchema.keyof()).toThrowError(
          "Cannot invoke keyof() on an ObjectSchema with an empty shape."
        );
      });
    });
  });
});
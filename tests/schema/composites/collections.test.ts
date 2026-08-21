/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */

import { describe, it, expect } from "vitest";
import {
  ArraySchema,
  TupleSchema,
  RecordSchema,
  SetSchema,
  MapSchema,
} from "../../../src/schemas/composites/collections.js";
import { OptionalSchema } from "../../../src/schemas/modifiers/optional.js";
import { Schema } from "../../../src/core/schema.js";
import { addIssue, type ParseContext } from "../../../src/core/context.js";
import {
  makeSuccess,
  makeFailure,
  type DynamicParseReturnType,
  type ParseResult,
} from "../../../src/core/result.js";
import { ValidationError } from "../../../src/core/error.js";

// --- Test Harness Schemas ---
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
  async _parse(
    input: unknown,
    ctx: ParseContext
  ): Promise<ParseResult<string>> {
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
  async _parse(
    input: unknown,
    ctx: ParseContext
  ): Promise<ParseResult<number>> {
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

describe("Collection Schemas", () => {
  // ==========================================
  // ArraySchema
  // ==========================================
  describe("ArraySchema", () => {
    const stringArray = new ArraySchema(new SyncStringSchema());
    const asyncStringArray = new ArraySchema(new AsyncStringSchema());

    it("parses valid array elements synchronously", () => {
      const res = stringArray.parse(["a", "b", "c"]);
      expect(res).toEqual(["a", "b", "c"]);
    });

    it("fails when input is not an array", () => {
      expect(() => stringArray.parse("not an array")).toThrowError(ValidationError);

      const safe = stringArray.safeParse(123);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        const issue = safe.issues[0];
        expect(issue?.code).toBe("invalid_type");
        if (issue?.code === "invalid_type") {
          expect(issue.expected).toBe("array");
          expect(issue.received).toBe("number");
        }
      }
    });

    it("collects nested element issues with correct indexed path", () => {
      const safe = stringArray.safeParse(["valid", 123, "also valid", true]);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues).toHaveLength(2);
        expect(safe.issues[0]?.path).toEqual([1]);
        expect(safe.issues[1]?.path).toEqual([3]);
      }
    });

    it("parses array with asynchronous elements via parseAsync()", async () => {
      const res = await asyncStringArray.parseAsync(["apple", "banana"]);
      expect(res).toEqual(["APPLE", "BANANA"]);
    });

    it("fails asynchronously when items are invalid", async () => {
      const safe = await asyncStringArray.safeParseAsync(["apple", 999]);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.path).toEqual([1]);
      }
    });

    it("throws when async elements are encountered in sync parse()", () => {
      expect(() => asyncStringArray.parse(["apple"])).toThrowError(
        "Synchronous parse encountered asynchronous item parsing."
      );
    });

    describe("Array refinement helpers and bounds", () => {
      it(".min() checks minimum array length with default and custom messages", () => {
        const minDefault = stringArray.min(2);
        expect(minDefault.parse(["a", "b"])).toEqual(["a", "b"]);

        const safeFailDefault = minDefault.safeParse(["a"]);
        expect(safeFailDefault.success).toBe(false);
        if (!safeFailDefault.success) {
          expect(safeFailDefault.issues[0]?.code).toBe("too_small");
          expect(safeFailDefault.issues[0]?.message).toBe(
            "Array must contain at least 2 element(s)"
          );
        }

        const minCustom = stringArray.min(2, "Need at least 2");
        expect(() => minCustom.parse(["a"])).toThrowError("Need at least 2");
      });

      it(".max() checks maximum array length with default and custom messages", () => {
        const maxDefault = stringArray.max(2);
        expect(maxDefault.parse(["a", "b"])).toEqual(["a", "b"]);

        const safeFailDefault = maxDefault.safeParse(["a", "b", "c"]);
        expect(safeFailDefault.success).toBe(false);
        if (!safeFailDefault.success) {
          expect(safeFailDefault.issues[0]?.code).toBe("too_big");
          expect(safeFailDefault.issues[0]?.message).toBe(
            "Array must contain at most 2 element(s)"
          );
        }

        const maxCustom = stringArray.max(1, "Too many items");
        expect(() => maxCustom.parse(["a", "b"])).toThrowError("Too many items");
      });

      it(".length() checks exact array length with default and custom messages", () => {
        const lenDefault = stringArray.length(2);
        expect(lenDefault.parse(["a", "b"])).toEqual(["a", "b"]);

        const safeFail = lenDefault.safeParse(["a"]);
        expect(safeFail.success).toBe(false);
        if (!safeFail.success) {
          expect(safeFail.issues[0]?.code).toBe("invalid_value");
          expect(safeFail.issues[0]?.message).toBe(
            "Array must contain exactly 2 element(s)"
          );
        }

        const lenCustom = stringArray.length(2, "Must be exactly 2");
        expect(() => lenCustom.parse(["a", "b", "c"])).toThrowError(
          "Must be exactly 2"
        );
      });

      it(".nonempty() validates non-empty arrays with default and custom messages", () => {
        const nonEmptyDefault = stringArray.nonempty();
        expect(nonEmptyDefault.parse(["a"])).toEqual(["a"]);

        const safeFail = nonEmptyDefault.safeParse([]);
        expect(safeFail.success).toBe(false);
        if (!safeFail.success) {
          expect(safeFail.issues[0]?.code).toBe("too_small");
          expect(safeFail.issues[0]?.message).toBe("Array cannot be empty");
        }

        const nonEmptyCustom = stringArray.nonempty("Array must not be empty!");
        expect(() => nonEmptyCustom.parse([])).toThrowError("Array must not be empty!");
      });

      it("handles async checks validation failure after resolving all elements", async () => {
        const asyncBoundedArray = asyncStringArray.min(3);
        const safe = await asyncBoundedArray.safeParseAsync(["a", "b"]);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.code).toBe("too_small");
        }
      });
    });
  });

  // ==========================================
  // TupleSchema
  // ==========================================
  describe("TupleSchema", () => {
    const syncTuple = new TupleSchema([
      new SyncStringSchema(),
      new SyncNumberSchema(),
    ] as const);

    const asyncTuple = new TupleSchema([
      new AsyncStringSchema(),
      new AsyncNumberSchema(),
    ] as const);

    const optionalTuple = new TupleSchema([
      new SyncStringSchema(),
      new OptionalSchema(new SyncNumberSchema()),
    ] as const);

    it("parses valid tuple matching element types and length", () => {
      const res = syncTuple.parse(["hello", 42]);
      expect(res).toEqual(["hello", 42]);
    });

    it("fails when input is not an array", () => {
      const safe = syncTuple.safeParse("not a tuple");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        const issue = safe.issues[0];
        expect(issue?.code).toBe("invalid_type");
        if (issue?.code === "invalid_type") {
          expect(issue.expected).toBe("tuple");
          expect(issue.received).toBe("string");
        }
      }
    });

    it("fails with too_small issue when tuple length is less than minimum length", () => {
      const safe = syncTuple.safeParse(["hello"]);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        const issue = safe.issues[0];
        expect(issue?.code).toBe("too_small");
        expect(issue?.message).toContain(
          "Expected tuple with at least 2 elements, received 1"
        );
      }
    });

    it("fails with too_big issue when tuple length exceeds maximum length", () => {
      const safe = syncTuple.safeParse(["hello", 42, "extra"]);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        const issue = safe.issues[0];
        expect(issue?.code).toBe("too_big");
        expect(issue?.message).toContain(
          "Expected tuple with at most 2 elements, received 3"
        );
      }
    });

    it("parses tuple containing optional trailing schemas", () => {
      expect(optionalTuple.parse(["only-first"])).toEqual(["only-first"]);
      expect(optionalTuple.parse(["first", 100])).toEqual(["first", 100]);
      expect(() => optionalTuple.parse([])).toThrowError(ValidationError);
    });

    it("fails with element validation errors on mismatched types", () => {
      const safe = syncTuple.safeParse([123, "not a number"]);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues).toHaveLength(2);
        expect(safe.issues[0]?.path).toEqual([0]);
        expect(safe.issues[1]?.path).toEqual([1]);
      }
    });

    it("parses async tuple correctly with parseAsync()", async () => {
      const res = await asyncTuple.parseAsync(["hello", 21]);
      expect(res).toEqual(["HELLO", 42]);
    });

    it("fails async tuple with validation issues", async () => {
      const safe = await asyncTuple.safeParseAsync([999, "invalid"]);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues).toHaveLength(2);
      }
    });

    it("throws when async tuple is executed in synchronous parse()", () => {
      expect(() => asyncTuple.parse(["test", 1])).toThrowError(
        "Synchronous parse encountered async tuple elements."
      );
    });
  });

  // ==========================================
  // RecordSchema
  // ==========================================
  describe("RecordSchema", () => {
    const syncRecord = new RecordSchema(
      new SyncStringSchema(),
      new SyncNumberSchema()
    );
    const asyncRecord = new RecordSchema(
      new AsyncStringSchema(),
      new AsyncNumberSchema()
    );

    it("parses valid record objects synchronously", () => {
      const res = syncRecord.parse({ a: 1, b: 2 });
      expect(res).toEqual({ a: 1, b: 2 });
    });

    it("fails when input is not an object (primitives, null, array)", () => {
      const checkInvalid = (val: unknown, expectedReceived: string) => {
        const safe = syncRecord.safeParse(val);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.issues[0];
          expect(issue?.code).toBe("invalid_type");
          if (issue?.code === "invalid_type") {
            expect(issue.expected).toBe("record");
            expect(issue.received).toBe(expectedReceived);
          }
        }
      };

      checkInvalid(123, "number");
      checkInvalid(null, "null");
      checkInvalid([1, 2, 3], "array");
    });

    it("skips prototype pollution keys (__proto__, constructor)", () => {
      const payload = JSON.parse('{"__proto__": {"admin": true}, "valid": 10}');
      const res = syncRecord.parse(payload);
      expect(res).toEqual({ valid: 10 });
      expect(Object.prototype.hasOwnProperty.call(res, "__proto__")).toBe(false);
    });

    it("collects nested issues when values in record fail validation", () => {
      const safe = syncRecord.safeParse({ validKey: "not-a-number" });
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.path).toEqual(["validKey"]);
      }
    });

    it("parses record with async keys and values via parseAsync()", async () => {
      const res = await asyncRecord.parseAsync({ key1: 10, key2: 20 });
      expect(res).toEqual({ KEY1: 20, KEY2: 40 });
    });

    it("fails async record parsing with aggregated issues", async () => {
      const safe = await asyncRecord.safeParseAsync({ valid: "invalidNumber" });
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.path).toEqual(["valid"]);
      }
    });

    it("throws when async record elements are parsed synchronously", () => {
      expect(() => asyncRecord.parse({ a: 1 })).toThrowError(
        "Synchronous parse encountered async record elements."
      );
    });
  });

  // ==========================================
  // SetSchema
  // ==========================================
  describe("SetSchema", () => {
    const syncSet = new SetSchema(new SyncStringSchema());
    const asyncSet = new SetSchema(new AsyncStringSchema());

    it("parses valid Set instances synchronously", () => {
      const res = syncSet.parse(new Set(["alpha", "beta"]));
      expect(res).toEqual(new Set(["alpha", "beta"]));
    });

    it("fails when input is not a Set instance", () => {
      const safe = syncSet.safeParse(["alpha", "beta"]);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        const issue = safe.issues[0];
        expect(issue?.code).toBe("invalid_type");
        if (issue?.code === "invalid_type") {
          expect(issue.expected).toBe("Set");
          expect(issue.received).toBe("object");
        }
      }
    });

    it("collects issues for invalid items inside Set with indexed paths", () => {
      const input = new Set(["valid", 123, "valid2"]);
      const safe = syncSet.safeParse(input);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.path).toEqual([1]);
      }
    });

    it("parses Set with async item schemas via parseAsync()", async () => {
      const input = new Set(["cat", "dog"]);
      const res = await asyncSet.parseAsync(input);
      expect(res).toEqual(new Set(["CAT", "DOG"]));
    });

    it("fails async Set with aggregated issues", async () => {
      const input = new Set(["cat", 123]);
      const safe = await asyncSet.safeParseAsync(input);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.path).toEqual([1]);
      }
    });

    it("throws when async Set elements are parsed synchronously", () => {
      expect(syncSet.parse(new Set())).toEqual(new Set());
      expect(() => asyncSet.parse(new Set(["cat"]))).toThrowError(
        "Synchronous parse encountered async Set values."
      );
    });

    describe("Set refinement helpers", () => {
      it(".min() checks minimum set size", () => {
        const minSet = syncSet.min(2);
        expect(minSet.parse(new Set(["a", "b"]))).toEqual(new Set(["a", "b"]));

        const safe = minSet.safeParse(new Set(["a"]));
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.code).toBe("too_small");
          expect(safe.issues[0]?.message).toBe(
            "Set must contain at least 2 element(s)"
          );
        }
      });

      it(".max() checks maximum set size", () => {
        const maxSet = syncSet.max(1, "Too many elements in set");
        expect(maxSet.parse(new Set(["a"]))).toEqual(new Set(["a"]));
        expect(() => maxSet.parse(new Set(["a", "b"]))).toThrowError(
          "Too many elements in set"
        );
      });

      it(".size() checks exact set size", () => {
        const sizeSet = syncSet.size(2);
        expect(sizeSet.parse(new Set(["a", "b"]))).toEqual(new Set(["a", "b"]));

        const safe = sizeSet.safeParse(new Set(["a"]));
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.code).toBe("invalid_value");
          expect(safe.issues[0]?.message).toBe(
            "Set must contain exactly 2 element(s)"
          );
        }
      });

      it(".nonempty() rejects empty sets", () => {
        const nonEmptySet = syncSet.nonempty();
        expect(nonEmptySet.parse(new Set(["item"]))).toEqual(new Set(["item"]));
        expect(() => nonEmptySet.parse(new Set())).toThrowError(
          "Set cannot be empty"
        );
      });

      it("handles async Set validation with checks", async () => {
        const asyncBoundedSet = asyncSet.min(2);
        const safe = await asyncBoundedSet.safeParseAsync(new Set(["single"]));
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.code).toBe("too_small");
        }
      });
    });
  });

  // ==========================================
  // MapSchema
  // ==========================================
  describe("MapSchema", () => {
    const syncMap = new MapSchema(
      new SyncStringSchema(),
      new SyncNumberSchema()
    );
    const asyncMap = new MapSchema(
      new AsyncStringSchema(),
      new AsyncNumberSchema()
    );

    it("parses valid Map instances synchronously", () => {
      const input = new Map([
        ["a", 1],
        ["b", 2],
      ]);
      const res = syncMap.parse(input);
      expect(res).toEqual(
        new Map([
          ["a", 1],
          ["b", 2],
        ])
      );
    });

    it("fails when input is not a Map instance", () => {
      const safe = syncMap.safeParse({ a: 1 });
      expect(safe.success).toBe(false);
      if (!safe.success) {
        const issue = safe.issues[0];
        expect(issue?.code).toBe("invalid_type");
        if (issue?.code === "invalid_type") {
          expect(issue.expected).toBe("Map");
          expect(issue.received).toBe("object");
        }
      }
    });

    it("collects nested issues for failed key and value in sync Map", () => {
      const input = new Map<unknown, unknown>([[123, "not a number"]]);
      const safe = syncMap.safeParse(input);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues).toHaveLength(2);
        expect(safe.issues[0]?.path).toEqual(["0.key"]);
        expect(safe.issues[1]?.path).toEqual(["0.val"]);
      }
    });

    it("parses Map with async key/value schemas via parseAsync()", async () => {
      const input = new Map([
        ["keyOne", 10],
        ["keyTwo", 20],
      ]);
      const res = await asyncMap.parseAsync(input);
      expect(res).toEqual(
        new Map([
          ["KEYONE", 20],
          ["KEYTWO", 40],
        ])
      );
    });

    it("fails async Map parsing with aggregated key/value errors", async () => {
      const input = new Map<unknown, unknown>([[999, "invalidValue"]]);
      const safe = await asyncMap.safeParseAsync(input);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues).toHaveLength(2);
        expect(safe.issues[0]?.path).toEqual(["0.key"]);
        expect(safe.issues[1]?.path).toEqual(["0.val"]);
      }
    });

    it("throws when async Map elements are parsed synchronously", () => {
      const input = new Map([["a", 1]]);
      expect(() => asyncMap.parse(input)).toThrowError(
        "Synchronous parse encountered async Map elements."
      );
    });
  });
});
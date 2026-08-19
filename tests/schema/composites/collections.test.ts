import { describe, it, expect, vi } from "vitest";

// Mock modifier & combinator classes with executable parse pipelines
vi.mock("../../../src/schemas/modifiers/optional.js", () => ({
  OptionalSchema: class MockOptionalSchema {
    constructor(public inner: unknown) {}
  },
}));

vi.mock("../../../src/schemas/modifiers/nullable.js", () => ({
  NullableSchema: class MockNullableSchema {
    constructor(public inner: unknown) {}
  },
}));

vi.mock("../../../src/schemas/modifiers/default.js", () => ({
  DefaultSchema: class MockDefaultSchema {
    constructor(
      public inner: unknown,
      public defaultValue: unknown,
    ) {}
  },
}));

vi.mock("../../../src/schemas/modifiers/prefault.js", () => ({
  PrefaultSchema: class MockPrefaultSchema {
    constructor(
      public inner: unknown,
      public defaultValue: unknown,
    ) {}
  },
}));

vi.mock("../../../src/schemas/modifiers/extended-modifiers.js", () => {
  return {
    CatchSchema: class MockCatchSchema {
      constructor(
        public inner: unknown,
        public catchValue: unknown,
      ) {}
    },
    PipeSchema: class MockPipeSchema {
      constructor(
        public inner: unknown,
        public nextSchema: unknown,
      ) {}
    },
    TransformSchema: class MockTransformSchema {
      constructor(
        public inner: unknown,
        public transformer: unknown,
      ) {}
    },
    RefinementSchema: class MockRefinementSchema {
      constructor(
        public inner: any,
        public predicate: (val: any) => boolean | Promise<boolean>,
        public message: string | ((val: any) => string),
      ) {}

      parse(input: unknown) {
        const parsed = this.inner.parse(input);
        const valid = this.predicate(parsed);
        if (!valid) {
          const msg =
            typeof this.message === "function"
              ? this.message(parsed)
              : this.message;
          throw new Error(msg);
        }
        return parsed;
      }
    },
    SuperRefineSchema: class MockSuperRefineSchema {
      constructor(
        public inner: unknown,
        public refinement: unknown,
      ) {}
    },
  };
});

vi.mock("../../../src/schemas/composites/combinators.js", () => ({
  UnionSchema: class MockUnionSchema {
    constructor(public options: unknown[]) {}
  },
  IntersectionSchema: class MockIntersectionSchema {
    constructor(
      public left: unknown,
      public right: unknown,
    ) {}
  },
}));

import {
  ArraySchema,
  TupleSchema,
  RecordSchema,
  SetSchema,
  MapSchema,
} from "../../../src/schemas/composites/collections.js";
import { Schema } from "../../../src/core/schema.js";
import { addIssue, type ParseContext } from "../../../src/core/context.js";
import {
  makeSuccess,
  type DynamicParseReturnType,
  type AsyncParseReturnType,
} from "../../../src/core/result.js";
import { ValidationError } from "../../../src/core/error.js";

// --- Test Harness Helper Schemas (Does NOT freeze shared ctx.issues buffer) ---
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
    return { success: false, issues: ctx.issues };
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
    return { success: false, issues: ctx.issues };
  }
}

class AsyncStringSchema extends Schema<string> {
  async _parse(
    input: unknown,
    ctx: ParseContext,
  ): AsyncParseReturnType<string> {
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
    return { success: false, issues: ctx.issues };
  }
}

class AsyncNumberSchema extends Schema<number> {
  async _parse(
    input: unknown,
    ctx: ParseContext,
  ): AsyncParseReturnType<number> {
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
    return { success: false, issues: ctx.issues };
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
      expect(() => stringArray.parse("not an array")).toThrowError(
        ValidationError,
      );
      const safe = stringArray.safeParse(123);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        const issue = safe.error.issues[0];
        expect(issue?.code).toBe("invalid_type");
        if (issue?.code === "invalid_type") {
          expect(issue.expected).toBe("array");
        }
      }
    });

    it("collects nested element issues with correct indexed path", () => {
      const safe = stringArray.safeParse(["valid", 123, "also valid", true]);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error.issues).toHaveLength(2);
        expect(safe.error.issues[0]?.path).toEqual([1]);
        expect(safe.error.issues[1]?.path).toEqual([3]);
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
        expect(safe.error.issues[0]?.path).toEqual([1]);
      }
    });

    it("throws when async elements are encountered in sync parse()", () => {
      expect(() => asyncStringArray.parse(["apple"])).toThrowError(
        "Synchronous parse encountered asynchronous item parsing.",
      );
    });

    describe("Array refinement helpers", () => {
      it(".min() checks minimum array length with default and custom messages", () => {
        const minDefault = stringArray.min(2);
        expect(minDefault.parse(["a", "b"])).toEqual(["a", "b"]);
        expect(() => minDefault.parse(["a"])).toThrowError(
          "Array must contain at least 2 element(s)",
        );

        const minCustom = stringArray.min(2, "Need at least 2");
        expect(() => minCustom.parse(["a"])).toThrowError("Need at least 2");
      });

      it(".max() checks maximum array length with default and custom messages", () => {
        const maxDefault = stringArray.max(2);
        expect(maxDefault.parse(["a", "b"])).toEqual(["a", "b"]);
        expect(() => maxDefault.parse(["a", "b", "c"])).toThrowError(
          "Array must contain at most 2 element(s)",
        );

        const maxCustom = stringArray.max(1, "Too many items");
        expect(() => maxCustom.parse(["a", "b"])).toThrowError(
          "Too many items",
        );
      });

      it(".length() checks exact array length with default and custom messages", () => {
        const lenDefault = stringArray.length(2);
        expect(lenDefault.parse(["a", "b"])).toEqual(["a", "b"]);
        expect(() => lenDefault.parse(["a"])).toThrowError(
          "Array must contain exactly 2 element(s)",
        );

        const lenCustom = stringArray.length(2, "Must be exactly 2");
        expect(() => lenCustom.parse(["a", "b", "c"])).toThrowError(
          "Must be exactly 2",
        );
      });

      it(".nonempty() validates non-empty arrays with default and custom messages", () => {
        const nonEmptyDefault = stringArray.nonempty();
        expect(nonEmptyDefault.parse(["a"])).toEqual(["a"]);
        expect(() => nonEmptyDefault.parse([])).toThrowError(
          "Array cannot be empty",
        );

        const nonEmptyCustom = stringArray.nonempty("Array must not be empty!");
        expect(() => nonEmptyCustom.parse([])).toThrowError(
          "Array must not be empty!",
        );
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

    it("parses valid tuple matching element types and length", () => {
      const res = syncTuple.parse(["hello", 42]);
      expect(res).toEqual(["hello", 42]);
    });

    it("fails when input is not an array", () => {
      const safe = syncTuple.safeParse("not a tuple");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        const issue = safe.error.issues[0];
        expect(issue?.code).toBe("invalid_type");
        if (issue?.code === "invalid_type") {
          expect(issue.expected).toBe("tuple");
        }
      }
    });

    it("fails with too_small issue when tuple length mismatches schema length", () => {
      const safe = syncTuple.safeParse(["hello"]);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        const issue = safe.error.issues[0];
        expect(issue?.code).toBe("too_small");
        expect(issue?.message).toContain(
          "Expected tuple with 2 elements, received 1",
        );
      }
    });

    it("fails with element validation errors on mismatched types", () => {
      const safe = syncTuple.safeParse([123, "not a number"]);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error.issues).toHaveLength(2);
        expect(safe.error.issues[0]?.path).toEqual([0]);
        expect(safe.error.issues[1]?.path).toEqual([1]);
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
        expect(safe.error.issues).toHaveLength(2);
      }
    });

    it("throws when async tuple is executed in synchronous parse()", () => {
      expect(() => asyncTuple.parse(["test", 1])).toThrowError(
        "Synchronous parse encountered async tuple elements.",
      );
    });
  });

  // ==========================================
  // RecordSchema
  // ==========================================
  describe("RecordSchema", () => {
    const syncRecord = new RecordSchema(
      new SyncStringSchema(),
      new SyncNumberSchema(),
    );
    const asyncRecord = new RecordSchema(
      new AsyncStringSchema(),
      new AsyncNumberSchema(),
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
          const issue = safe.error.issues[0];
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

    it("collects nested issues when values in record fail validation", () => {
      const safe = syncRecord.safeParse({ validKey: "not-a-number" });
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error.issues[0]?.path).toEqual(["validKey"]);
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
        expect(safe.error.issues[0]?.path).toEqual(["valid"]);
      }
    });

    it("throws when async record elements are parsed synchronously", () => {
      expect(() => asyncRecord.parse({ a: 1 })).toThrowError(
        "Synchronous parse encountered async record elements.",
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
        const issue = safe.error.issues[0];
        expect(issue?.code).toBe("invalid_type");
        if (issue?.code === "invalid_type") {
          expect(issue.expected).toBe("Set");
        }
      }
    });

    it("collects issues for invalid items inside Set with indexed paths", () => {
      const input = new Set(["valid", 123, "valid2"]);
      const safe = syncSet.safeParse(input);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error.issues[0]?.path).toEqual([1]);
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
        expect(safe.error.issues[0]?.path).toEqual([1]);
      }
    });

    it("throws when async Set elements are parsed synchronously", () => {
      expect(syncSet.parse(new Set())).toEqual(new Set());
      expect(() => asyncSet.parse(new Set(["cat"]))).toThrowError(
        "Synchronous parse encountered async Set values.",
      );
    });
  });

  // ==========================================
  // MapSchema
  // ==========================================
  describe("MapSchema", () => {
    const syncMap = new MapSchema(
      new SyncStringSchema(),
      new SyncNumberSchema(),
    );
    const asyncMap = new MapSchema(
      new AsyncStringSchema(),
      new AsyncNumberSchema(),
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
        ]),
      );
    });

    it("fails when input is not a Map instance", () => {
      const safe = syncMap.safeParse({ a: 1 });
      expect(safe.success).toBe(false);
      if (!safe.success) {
        const issue = safe.error.issues[0];
        expect(issue?.code).toBe("invalid_type");
        if (issue?.code === "invalid_type") {
          expect(issue.expected).toBe("Map");
        }
      }
    });

    it("collects nested issues for failed key and value in sync Map", () => {
      const input = new Map<unknown, unknown>([[123, "not a number"]]);
      const safe = syncMap.safeParse(input);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error.issues).toHaveLength(2);
        expect(safe.error.issues[0]?.path).toEqual(["0.key"]);
        expect(safe.error.issues[1]?.path).toEqual(["0.val"]);
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
        ]),
      );
    });

    it("fails async Map parsing with aggregated key/value errors", async () => {
      const input = new Map<unknown, unknown>([[999, "invalidValue"]]);
      const safe = await asyncMap.safeParseAsync(input);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error.issues).toHaveLength(2);
        expect(safe.error.issues[0]?.path).toEqual(["0.key"]);
        expect(safe.error.issues[1]?.path).toEqual(["0.val"]);
      }
    });

    it("throws when async Map elements are parsed synchronously", () => {
      const input = new Map([["a", 1]]);
      expect(() => asyncMap.parse(input)).toThrowError(
        "Synchronous parse encountered async Map elements.",
      );
    });
  });
});
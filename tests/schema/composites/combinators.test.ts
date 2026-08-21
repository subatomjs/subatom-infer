/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import {
  UnionSchema,
  DiscriminatedUnionSchema,
  IntersectionSchema,
  LazySchema,
} from "../../../src/schemas/composites/combinators.js";
import { ObjectSchema, type RawShape } from "../../../src/schemas/composites/object.js";
import { Schema } from "../../../src/core/schema.js";
import { addIssue, type ParseContext } from "../../../src/core/context.js";
import {
  makeSuccess,
  makeFailure,
  isPromise,
  type DynamicParseReturnType,
  type ParseResult,
} from "../../../src/core/result.js";
import { ValidationError } from "../../../src/core/error.js";

// --- Mock Concrete Schemas for Exact Branch Testing ---

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
    await new Promise((resolve) => setTimeout(resolve, 2));
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
    await new Promise((resolve) => setTimeout(resolve, 2));
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

class MockLiteralSchema<T extends string | number | boolean> extends Schema<T> {
  readonly value: T;
  constructor(value: T) {
    super();
    this.value = value;
  }

  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<T> {
    if (input === this.value) {
      return makeSuccess(input as T);
    }
    addIssue(ctx, {
      code: "invalid_value",
      expected: this.value,
      received: input,
      message: `Expected literal ${String(this.value)}`,
    });
    return makeFailure(ctx.issues);
  }
}

class ThrowingSchema extends Schema<unknown> {
  constructor(private readonly errToThrow: unknown) {
    super();
  }

  _parse(): DynamicParseReturnType<unknown> {
    throw this.errToThrow;
  }
}

const syncString = new SyncStringSchema();
const syncNumber = new SyncNumberSchema();
const asyncString = new AsyncStringSchema();
const asyncNumber = new AsyncNumberSchema();

describe("Combinators Schemas (combinators.ts)", () => {
  // ==========================================
  // UnionSchema
  // ==========================================
  describe("UnionSchema", () => {
    describe("Constructor & Type Inference", () => {
      it("stores options tuple properly", () => {
        const options = [syncString, syncNumber] as const;
        const schema = new UnionSchema(options);
        expect(schema.options).toBe(options);
      });

      it("verifies static TypeScript output and input types", () => {
        const schema = new UnionSchema([syncString, syncNumber]);
        expectTypeOf(schema._output).toEqualTypeOf<string | number>();
        expectTypeOf(schema._input).toEqualTypeOf<string | number>();
      });
    });

    describe("Synchronous Union Parsing", () => {
      const union = new UnionSchema([syncString, syncNumber]);

      it("parses synchronously when the first branch succeeds", () => {
        expect(union.parse("hello")).toBe("hello");
      });

      it("parses synchronously when a subsequent branch succeeds", () => {
        expect(union.parse(42)).toBe(42);
      });

      it("fails synchronously and collects unionErrors when all branches fail", () => {
        const safe = union.safeParse(true);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error).toBeInstanceOf(ValidationError);
          const issue = safe.issues[0];
          expect(issue?.code).toBe("invalid_union");
          if (issue?.code === "invalid_union") {
            expect(issue.message).toBe("Input did not match any union branch");
            expect(issue.unionErrors).toHaveLength(2);
            expect(issue.unionErrors[0]).toBeInstanceOf(ValidationError);
            expect(issue.unionErrors[1]).toBeInstanceOf(ValidationError);
          }
        }
      });

      it("catches and transforms thrown 'Synchronous parse' error during sync parse", () => {
        const throwingSchema = new ThrowingSchema(
          new Error("Synchronous parse encountered nested async")
        );
        const schemaWithThrow = new UnionSchema([throwingSchema, syncNumber]);

        expect(() => schemaWithThrow.parse(42)).toThrowError(
          "Synchronous parse encountered async union variant."
        );
      });

      it("re-throws unexpected general Error instances from branch options", () => {
        const genericErrorSchema = new ThrowingSchema(
          new Error("Database connection lost")
        );
        const schemaWithThrow = new UnionSchema([genericErrorSchema, syncNumber]);

        expect(() => schemaWithThrow.parse(42)).toThrowError(
          "Database connection lost"
        );
      });

      it("re-throws non-Error thrown objects during synchronous branch execution", () => {
        const rawThrowingSchema = new ThrowingSchema("primitive string error");
        const schemaWithThrow = new UnionSchema([rawThrowingSchema, syncNumber]);

        expect(() => schemaWithThrow.parse(42)).toThrow("primitive string error");
      });

      it("throws when sync parse encounters an async branch returned as a promise", () => {
        const asyncUnion = new UnionSchema([syncString, asyncNumber]);
        expect(() => asyncUnion.parse(42)).toThrowError(
          "Synchronous parse encountered async union variant."
        );
      });
    });

    describe("Asynchronous Union Parsing", () => {
      it("parses asynchronously when the first async branch matches", async () => {
        const union = new UnionSchema([asyncString, asyncNumber]);
        const res = await union.parseAsync("hello async");
        expect(res).toBe("HELLO ASYNC");
      });

      it("parses asynchronously when a subsequent async branch matches", async () => {
        const union = new UnionSchema([syncString, asyncNumber]);
        const res = await union.parseAsync(10);
        expect(res).toBe(20);
      });

      it("parses asynchronously when an early sync branch matches before async checks complete", async () => {
        const union = new UnionSchema([syncString, asyncNumber]);
        const res = await union.parseAsync("sync value");
        expect(res).toBe("sync value");
      });

      it("fails asynchronously and collects unionErrors when all async branches fail", async () => {
        const union = new UnionSchema([syncString, asyncNumber]);
        const safe = await union.safeParseAsync(true);

        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error).toBeInstanceOf(ValidationError);
          const issue = safe.issues[0];
          expect(issue?.code).toBe("invalid_union");
          if (issue?.code === "invalid_union") {
            expect(issue.message).toBe("Input did not match any union branch");
            expect(issue.unionErrors).toHaveLength(1);
          }
        }
      });
    });
  });

  // ==========================================
  // DiscriminatedUnionSchema
  // ==========================================
  describe("DiscriminatedUnionSchema", () => {
    const circleSchema = new ObjectSchema({
      type: new MockLiteralSchema("circle"),
      radius: syncNumber,
    });

    const squareSchema = new ObjectSchema({
      type: new MockLiteralSchema("square"),
      size: syncNumber,
    });

    const options = [circleSchema, squareSchema] as const;

    describe("Constructor & Structure Validation", () => {
      it("throws if a member schema does not contain the discriminator in its shape", () => {
        const invalidMember = new ObjectSchema({
          radius: syncNumber,
        });

        expect(() => {
          new DiscriminatedUnionSchema("type", [
            invalidMember as unknown as ObjectSchema<RawShape>,
          ]);
        }).toThrowError(
          'Every discriminated union member must specify a LiteralSchema on "type"'
        );
      });

      it("throws if a member schema discriminator field is not a literal schema with 'value'", () => {
        const nonLiteralMember = new ObjectSchema({
          type: syncString,
        });

        expect(() => {
          new DiscriminatedUnionSchema("type", [
            nonLiteralMember as unknown as ObjectSchema<RawShape>,
          ]);
        }).toThrowError(
          'Every discriminated union member must specify a LiteralSchema on "type"'
        );
      });
    });

    describe("Parsing & Branch Routing", () => {
      const discUnion = new DiscriminatedUnionSchema(
        "type",
        options as unknown as ObjectSchema<RawShape>[]
      );

      it("fails when input is not an object or is null", () => {
        const nonObjects: unknown[] = [null, "string", 123, true, undefined];

        for (const input of nonObjects) {
          const safe = discUnion.safeParse(input);
          expect(safe.success).toBe(false);
          if (!safe.success) {
            const issue = safe.issues[0];
            expect(issue?.code).toBe("invalid_type");
            if (issue?.code === "invalid_type") {
              expect(issue.expected).toBe("object");
              expect(issue.message).toBe("Expected object for discriminated union");
            }
          }
        }
      });

      it("fails when discriminator property value has no matching registered branch", () => {
        const safe = discUnion.safeParse({ type: "triangle", side: 10 });
        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.issues[0];
          expect(issue?.code).toBe("invalid_value");
          if (issue?.code === "invalid_value") {
            expect(issue.received).toBe("triangle");
            expect(issue.message).toBe(
              'No matching branch for discriminator type="triangle"'
            );
          }
        }
      });

      it("successfully routes and parses valid matching branches synchronously", () => {
        expect(discUnion.parse({ type: "circle", radius: 10 })).toEqual({
          type: "circle",
          radius: 10,
        });
        expect(discUnion.parse({ type: "square", size: 25 })).toEqual({
          type: "square",
          size: 25,
        });
      });

      it("propagates internal branch validation errors when properties within matched branch fail", () => {
        const safe = discUnion.safeParse({
          type: "circle",
          radius: "not_a_number",
        });
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.path).toEqual(["radius"]);
        }
      });

      it("supports asynchronous branch schemas seamlessly", async () => {
        const asyncCircleSchema = new ObjectSchema({
          type: new MockLiteralSchema("circle"),
          radius: asyncNumber,
        });

        const asyncDiscUnion = new DiscriminatedUnionSchema("type", [
          asyncCircleSchema,
          squareSchema,
        ] as unknown as ObjectSchema<RawShape>[]);

        const res = await asyncDiscUnion.parseAsync({
          type: "circle",
          radius: 15,
        });
        expect(res).toEqual({ type: "circle", radius: 30 });
      });
    });
  });

  // ==========================================
  // IntersectionSchema
  // ==========================================
  describe("IntersectionSchema", () => {
    const leftObj = new ObjectSchema({ a: syncString });
    const rightObj = new ObjectSchema({ b: syncNumber });

    describe("Constructor & Type Inference", () => {
      it("stores left and right schema operands properly", () => {
        const intersection = new IntersectionSchema(leftObj, rightObj);
        expect(intersection.left).toBe(leftObj);
        expect(intersection.right).toBe(rightObj);
      });
    });

    describe("Synchronous Intersection Parsing", () => {
      it("parses and merges objects synchronously when both succeed", () => {
        const intersection = new IntersectionSchema(leftObj, rightObj);
        expect(intersection.parse({ a: "test", b: 123 })).toEqual({
          a: "test",
          b: 123,
        });
      });

      it("fails if the left side fails synchronously", () => {
        const intersection = new IntersectionSchema(leftObj, rightObj);
        const safe = intersection.safeParse({ a: 123, b: 123 });
        expect(safe.success).toBe(false);
      });

      it("fails if the right side fails synchronously", () => {
        const intersection = new IntersectionSchema(leftObj, rightObj);
        const safe = intersection.safeParse({ a: "test", b: "invalid" });
        expect(safe.success).toBe(false);
      });

      it("catches and transforms thrown 'Synchronous parse' error from left branch", () => {
        const throwingLeft = new ThrowingSchema(
          new Error("Synchronous parse encountered async inside left")
        );
        const intersection = new IntersectionSchema(throwingLeft, rightObj);

        expect(() => intersection.parse({ a: "test", b: 123 })).toThrowError(
          "Synchronous parse encountered async intersection branches."
        );
      });

      it("catches and transforms thrown 'Synchronous parse' error from right branch", () => {
        const throwingRight = new ThrowingSchema(
          new Error("Synchronous parse encountered async inside right")
        );
        const intersection = new IntersectionSchema(leftObj, throwingRight);

        expect(() => intersection.parse({ a: "test", b: 123 })).toThrowError(
          "Synchronous parse encountered async intersection branches."
        );
      });

      it("re-throws unexpected general error when left branch throws during sync parse", () => {
        const throwingLeft = new ThrowingSchema(new Error("Left fatal error"));
        const intersection = new IntersectionSchema(throwingLeft, rightObj);

        expect(() => intersection.parse({ a: "test", b: 123 })).toThrowError(
          "Left fatal error"
        );
      });

      it("re-throws unexpected general error when right branch throws during sync parse", () => {
        const throwingRight = new ThrowingSchema(new Error("Right fatal error"));
        const intersection = new IntersectionSchema(leftObj, throwingRight);

        expect(() => intersection.parse({ a: "test", b: 123 })).toThrowError(
          "Right fatal error"
        );
      });

      it("re-throws non-Error thrown objects from left branch during sync parse", () => {
        const rawThrowingLeft = new ThrowingSchema("primitive left error string");
        const intersection = new IntersectionSchema(rawThrowingLeft, rightObj);

        expect(() => intersection.parse({ a: "test", b: 123 })).toThrow(
          "primitive left error string"
        );
      });

      it("re-throws non-Error thrown objects from right branch during sync parse", () => {
        const rawThrowingRight = new ThrowingSchema("primitive right error string");
        const intersection = new IntersectionSchema(leftObj, rawThrowingRight);

        expect(() => intersection.parse({ a: "test", b: 123 })).toThrow(
          "primitive right error string"
        );
      });

      it("throws when sync parse encounters an async branch returning a promise", () => {
        const asyncRight = new ObjectSchema({ b: asyncNumber });
        const intersection = new IntersectionSchema(leftObj, asyncRight);

        expect(() => intersection.parse({ a: "test", b: 123 })).toThrowError(
          "Synchronous parse encountered async intersection branches."
        );
      });
    });

    describe("Asynchronous Intersection Parsing", () => {
      it("parses and merges objects asynchronously when both branches succeed", async () => {
        const asyncLeft = new ObjectSchema({ a: asyncString });
        const asyncRight = new ObjectSchema({ b: asyncNumber });
        const intersection = new IntersectionSchema(asyncLeft, asyncRight);

        const result = await intersection.parseAsync({ a: "hello", b: 20 });
        expect(result).toEqual({ a: "HELLO", b: 40 });
      });

      it("fails async parse when left async branch fails", async () => {
        const asyncLeft = new ObjectSchema({ a: asyncString });
        const asyncRight = new ObjectSchema({ b: asyncNumber });
        const intersection = new IntersectionSchema(asyncLeft, asyncRight);

        const safe = await intersection.safeParseAsync({ a: 123, b: 20 });
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.path).toEqual(["a"]);
        }
      });

      it("fails async parse when right async branch fails", async () => {
        const asyncLeft = new ObjectSchema({ a: asyncString });
        const asyncRight = new ObjectSchema({ b: asyncNumber });
        const intersection = new IntersectionSchema(asyncLeft, asyncRight);

        const safe = await intersection.safeParseAsync({ a: "valid", b: "invalid" });
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.path).toEqual(["b"]);
        }
      });

      it("fails async parse and aggregates issues when both branches fail", async () => {
        const asyncLeft = new ObjectSchema({ a: asyncString });
        const asyncRight = new ObjectSchema({ b: asyncNumber });
        const intersection = new IntersectionSchema(asyncLeft, asyncRight);

        const safe = await intersection.safeParseAsync({ a: 123, b: "invalid" });
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues).toHaveLength(2);
        }
      });
    });

    describe("mergeDeep() Edge Cases", () => {
      it("falls back to right operand when merging non-object values", () => {
        const intersection = new IntersectionSchema(syncString, syncString);
        expect(intersection.parse("same-value")).toBe("same-value");
      });

      it("handles null values safely in mergeDeep fallback", () => {
        class NullMockSchema extends Schema<null> {
          _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<null> {
            if (input === null) return makeSuccess(null);
            addIssue(ctx, {
              code: "invalid_type",
              expected: "null",
              received: typeof input,
              message: "Expected null",
            });
            return makeFailure(ctx.issues);
          }
        }
        const nullSchema = new NullMockSchema();
        const intersection = new IntersectionSchema(nullSchema, nullSchema);

        expect(intersection.parse(null)).toBeNull();
      });
    });
  });

  // ==========================================
  // LazySchema
  // ==========================================
  describe("LazySchema", () => {
    interface TreeNode {
      name: string;
      children?: TreeNode[];
    }

    it("evaluates getter lazily for recursive synchronous structures", () => {
      const treeSchema: Schema<TreeNode> = new LazySchema<TreeNode>(() =>
        new ObjectSchema({
          name: syncString,
          children: new (class extends Schema<TreeNode[] | undefined> {
            _parse(
              input: unknown,
              ctx: ParseContext
            ): DynamicParseReturnType<TreeNode[] | undefined> {
              if (input === undefined) return makeSuccess(undefined);
              if (Array.isArray(input)) {
                const results: TreeNode[] = [];
                for (const item of input) {
                  const res = treeSchema._parse(item, ctx);
                  if (isPromise(res)) throw new Error("Unexpected async");
                  if (!res.success) return makeFailure(ctx.issues);
                  results.push(res.data);
                }
                return makeSuccess(results);
              }
              addIssue(ctx, {
                code: "invalid_type",
                expected: "array",
                received: typeof input,
                message: "Expected array",
              });
              return makeFailure(ctx.issues);
            }
          })(),
        })
      );

      const tree: TreeNode = {
        name: "Root",
        children: [
          {
            name: "Child 1",
            children: [{ name: "Grandchild 1" }],
          },
        ],
      };

      const result = treeSchema.parse(tree);
      expect(result.name).toBe("Root");
      expect(result.children?.[0]?.name).toBe("Child 1");
      expect(result.children?.[0]?.children?.[0]?.name).toBe("Grandchild 1");
    });

    it("evaluates getter lazily for asynchronous schemas via parseAsync()", async () => {
      const lazyAsync = new LazySchema(() => asyncString);
      const res = await lazyAsync.parseAsync("lazy async");
      expect(res).toBe("LAZY ASYNC");
    });
  });
});
import { describe, it, expect, expectTypeOf } from "vitest";
import { ValidationError } from "../../src/core/error.js";
import type { ValidationIssue } from "../../src/core/issue.js";
import {
  makeSuccess,
  makeFailure,
  isPromise,
  type ParseResult,
  type SafeParseResult,
  type SyncParseReturnType,
  type AsyncParseReturnType,
  type DynamicParseReturnType,
} from "../../src/core/result.js";

describe("Parse Result Module", () => {
  describe("makeSuccess", () => {
    it("creates a success result with primitive data", () => {
      const result = makeSuccess("hello world");

      expect(result).toEqual({
        success: true,
        data: "hello world",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("hello world");
      }
    });

    it("creates a success result with complex nested objects and nullish values", () => {
      const data = { id: 101, details: { active: true }, tags: [null, undefined] };
      const result = makeSuccess(data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(data);
      }
    });
  });

  describe("makeFailure", () => {
    it("creates a failure result with issues array and freezes the issues", () => {
      const issues: ValidationIssue[] = [
        {
          code: "invalid_type",
          path: ["user", "email"],
          message: "Expected string, received number",
          expected: "string",
          received: "number",
        },
      ];

      const result = makeFailure(issues);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues).toEqual(issues);
        expect(Object.isFrozen(result.issues)).toBe(true);
      }
    });

    it("creates a failure result with empty issues array", () => {
      const result = makeFailure([]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues).toEqual([]);
        expect(Object.isFrozen(result.issues)).toBe(true);
      }
    });

    it("prevents runtime mutation of the issues array", () => {
      const result = makeFailure([]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(() => {
          (result.issues as ValidationIssue[]).push({
            code: "custom",
            path: [],
            message: "Illegal mutation",
          });
        }).toThrowError(TypeError);
      }
    });
  });

  describe("isPromise", () => {
    it("returns true for native Promise instances", () => {
      const nativePromise = Promise.resolve(42);
      expect(isPromise(nativePromise)).toBe(true);
    });

    it("returns true for custom Promise-like (thenable) objects", () => {
      const thenable = {
        then: (resolve: (val: number) => void) => resolve(1),
      };
      expect(isPromise(thenable)).toBe(true);
    });

    it("returns false for null and undefined", () => {
      expect(isPromise(null)).toBe(false);
      expect(isPromise(undefined)).toBe(false);
    });

    it("returns false for primitives", () => {
      expect(isPromise(123)).toBe(false);
      expect(isPromise("then")).toBe(false);
      expect(isPromise(true)).toBe(false);
      expect(isPromise(Symbol("promise"))).toBe(false);
      expect(isPromise(100n)).toBe(false);
    });

    it("returns false for plain objects without a 'then' property", () => {
      expect(isPromise({})).toBe(false);
      expect(isPromise({ otherProp: 123 })).toBe(false);
    });

    it("returns false for objects where 'then' is not a function", () => {
      expect(isPromise({ then: true })).toBe(false);
      expect(isPromise({ then: "function" })).toBe(false);
      expect(isPromise({ then: 42 })).toBe(false);
      expect(isPromise({ then: {} })).toBe(false);
      expect(isPromise({ then: null })).toBe(false);
    });

    it("returns false for functions that do not have a then method", () => {
      const fn = () => {};
      expect(isPromise(fn)).toBe(false);
    });
  });

  describe("Type Level Invariants", () => {
    it("verifies ParseResult and SafeParseResult union discrimination", () => {
      type User = { id: string };

      expectTypeOf<ParseResult<User>>().toMatchTypeOf<
        | { readonly success: true; readonly data: User }
        | { readonly success: false; readonly issues: readonly ValidationIssue[] }
      >();

      expectTypeOf<SafeParseResult<User>>().toMatchTypeOf<
        | { readonly success: true; readonly data: User; readonly error?: never }
        | { readonly success: false; readonly error: ValidationError; readonly data?: never }
      >();

      expectTypeOf<SyncParseReturnType<User>>().toEqualTypeOf<ParseResult<User>>();
      expectTypeOf<AsyncParseReturnType<User>>().toEqualTypeOf<Promise<ParseResult<User>>>();
      expectTypeOf<DynamicParseReturnType<User>>().toEqualTypeOf<
        ParseResult<User> | Promise<ParseResult<User>>
      >();
    });
  });
});
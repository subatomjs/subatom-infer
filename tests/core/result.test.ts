/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import { ValidationError } from "../../src/core/error.js";
import type { ValidationIssue } from "../../src/core/issue.js";
import {
  makeSuccess,
  makeFailure,
  isPromise,
  type ParseResult,
  type SafeParseResult,
  type ParseSuccess,
  type ParseFailure,
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
    it("creates a failure result containing ValidationError instance and issues list", () => {
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
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.issues).toEqual(issues);
        expect(Object.isFrozen(result.error.issues)).toBe(true);
      }
    });

    it("creates a failure result with empty issues array", () => {
      const result = makeFailure([]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues).toEqual([]);
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.issues).toEqual([]);
        expect(Object.isFrozen(result.error.issues)).toBe(true);
      }
    });
  });

  describe("isPromise", () => {
    it("returns true for native Promise instances", () => {
      const nativePromise = Promise.resolve(42);
      expect(isPromise(nativePromise)).toBe(true);
    });

    it("returns true for Promise-like objects with both .then and .catch methods", () => {
      const thenableAndCatchable = {
        then: (resolve: (val: number) => void) => resolve(1),
        catch: (reject: (err: unknown) => void) => reject(new Error()),
      };
      expect(isPromise(thenableAndCatchable)).toBe(true);
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

    it("returns false for plain objects without a 'then' or 'catch' property", () => {
      expect(isPromise({})).toBe(false);
      expect(isPromise({ otherProp: 123 })).toBe(false);
    });

    it("returns false for objects with 'then' method but missing 'catch' method", () => {
      const onlyThen = {
        then: (resolve: (val: number) => void) => resolve(1),
      };
      expect(isPromise(onlyThen)).toBe(false);
    });

    it("returns false for objects where 'then' or 'catch' are not functions", () => {
      expect(isPromise({ then: true, catch: true })).toBe(false);
      expect(isPromise({ then: () => {}, catch: "not-a-function" })).toBe(false);
      expect(isPromise({ then: "function", catch: () => {} })).toBe(false);
      expect(isPromise({ then: 42, catch: null })).toBe(false);
    });

    it("returns false for functions without a then and catch method", () => {
      const fn = () => {};
      expect(isPromise(fn)).toBe(false);
    });
  });

  describe("Type Level Invariants", () => {
    it("verifies ParseResult, SafeParseResult, and DynamicParseReturnType types", () => {
      type User = { id: string };

      expectTypeOf<ParseSuccess<User>>().toEqualTypeOf<{
        readonly success: true;
        readonly data: User;
      }>();

      expectTypeOf<ParseFailure>().toEqualTypeOf<{
        readonly success: false;
        readonly error: ValidationError;
        readonly issues: readonly ValidationIssue[];
      }>();

      expectTypeOf<ParseResult<User>>().toEqualTypeOf<
        ParseSuccess<User> | ParseFailure
      >();

      expectTypeOf<SafeParseResult<User>>().toEqualTypeOf<ParseResult<User>>();

      expectTypeOf<DynamicParseReturnType<User>>().toEqualTypeOf<
        ParseResult<User> | Promise<ParseResult<User>>
      >();
    });
  });
});
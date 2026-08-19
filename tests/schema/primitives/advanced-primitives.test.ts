import { describe, it, expect, expectTypeOf } from "vitest";
import {
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
  type LiteralValue,
} from "../../../src/schemas/primitives/advanced-primitives.js";
import { ValidationError } from "../../../src/core/error.js";

describe("Primitives Schemas", () => {
  // ==========================================
  // BooleanSchema
  // ==========================================
  describe("BooleanSchema", () => {
    const schema = new BooleanSchema();

    it("verifies static TypeScript output and input types", () => {
      expectTypeOf(schema._output).toEqualTypeOf<boolean>();
      expectTypeOf(schema._input).toEqualTypeOf<boolean>();
    });

    it("parses valid boolean values (true and false)", () => {
      expect(schema.parse(true)).toBe(true);
      expect(schema.parse(false)).toBe(false);
    });

    it("fails when input is not a boolean", () => {
      const nonBooleans: unknown[] = ["true", 1, 0, null, undefined, {}, []];

      for (const input of nonBooleans) {
        const safe = schema.safeParse(input);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error).toBeInstanceOf(ValidationError);
          const issue = safe.error.issues[0];
          expect(issue?.code).toBe("invalid_type");
          if (issue?.code === "invalid_type") {
            expect(issue.expected).toBe("boolean");
            expect(issue.received).toBe(typeof input);
            expect(issue.message).toBe(`Expected boolean, received ${typeof input}`);
          }
        }
      }
    });
  });

  // ==========================================
  // DateSchema
  // ==========================================
  describe("DateSchema", () => {
    const schema = new DateSchema();

    it("verifies static TypeScript output and input types", () => {
      expectTypeOf(schema._output).toEqualTypeOf<Date>();
      expectTypeOf(schema._input).toEqualTypeOf<Date>();
    });

    it("parses valid Date instances and returns a fresh copy", () => {
      const now = new Date("2026-08-19T12:00:00.000Z");
      const parsed = schema.parse(now);

      expect(parsed).toEqual(now);
      expect(parsed).not.toBe(now); // Verifies new Date instance immutability
    });

    it("fails when input is an Invalid Date instance", () => {
      const invalidDate = new Date("invalid-date-string");
      const safe = schema.safeParse(invalidDate);

      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error).toBeInstanceOf(ValidationError);
        const issue = safe.error.issues[0];
        expect(issue?.code).toBe("invalid_type");
        if (issue?.code === "invalid_type") {
          expect(issue.expected).toBe("Date");
          expect(issue.received).toBe("Invalid Date");
          expect(issue.message).toBe("Expected valid Date instance");
        }
      }
    });

    it("fails when input is not a Date instance", () => {
      const nonDates: unknown[] = ["2026-08-19", 1776518400000, null, undefined, {}, []];

      for (const input of nonDates) {
        const safe = schema.safeParse(input);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.error.issues[0];
          expect(issue?.code).toBe("invalid_type");
          if (issue?.code === "invalid_type") {
            expect(issue.expected).toBe("Date");
            expect(issue.received).toBe(typeof input);
          }
        }
      }
    });

    describe(".min()", () => {
      const minDate = new Date("2026-01-01T00:00:00.000Z");

      it("validates dates greater than or equal to minDate with default message", () => {
        const minSchema = schema.min(minDate);

        expect(minSchema.parse(new Date("2026-01-01T00:00:00.000Z"))).toEqual(minDate);
        expect(minSchema.parse(new Date("2026-06-01T00:00:00.000Z"))).toEqual(
          new Date("2026-06-01T00:00:00.000Z")
        );

        const safe = minSchema.safeParse(new Date("2025-12-31T23:59:59.999Z"));
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error.issues[0]?.message).toBe(
            `Date must be greater than or equal to ${minDate.toISOString()}`
          );
        }
      });

      it("uses custom error message when provided", () => {
        const minSchema = schema.min(minDate, "Date too early!");
        const safe = minSchema.safeParse(new Date("2020-01-01T00:00:00.000Z"));

        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error.issues[0]?.message).toBe("Date too early!");
        }
      });
    });

    describe(".max()", () => {
      const maxDate = new Date("2026-12-31T23:59:59.999Z");

      it("validates dates less than or equal to maxDate with default message", () => {
        const maxSchema = schema.max(maxDate);

        expect(maxSchema.parse(new Date("2026-12-31T23:59:59.999Z"))).toEqual(maxDate);
        expect(maxSchema.parse(new Date("2026-06-01T00:00:00.000Z"))).toEqual(
          new Date("2026-06-01T00:00:00.000Z")
        );

        const safe = maxSchema.safeParse(new Date("2027-01-01T00:00:00.000Z"));
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error.issues[0]?.message).toBe(
            `Date must be less than or equal to ${maxDate.toISOString()}`
          );
        }
      });

      it("uses custom error message when provided", () => {
        const maxSchema = schema.max(maxDate, "Date too late!");
        const safe = maxSchema.safeParse(new Date("2030-01-01T00:00:00.000Z"));

        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error.issues[0]?.message).toBe("Date too late!");
        }
      });
    });
  });

  // ==========================================
  // LiteralSchema
  // ==========================================
  describe("LiteralSchema", () => {
    it("stores the literal value in constructor", () => {
      const stringLiteral = new LiteralSchema("ACTIVE");
      expect(stringLiteral.value).toBe("ACTIVE");
    });

    it("parses string, number, boolean, bigint, symbol, null, undefined literals", () => {
      const testSym = Symbol("test");
      const literals: LiteralValue[] = ["v1", 42, true, BigInt(100), testSym, null, undefined];

      for (const literal of literals) {
        const literalSchema = new LiteralSchema(literal);
        expect(literalSchema.parse(literal)).toBe(literal);
      }
    });

    it("fails when input does not strictly equal literal value", () => {
      const literalSchema = new LiteralSchema("SUCCESS");
      const safe = literalSchema.safeParse("FAILED");

      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error).toBeInstanceOf(ValidationError);
        const issue = safe.error.issues[0];
        expect(issue?.code).toBe("invalid_value");
        if (issue?.code === "invalid_value") {
          expect(issue.expected).toBe("SUCCESS");
          expect(issue.received).toBe("FAILED");
          expect(issue.message).toBe("Expected literal SUCCESS, received FAILED");
        }
      }
    });
  });

  // ==========================================
  // NullSchema
  // ==========================================
  describe("NullSchema", () => {
    const schema = new NullSchema();

    it("parses null successfully", () => {
      expect(schema.parse(null)).toBeNull();
    });

    it("fails when input is not null", () => {
      const nonNulls: unknown[] = [undefined, false, 0, "", {}, []];

      for (const input of nonNulls) {
        const safe = schema.safeParse(input);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.error.issues[0];
          expect(issue?.code).toBe("invalid_type");
          if (issue?.code === "invalid_type") {
            expect(issue.expected).toBe("null");
            expect(issue.received).toBe(typeof input);
            expect(issue.message).toBe("Expected null");
          }
        }
      }
    });
  });

  // ==========================================
  // UndefinedSchema
  // ==========================================
  describe("UndefinedSchema", () => {
    const schema = new UndefinedSchema();

    it("parses undefined successfully", () => {
      expect(schema.parse(undefined)).toBeUndefined();
    });

    it("fails when input is not undefined", () => {
      const nonUndefineds: unknown[] = [null, false, 0, "", {}, []];

      for (const input of nonUndefineds) {
        const safe = schema.safeParse(input);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.error.issues[0];
          expect(issue?.code).toBe("invalid_type");
          if (issue?.code === "invalid_type") {
            expect(issue.expected).toBe("undefined");
            expect(issue.received).toBe(typeof input);
            expect(issue.message).toBe("Expected undefined");
          }
        }
      }
    });
  });

  // ==========================================
  // AnySchema & UnknownSchema
  // ==========================================
  describe("AnySchema & UnknownSchema", () => {
    const anySchema = new AnySchema();
    const unknownSchema = new UnknownSchema();
    const testValues: unknown[] = ["text", 123, true, null, undefined, { a: 1 }, [1, 2], Symbol("s")];

    it("AnySchema accepts any input without validation errors", () => {
      for (const val of testValues) {
        expect(anySchema.parse(val)).toBe(val);
      }
    });

    it("UnknownSchema accepts any input without validation errors", () => {
      for (const val of testValues) {
        expect(unknownSchema.parse(val)).toBe(val);
      }
    });
  });

  // ==========================================
  // NeverSchema
  // ==========================================
  describe("NeverSchema", () => {
    const schema = new NeverSchema();

    it("fails for every input type", () => {
      const inputs: unknown[] = ["anything", 123, null, undefined, true, {}];

      for (const input of inputs) {
        const safe = schema.safeParse(input);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.error.issues[0];
          expect(issue?.code).toBe("invalid_type");
          if (issue?.code === "invalid_type") {
            expect(issue.expected).toBe("never");
            expect(issue.received).toBe(typeof input);
            expect(issue.message).toBe("Expected never");
          }
        }
      }
    });
  });

  // ==========================================
  // SymbolSchema
  // ==========================================
  describe("SymbolSchema", () => {
    const schema = new SymbolSchema();

    it("parses valid symbols successfully", () => {
      const sym = Symbol("custom");
      expect(schema.parse(sym)).toBe(sym);
      expect(schema.parse(Symbol.for("registered"))).toBe(Symbol.for("registered"));
    });

    it("fails when input is not a symbol", () => {
      const nonSymbols: unknown[] = ["symbol", 123, true, null, undefined, {}, []];

      for (const input of nonSymbols) {
        const safe = schema.safeParse(input);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.error.issues[0];
          expect(issue?.code).toBe("invalid_type");
          if (issue?.code === "invalid_type") {
            expect(issue.expected).toBe("symbol");
            expect(issue.received).toBe(typeof input);
            expect(issue.message).toBe("Expected symbol");
          }
        }
      }
    });
  });

  // ==========================================
  // NaNSchema
  // ==========================================
  describe("NaNSchema", () => {
    const schema = new NaNSchema();

    it("parses NaN successfully and returns Number.NaN", () => {
      const result = schema.parse(Number.NaN);
      expect(Number.isNaN(result)).toBe(true);
    });

    it("fails when input is a valid number (not NaN)", () => {
      const safe = schema.safeParse(42);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error).toBeInstanceOf(ValidationError);
        const issue = safe.error.issues[0];
        expect(issue?.code).toBe("invalid_type");
        if (issue?.code === "invalid_type") {
          expect(issue.expected).toBe("NaN");
          expect(issue.received).toBe("42");
          expect(issue.message).toBe("Expected NaN");
        }
      }
    });

    it("fails when input is not a number type", () => {
      const nonNumbers: unknown[] = ["NaN", null, undefined, true, {}, []];

      for (const input of nonNumbers) {
        const safe = schema.safeParse(input);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.error.issues[0];
          expect(issue?.code).toBe("invalid_type");
          if (issue?.code === "invalid_type") {
            expect(issue.expected).toBe("NaN");
            expect(issue.received).toBe(typeof input);
          }
        }
      }
    });
  });
});
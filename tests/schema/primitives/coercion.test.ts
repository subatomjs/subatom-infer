import { describe, it, expect, expectTypeOf } from "vitest";
import { coerce } from "../../../src/schemas/primitives/coercion.js";
import { ValidationError } from "../../../src/core/error.js";

describe("Coercion Schemas (coerce)", () => {
  // ==========================================
  // coerce.string()
  // ==========================================
  describe("coerce.string()", () => {
    const stringSchema = coerce.string();

    it("verifies static TypeScript output and input types", () => {
      expectTypeOf(stringSchema._output).toEqualTypeOf<string>();
      expectTypeOf(stringSchema._input).toEqualTypeOf<unknown>();
    });

    it("coerces null and undefined to literal string equivalents", () => {
      expect(stringSchema.parse(null)).toBe("null");
      expect(stringSchema.parse(undefined)).toBe("undefined");
    });

    it("coerces serializable objects and arrays to JSON strings", () => {
      expect(stringSchema.parse({ name: "Alice", age: 30 })).toBe(
        '{"name":"Alice","age":30}',
      );
      expect(stringSchema.parse([1, 2, 3])).toBe("[1,2,3]");
    });

    it("falls back to String(object) when JSON.stringify throws (circular references / BigInt)", () => {
      const circular: Record<string, unknown> = { key: "value" };
      circular.self = circular;

      expect(stringSchema.parse(circular)).toBe("[object Object]");

      const bigIntObject = { value: 100n };
      expect(stringSchema.parse(bigIntObject)).toBe("[object Object]");
    });

    it("coerces numbers, booleans, bigints, and symbols directly", () => {
      expect(stringSchema.parse(12345)).toBe("12345");
      expect(stringSchema.parse(true)).toBe("true");
      expect(stringSchema.parse(100n)).toBe("100");
      expect(stringSchema.parse(Symbol("test"))).toBe("Symbol(test)");
    });
  });

  // ==========================================
  // coerce.number()
  // ==========================================
  describe("coerce.number()", () => {
    const numberSchema = coerce.number();

    it("verifies static TypeScript output and input types", () => {
      expectTypeOf(numberSchema._output).toEqualTypeOf<number>();
      expectTypeOf(numberSchema._input).toEqualTypeOf<unknown>();
    });

    it("coerces valid numeric strings, booleans, and null to numbers", () => {
      expect(numberSchema.parse("42")).toBe(42);
      expect(numberSchema.parse("3.1415")).toBe(3.1415);
      expect(numberSchema.parse("-100")).toBe(-100);
      expect(numberSchema.parse(true)).toBe(1);
      expect(numberSchema.parse(false)).toBe(0);
      expect(numberSchema.parse(null)).toBe(0);
    });

    it("fails when input cannot be coerced to a valid number", () => {
      const uncoercible: unknown[] = ["invalid_number", undefined, {}, [1, 2]];

      for (const input of uncoercible) {
        const safe = numberSchema.safeParse(input);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error).toBeInstanceOf(ValidationError);
          const issue = safe.error.issues[0];
          expect(issue?.code).toBe("invalid_type");
          if (issue?.code === "invalid_type") {
            expect(issue.expected).toBe("number");
            expect(issue.received).toBe(String(input));
            expect(issue.message).toBe(
              `Could not coerce "${String(input)}" to number`,
            );
          }
        }
      }
    });
  });

  // ==========================================
  // coerce.boolean()
  // ==========================================
  describe("coerce.boolean()", () => {
    const booleanSchema = coerce.boolean();

    it("verifies static TypeScript output and input types", () => {
      expectTypeOf(booleanSchema._output).toEqualTypeOf<boolean>();
      expectTypeOf(booleanSchema._input).toEqualTypeOf<unknown>();
    });

    it("coerces specific string values ('false', '0', 'off') with whitespace and casing to false", () => {
      expect(booleanSchema.parse("false")).toBe(false);
      expect(booleanSchema.parse("FALSE")).toBe(false);
      expect(booleanSchema.parse("  false  ")).toBe(false);
      expect(booleanSchema.parse("0")).toBe(false);
      expect(booleanSchema.parse("off")).toBe(false);
      expect(booleanSchema.parse("OFF")).toBe(false);
      expect(booleanSchema.parse("  off  ")).toBe(false);
    });

    it("coerces other truthy strings to true", () => {
      expect(booleanSchema.parse("true")).toBe(true);
      expect(booleanSchema.parse("1")).toBe(true);
      expect(booleanSchema.parse("yes")).toBe(true);
      expect(booleanSchema.parse("on")).toBe(true);
      expect(booleanSchema.parse("anything")).toBe(true);
    });

    it("coerces non-string primitives and objects according to Boolean(input)", () => {
      expect(booleanSchema.parse(1)).toBe(true);
      expect(booleanSchema.parse(0)).toBe(false);
      expect(booleanSchema.parse(null)).toBe(false);
      expect(booleanSchema.parse(undefined)).toBe(false);
      expect(booleanSchema.parse({})).toBe(true);
      expect(booleanSchema.parse([])).toBe(true);
    });
  });

  // ==========================================
  // coerce.bigint()
  // ==========================================
  describe("coerce.bigint()", () => {
    const bigintSchema = coerce.bigint();

    it("verifies static TypeScript output and input types", () => {
      expectTypeOf(bigintSchema._output).toEqualTypeOf<bigint>();
      expectTypeOf(bigintSchema._input).toEqualTypeOf<unknown>();
    });

    it("coerces valid strings, numbers, booleans, and bigints to bigint", () => {
      expect(bigintSchema.parse("12345678901234567890")).toBe(
        12345678901234567890n,
      );
      expect(bigintSchema.parse("-999")).toBe(-999n);
      expect(bigintSchema.parse(42)).toBe(42n);
      expect(bigintSchema.parse(true)).toBe(1n);
      expect(bigintSchema.parse(false)).toBe(0n);
      expect(bigintSchema.parse(100n)).toBe(100n);
    });

    it("fails when input cannot be coerced to bigint", () => {
      const uncoercibleBigInts: unknown[] = [
        "not_a_bigint",
        1.5, // Float numbers cannot convert directly to BigInt
        null,
        undefined,
        {},
        [],
        Symbol("b"),
      ];

      for (const input of uncoercibleBigInts) {
        const safe = bigintSchema.safeParse(input);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error).toBeInstanceOf(ValidationError);
          const issue = safe.error.issues[0];
          expect(issue?.code).toBe("invalid_type");
          if (issue?.code === "invalid_type") {
            expect(issue.expected).toBe("bigint");
            expect(issue.received).toBe(String(input));
            expect(issue.message).toBe(
              `Could not coerce "${String(input)}" to bigint`,
            );
          }
        }
      }
    });
  });

  // ==========================================
  // coerce.date()
  // ==========================================
  describe("coerce.date()", () => {
    const dateSchema = coerce.date();

    it("verifies static TypeScript output and input types", () => {
      expectTypeOf(dateSchema._output).toEqualTypeOf<Date>();
      expectTypeOf(dateSchema._input).toEqualTypeOf<unknown>();
    });

    it("coerces ISO strings, timestamps, and Date instances to valid Date", () => {
      const iso = "2026-08-19T12:00:00.000Z";
      const parsedIso = dateSchema.parse(iso);
      expect(parsedIso).toBeInstanceOf(Date);
      expect(parsedIso.toISOString()).toBe(iso);

      const timestamp = 1776518400000;
      const parsedTimestamp = dateSchema.parse(timestamp);
      expect(parsedTimestamp.getTime()).toBe(timestamp);

      const dateObj = new Date("2026-01-01T00:00:00.000Z");
      const parsedDateObj = dateSchema.parse(dateObj);
      expect(parsedDateObj.getTime()).toBe(dateObj.getTime());
    });

    it("fails when input is null or boolean", () => {
      const invalidTypes: unknown[] = [null, true, false];

      for (const input of invalidTypes) {
        const safe = dateSchema.safeParse(input);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error).toBeInstanceOf(ValidationError);
          const issue = safe.error.issues[0];
          expect(issue?.code).toBe("invalid_type");
          if (issue?.code === "invalid_type") {
            expect(issue.expected).toBe("Date");
            expect(issue.received).toBe(String(input));
            expect(issue.message).toBe(
              `Could not coerce "${String(input)}" to Date`,
            );
          }
        }
      }
    });

    it("fails when input string or object results in Invalid Date", () => {
      const invalidDates: unknown[] = [
        "invalid_date_format",
        undefined,
        {},
        [],
      ];

      for (const input of invalidDates) {
        const safe = dateSchema.safeParse(input);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error).toBeInstanceOf(ValidationError);
          const issue = safe.error.issues[0];
          expect(issue?.code).toBe("invalid_type");
          if (issue?.code === "invalid_type") {
            expect(issue.expected).toBe("Date");
            expect(issue.received).toBe(String(input));
            expect(issue.message).toBe(
              `Could not coerce "${String(input)}" to Date`,
            );
          }
        }
      }
    });
  });
});

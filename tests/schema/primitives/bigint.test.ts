import { describe, it, expect, expectTypeOf } from "vitest";
import { BigIntSchema } from "../../../src/schemas/primitives/bigint.js";
import { ValidationError } from "../../../src/core/error.js";

describe("BigIntSchema", () => {
  const baseSchema = new BigIntSchema();

  describe("Constructor & Static Type Inference", () => {
    it("initializes with an empty checks array by default", () => {
      expect(baseSchema.checks).toEqual([]);
    });

    it("verifies static TypeScript output and input types", () => {
      expectTypeOf(baseSchema._output).toEqualTypeOf<bigint>();
      expectTypeOf(baseSchema._input).toEqualTypeOf<bigint>();
    });
  });

  describe("Basic Type Validation", () => {
    it("parses valid bigint values (positive, zero, negative)", () => {
      expect(baseSchema.parse(100n)).toBe(100n);
      expect(baseSchema.parse(0n)).toBe(0n);
      expect(baseSchema.parse(-50n)).toBe(-50n);
    });

    it("fails when input is not a bigint", () => {
      const nonBigInts: unknown[] = [123, "100", true, null, undefined, {}, [], Symbol("bi")];

      for (const input of nonBigInts) {
        const safe = baseSchema.safeParse(input);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error).toBeInstanceOf(ValidationError);
          const issue = safe.error.issues[0];
          expect(issue?.code).toBe("invalid_type");
          if (issue?.code === "invalid_type") {
            expect(issue.expected).toBe("bigint");
            expect(issue.received).toBe(typeof input);
            expect(issue.message).toBe(`Expected bigint, received ${typeof input}`);
          }
        }
      }
    });
  });

  describe("min()", () => {
    it("passes when bigint is greater than or equal to minimum", () => {
      const schema = baseSchema.min(10n);
      expect(schema.parse(10n)).toBe(10n);
      expect(schema.parse(11n)).toBe(11n);
    });

    it("fails with default error message when value is below minimum", () => {
      const schema = baseSchema.min(10n);
      const safe = schema.safeParse(9n);

      expect(safe.success).toBe(false);
      if (!safe.success) {
        const issue = safe.error.issues[0];
        expect(issue?.code).toBe("too_small");
        if (issue?.code === "too_small") {
          expect(issue.minimum).toBe(10n);
          expect(issue.inclusive).toBe(true);
          expect(issue.origin).toBe("bigint");
          expect(issue.message).toBe("Must be >= 10n");
        }
      }
    });

    it("fails with custom error message when provided", () => {
      const schema = baseSchema.min(10n, "Value too low!");
      const safe = schema.safeParse(5n);

      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error.issues[0]?.message).toBe("Value too low!");
      }
    });
  });

  describe("max()", () => {
    it("passes when bigint is less than or equal to maximum", () => {
      const schema = baseSchema.max(100n);
      expect(schema.parse(100n)).toBe(100n);
      expect(schema.parse(99n)).toBe(99n);
    });

    it("fails with default error message when value exceeds maximum", () => {
      const schema = baseSchema.max(100n);
      const safe = schema.safeParse(101n);

      expect(safe.success).toBe(false);
      if (!safe.success) {
        const issue = safe.error.issues[0];
        expect(issue?.code).toBe("too_big");
        if (issue?.code === "too_big") {
          expect(issue.maximum).toBe(100n);
          expect(issue.inclusive).toBe(true);
          expect(issue.origin).toBe("bigint");
          expect(issue.message).toBe("Must be <= 100n");
        }
      }
    });

    it("fails with custom error message when provided", () => {
      const schema = baseSchema.max(100n, "Value too high!");
      const safe = schema.safeParse(150n);

      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error.issues[0]?.message).toBe("Value too high!");
      }
    });
  });

  describe("Convenience Numeric Constraints", () => {
    describe("positive()", () => {
      it("validates positive bigints (>= 1n)", () => {
        const schema = baseSchema.positive();
        expect(schema.parse(1n)).toBe(1n);
        expect(schema.parse(100n)).toBe(100n);

        const safeZero = schema.safeParse(0n);
        expect(safeZero.success).toBe(false);
        if (!safeZero.success) {
          expect(safeZero.error.issues[0]?.message).toBe("Must be positive");
        }

        const safeNegative = baseSchema.positive("Need positive bigint").safeParse(-1n);
        expect(safeNegative.success).toBe(false);
        if (!safeNegative.success) {
          expect(safeNegative.error.issues[0]?.message).toBe("Need positive bigint");
        }
      });
    });

    describe("nonnegative()", () => {
      it("validates non-negative bigints (>= 0n)", () => {
        const schema = baseSchema.nonnegative();
        expect(schema.parse(0n)).toBe(0n);
        expect(schema.parse(50n)).toBe(50n);

        const safe = schema.safeParse(-1n);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error.issues[0]?.message).toBe("Must be non-negative");
        }

        const safeCustom = baseSchema.nonnegative("Custom non-negative error").safeParse(-5n);
        expect(safeCustom.success).toBe(false);
        if (!safeCustom.success) {
          expect(safeCustom.error.issues[0]?.message).toBe("Custom non-negative error");
        }
      });
    });

    describe("negative()", () => {
      it("validates negative bigints (<= -1n)", () => {
        const schema = baseSchema.negative();
        expect(schema.parse(-1n)).toBe(-1n);
        expect(schema.parse(-50n)).toBe(-50n);

        const safeZero = schema.safeParse(0n);
        expect(safeZero.success).toBe(false);
        if (!safeZero.success) {
          expect(safeZero.error.issues[0]?.message).toBe("Must be negative");
        }

        const safeCustom = baseSchema.negative("Must be strictly negative").safeParse(1n);
        expect(safeCustom.success).toBe(false);
        if (!safeCustom.success) {
          expect(safeCustom.error.issues[0]?.message).toBe("Must be strictly negative");
        }
      });
    });

    describe("nonpositive()", () => {
      it("validates non-positive bigints (<= 0n)", () => {
        const schema = baseSchema.nonpositive();
        expect(schema.parse(0n)).toBe(0n);
        expect(schema.parse(-10n)).toBe(-10n);

        const safe = schema.safeParse(1n);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error.issues[0]?.message).toBe("Must be non-positive");
        }

        const safeCustom = baseSchema.nonpositive("Custom non-positive error").safeParse(10n);
        expect(safeCustom.success).toBe(false);
        if (!safeCustom.success) {
          expect(safeCustom.error.issues[0]?.message).toBe("Custom non-positive error");
        }
      });
    });
  });

  describe("multipleOf()", () => {
    it("passes when bigint is divisible by step", () => {
      const schema = baseSchema.multipleOf(5n);
      expect(schema.parse(0n)).toBe(0n);
      expect(schema.parse(15n)).toBe(15n);
      expect(schema.parse(-25n)).toBe(-25n);
    });

    it("fails with default error message when bigint is not a multiple", () => {
      const schema = baseSchema.multipleOf(5n);
      const safe = schema.safeParse(7n);

      expect(safe.success).toBe(false);
      if (!safe.success) {
        const issue = safe.error.issues[0];
        expect(issue?.code).toBe("invalid_value");
        if (issue?.code === "invalid_value") {
          expect(issue.received).toBe(7n);
          expect(issue.message).toBe("Must be multiple of 5n");
        }
      }
    });

    it("fails with custom error message when provided", () => {
      const schema = baseSchema.multipleOf(3n, "Must be divisible by three");
      const safe = schema.safeParse(10n);

      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error.issues[0]?.message).toBe("Must be divisible by three");
      }
    });
  });

  describe("Chained & Compound Checks", () => {
    it("aggregates multiple validation check failures on a single input", () => {
      const schema = baseSchema.min(10n).max(20n).multipleOf(2n);

      // Value 7n violates min(10n) and multipleOf(2n)
      const safe = schema.safeParse(7n);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error.issues).toHaveLength(2);
        expect(safe.error.issues[0]?.code).toBe("too_small");
        expect(safe.error.issues[1]?.code).toBe("invalid_value");
      }
    });

    it("passes when all chained constraints are satisfied", () => {
      const schema = baseSchema.min(10n).max(30n).multipleOf(5n);
      expect(schema.parse(15n)).toBe(15n);
      expect(schema.parse(20n)).toBe(20n);
      expect(schema.parse(30n)).toBe(30n);
    });
  });
});
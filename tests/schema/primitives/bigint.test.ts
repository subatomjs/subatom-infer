import { describe, it, expect, expectTypeOf } from "vitest";
import { BigIntSchema } from "../../../src/schemas/primitives/bigint.js";
import { ValidationError } from "../../../src/core/error.js";

describe("BigIntSchema", () => {
  const baseSchema = new BigIntSchema();

  describe("Constructor & Static Type Inference", () => {
    it("initializes with an empty checks array and freezes it", () => {
      expect(baseSchema.checks).toEqual([]);
      expect(Object.isFrozen(baseSchema.checks)).toBe(true);
    });

    it("initializes with predefined custom checks and freezes the array", () => {
      const customCheck = {
        kind: "custom",
        validate: (v: bigint) => v !== 0n,
        message: "Cannot be zero",
      };
      const schemaWithChecks = new BigIntSchema([customCheck]);

      expect(schemaWithChecks.checks).toHaveLength(1);
      expect(schemaWithChecks.checks[0]).toBe(customCheck);
      expect(Object.isFrozen(schemaWithChecks.checks)).toBe(true);
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
          const issue = safe.issues[0];
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

  describe("min() & gte()", () => {
    it("passes when bigint is greater than or equal to minimum", () => {
      const schemaMin = baseSchema.min(10n);
      expect(schemaMin.parse(10n)).toBe(10n);
      expect(schemaMin.parse(11n)).toBe(11n);

      const schemaGte = baseSchema.gte(10n);
      expect(schemaGte.parse(10n)).toBe(10n);
      expect(schemaGte.parse(15n)).toBe(15n);
    });

    it("fails with default error message when value is below minimum", () => {
      const schema = baseSchema.min(10n);
      const safe = schema.safeParse(9n);

      expect(safe.success).toBe(false);
      if (!safe.success) {
        const issue = safe.issues[0];
        expect(issue?.code).toBe("too_small");
        if (issue?.code === "too_small") {
          expect(issue.minimum).toBe(10n);
          expect(issue.inclusive).toBe(true);
          expect(issue.origin).toBe("bigint");
          expect(issue.message).toBe("Must be greater than or equal to 10n");
        }
      }
    });

    it("fails with custom error message when provided", () => {
      const schema = baseSchema.gte(10n, "Value too low!");
      const safe = schema.safeParse(5n);

      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe("Value too low!");
      }
    });
  });

  describe("max() & lte()", () => {
    it("passes when bigint is less than or equal to maximum", () => {
      const schemaMax = baseSchema.max(100n);
      expect(schemaMax.parse(100n)).toBe(100n);
      expect(schemaMax.parse(99n)).toBe(99n);

      const schemaLte = baseSchema.lte(100n);
      expect(schemaLte.parse(100n)).toBe(100n);
      expect(schemaLte.parse(50n)).toBe(50n);
    });

    it("fails with default error message when value exceeds maximum", () => {
      const schema = baseSchema.max(100n);
      const safe = schema.safeParse(101n);

      expect(safe.success).toBe(false);
      if (!safe.success) {
        const issue = safe.issues[0];
        expect(issue?.code).toBe("too_big");
        if (issue?.code === "too_big") {
          expect(issue.maximum).toBe(100n);
          expect(issue.inclusive).toBe(true);
          expect(issue.origin).toBe("bigint");
          expect(issue.message).toBe("Must be less than or equal to 100n");
        }
      }
    });

    it("fails with custom error message when provided", () => {
      const schema = baseSchema.lte(100n, "Value too high!");
      const safe = schema.safeParse(150n);

      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe("Value too high!");
      }
    });
  });

  describe("gt() & lt()", () => {
    it("validates strict greater than constraint with gt()", () => {
      const schema = baseSchema.gt(10n);
      expect(schema.parse(11n)).toBe(11n);

      const safeExact = schema.safeParse(10n);
      expect(safeExact.success).toBe(false);
      if (!safeExact.success) {
        const issue = safeExact.issues[0];
        expect(issue?.code).toBe("too_small");
        if (issue?.code === "too_small") {
          expect(issue.minimum).toBe(10n);
          expect(issue.inclusive).toBe(false);
          expect(issue.message).toBe("Must be strictly greater than 10n");
        }
      }

      const safeCustom = baseSchema.gt(10n, "Must exceed 10n").safeParse(9n);
      expect(safeCustom.success).toBe(false);
      if (!safeCustom.success) {
        expect(safeCustom.issues[0]?.message).toBe("Must exceed 10n");
      }
    });

    it("validates strict less than constraint with lt()", () => {
      const schema = baseSchema.lt(10n);
      expect(schema.parse(9n)).toBe(9n);

      const safeExact = schema.safeParse(10n);
      expect(safeExact.success).toBe(false);
      if (!safeExact.success) {
        const issue = safeExact.issues[0];
        expect(issue?.code).toBe("too_big");
        if (issue?.code === "too_big") {
          expect(issue.maximum).toBe(10n);
          expect(issue.inclusive).toBe(false);
          expect(issue.message).toBe("Must be strictly less than 10n");
        }
      }

      const safeCustom = baseSchema.lt(10n, "Must be under 10n").safeParse(15n);
      expect(safeCustom.success).toBe(false);
      if (!safeCustom.success) {
        expect(safeCustom.issues[0]?.message).toBe("Must be under 10n");
      }
    });
  });

  describe("Convenience Numeric Constraints", () => {
    describe("positive()", () => {
      it("validates positive bigints (gt 0n)", () => {
        const schema = baseSchema.positive();
        expect(schema.parse(1n)).toBe(1n);
        expect(schema.parse(100n)).toBe(100n);

        const safeZero = schema.safeParse(0n);
        expect(safeZero.success).toBe(false);
        if (!safeZero.success) {
          const issue = safeZero.issues[0];
          expect(issue?.message).toBe("Must be positive");
          if (issue?.code === "too_small") {
            expect(issue.inclusive).toBe(false);
          }
        }

        const safeNegative = baseSchema.positive("Need positive bigint").safeParse(-1n);
        expect(safeNegative.success).toBe(false);
        if (!safeNegative.success) {
          expect(safeNegative.issues[0]?.message).toBe("Need positive bigint");
        }
      });
    });

    describe("nonnegative()", () => {
      it("validates non-negative bigints (gte 0n)", () => {
        const schema = baseSchema.nonnegative();
        expect(schema.parse(0n)).toBe(0n);
        expect(schema.parse(50n)).toBe(50n);

        const safe = schema.safeParse(-1n);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.issues[0];
          expect(issue?.message).toBe("Must be non-negative");
          if (issue?.code === "too_small") {
            expect(issue.inclusive).toBe(true);
          }
        }

        const safeCustom = baseSchema.nonnegative("Custom non-negative error").safeParse(-5n);
        expect(safeCustom.success).toBe(false);
        if (!safeCustom.success) {
          expect(safeCustom.issues[0]?.message).toBe("Custom non-negative error");
        }
      });
    });

    describe("negative()", () => {
      it("validates negative bigints (lt 0n)", () => {
        const schema = baseSchema.negative();
        expect(schema.parse(-1n)).toBe(-1n);
        expect(schema.parse(-50n)).toBe(-50n);

        const safeZero = schema.safeParse(0n);
        expect(safeZero.success).toBe(false);
        if (!safeZero.success) {
          const issue = safeZero.issues[0];
          expect(issue?.message).toBe("Must be negative");
          if (issue?.code === "too_big") {
            expect(issue.inclusive).toBe(false);
          }
        }

        const safeCustom = baseSchema.negative("Must be strictly negative").safeParse(1n);
        expect(safeCustom.success).toBe(false);
        if (!safeCustom.success) {
          expect(safeCustom.issues[0]?.message).toBe("Must be strictly negative");
        }
      });
    });

    describe("nonpositive()", () => {
      it("validates non-positive bigints (lte 0n)", () => {
        const schema = baseSchema.nonpositive();
        expect(schema.parse(0n)).toBe(0n);
        expect(schema.parse(-10n)).toBe(-10n);

        const safe = schema.safeParse(1n);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.issues[0];
          expect(issue?.message).toBe("Must be non-positive");
          if (issue?.code === "too_big") {
            expect(issue.inclusive).toBe(true);
          }
        }

        const safeCustom = baseSchema.nonpositive("Custom non-positive error").safeParse(10n);
        expect(safeCustom.success).toBe(false);
        if (!safeCustom.success) {
          expect(safeCustom.issues[0]?.message).toBe("Custom non-positive error");
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
        const issue = safe.issues[0];
        expect(issue?.code).toBe("invalid_value");
        if (issue?.code === "invalid_value") {
          expect(issue.received).toBe(7n);
          expect(issue.message).toBe("Must be a multiple of 5n");
        }
      }
    });

    it("fails with custom error message when provided", () => {
      const schema = baseSchema.multipleOf(3n, "Must be divisible by three");
      const safe = schema.safeParse(10n);

      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe("Must be divisible by three");
      }
    });
  });

  describe("Direct Check Branches & Fallbacks", () => {
    it("handles checks without explicit limit defined", () => {
      const customMinSchema = new BigIntSchema([
        { kind: "gte", validate: () => false, message: "Limitless GTE failure" },
        { kind: "lte", validate: () => false, message: "Limitless LTE failure" },
      ]);

      const safe = customMinSchema.safeParse(50n);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues).toHaveLength(2);
        const issue0 = safe.issues[0];
        const issue1 = safe.issues[1];

        expect(issue0?.code).toBe("too_small");
        if (issue0?.code === "too_small") {
          expect(issue0.minimum).toBeUndefined();
        }

        expect(issue1?.code).toBe("too_big");
        if (issue1?.code === "too_big") {
          expect(issue1.maximum).toBeUndefined();
        }
      }
    });
  });

  describe("Chained & Compound Checks", () => {
    it("aggregates multiple validation check failures on a single input", () => {
      const schema = baseSchema.min(10n).max(20n).multipleOf(2n);

      const safe = schema.safeParse(7n);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues).toHaveLength(2);
        expect(safe.issues[0]?.code).toBe("too_small");
        expect(safe.issues[1]?.code).toBe("invalid_value");
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
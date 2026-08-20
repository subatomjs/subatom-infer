import { describe, it, expect, expectTypeOf } from "vitest";
import {
  NumberSchema,
  type NumberCheck,
} from "../../../src/schemas/primitives/number.js";
import { ValidationError } from "../../../src/core/error.js";

describe("NumberSchema (src/schemas/primitives/number.ts)", () => {
  const baseSchema = new NumberSchema();

  describe("Constructor & Type Inference", () => {
    it("initializes with an empty checks array by default and freezes it", () => {
      expect(baseSchema.checks).toEqual([]);
      expect(Object.isFrozen(baseSchema.checks)).toBe(true);
    });

    it("freezes custom checks array when provided directly", () => {
      const customCheck: NumberCheck = {
        kind: "gte",
        validate: (v) => v >= 5,
        message: "Must be at least 5",
        metadata: { min: 5 },
      };
      const schema = new NumberSchema([customCheck]);
      expect(schema.checks).toHaveLength(1);
      expect(schema.checks[0]).toBe(customCheck);
      expect(Object.isFrozen(schema.checks)).toBe(true);
    });

    it("verifies static TypeScript output and input types", () => {
      expectTypeOf(baseSchema._output).toEqualTypeOf<number>();
      expectTypeOf(baseSchema._input).toEqualTypeOf<number>();
    });
  });

  describe("Basic Type Validation & NaN Handling", () => {
    it("parses valid numbers (integers, floats, negative, zero, exponential)", () => {
      expect(baseSchema.parse(42)).toBe(42);
      expect(baseSchema.parse(3.14159)).toBe(3.14159);
      expect(baseSchema.parse(0)).toBe(0);
      expect(baseSchema.parse(-100)).toBe(-100);
      expect(baseSchema.parse(1e5)).toBe(100000);
    });

    it("fails with NaN received value when input is Number.NaN", () => {
      const safe = baseSchema.safeParse(Number.NaN);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.error).toBeInstanceOf(ValidationError);
        const issue = safe.issues[0];
        expect(issue?.code).toBe("invalid_type");
        if (issue?.code === "invalid_type") {
          expect(issue.expected).toBe("number");
          expect(issue.received).toBe("NaN");
          expect(issue.message).toBe("Expected number, received NaN");
        }
      }
    });

    it("fails when input is not a number primitive", () => {
      const nonNumbers: unknown[] = [
        "42",
        true,
        false,
        null,
        undefined,
        {},
        [],
        Symbol("num"),
        10n,
      ];

      for (const input of nonNumbers) {
        const safe = baseSchema.safeParse(input);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.issues[0];
          expect(issue?.code).toBe("invalid_type");
          if (issue?.code === "invalid_type") {
            expect(issue.expected).toBe("number");
            expect(issue.received).toBe(typeof input);
            expect(issue.message).toBe(`Expected number, received ${typeof input}`);
          }
        }
      }
    });
  });

  describe("Boundaries & Comparisons (min, gte, max, lte, gt, lt)", () => {
    describe("min() & gte()", () => {
      it("validates minimum boundary (inclusive) with default error message", () => {
        const schema = baseSchema.min(10);
        expect(schema.parse(10)).toBe(10);
        expect(schema.parse(15)).toBe(15);

        const safe = schema.safeParse(9.99);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.issues[0];
          expect(issue?.code).toBe("too_small");
          if (issue?.code === "too_small") {
            expect(issue.minimum).toBe(10);
            expect(issue.inclusive).toBe(true);
            expect(issue.origin).toBe("number");
            expect(issue.message).toBe(
              "Number must be greater than or equal to 10"
            );
          }
        }
      });

      it("gte() delegates to min and accepts custom messages", () => {
        const schema = baseSchema.gte(10, "Custom min failure");
        expect(schema.parse(10)).toBe(10);

        const safe = schema.safeParse(8);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Custom min failure");
        }
      });

      it("handles raw 'gte' check kind in _parse", () => {
        const rawGteCheck: NumberCheck = {
          kind: "gte",
          validate: (v) => v >= 20,
          message: "Must be >= 20",
          metadata: { min: 20 },
        };
        const schema = new NumberSchema([rawGteCheck]);
        const safe = schema.safeParse(15);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.issues[0];
          expect(issue?.code).toBe("too_small");
          if (issue?.code === "too_small") {
            expect(issue.inclusive).toBe(true);
            expect(issue.minimum).toBe(20);
          }
        }
      });
    });

    describe("max() & lte()", () => {
      it("validates maximum boundary (inclusive) with default error message", () => {
        const schema = baseSchema.max(100);
        expect(schema.parse(100)).toBe(100);
        expect(schema.parse(50)).toBe(50);

        const safe = schema.safeParse(100.01);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.issues[0];
          expect(issue?.code).toBe("too_big");
          if (issue?.code === "too_big") {
            expect(issue.maximum).toBe(100);
            expect(issue.inclusive).toBe(true);
            expect(issue.origin).toBe("number");
            expect(issue.message).toBe("Number must be less than or equal to 100");
          }
        }
      });

      it("lte() delegates to max and accepts custom messages", () => {
        const schema = baseSchema.lte(50, "Custom max failure");
        expect(schema.parse(50)).toBe(50);

        const safe = schema.safeParse(51);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Custom max failure");
        }
      });

      it("handles raw 'lte' check kind in _parse", () => {
        const rawLteCheck: NumberCheck = {
          kind: "lte",
          validate: (v) => v <= 5,
          message: "Must be <= 5",
          metadata: { max: 5 },
        };
        const schema = new NumberSchema([rawLteCheck]);
        const safe = schema.safeParse(6);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.issues[0];
          expect(issue?.code).toBe("too_big");
          if (issue?.code === "too_big") {
            expect(issue.inclusive).toBe(true);
            expect(issue.maximum).toBe(5);
          }
        }
      });
    });

    describe("gt()", () => {
      it("validates strictly greater than (exclusive) with default error message", () => {
        const schema = baseSchema.gt(0);
        expect(schema.parse(0.001)).toBe(0.001);
        expect(schema.parse(10)).toBe(10);

        const safeEqual = schema.safeParse(0);
        expect(safeEqual.success).toBe(false);
        if (!safeEqual.success) {
          const issue = safeEqual.issues[0];
          expect(issue?.code).toBe("too_small");
          if (issue?.code === "too_small") {
            expect(issue.minimum).toBe(0);
            expect(issue.inclusive).toBe(false);
            expect(issue.message).toBe("Number must be strictly greater than 0");
          }
        }
      });

      it("supports custom error message for gt()", () => {
        const schema = baseSchema.gt(10, "Strictly greater than 10 required");
        const safe = schema.safeParse(10);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe(
            "Strictly greater than 10 required"
          );
        }
      });
    });

    describe("lt()", () => {
      it("validates strictly less than (exclusive) with default error message", () => {
        const schema = baseSchema.lt(10);
        expect(schema.parse(9.99)).toBe(9.99);
        expect(schema.parse(-5)).toBe(-5);

        const safeEqual = schema.safeParse(10);
        expect(safeEqual.success).toBe(false);
        if (!safeEqual.success) {
          const issue = safeEqual.issues[0];
          expect(issue?.code).toBe("too_big");
          if (issue?.code === "too_big") {
            expect(issue.maximum).toBe(10);
            expect(issue.inclusive).toBe(false);
            expect(issue.message).toBe("Number must be strictly less than 10");
          }
        }
      });

      it("supports custom error message for lt()", () => {
        const schema = baseSchema.lt(0, "Strictly negative required");
        const safe = schema.safeParse(0);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Strictly negative required");
        }
      });
    });
  });

  describe("Integer, Safe Integer & Finite Validation", () => {
    describe("int()", () => {
      it("validates integers and rejects floating point values", () => {
        const schema = baseSchema.int();
        expect(schema.parse(10)).toBe(10);
        expect(schema.parse(-5)).toBe(-5);
        expect(schema.parse(0)).toBe(0);

        const safeFloat = schema.safeParse(10.5);
        expect(safeFloat.success).toBe(false);
        if (!safeFloat.success) {
          const issue = safeFloat.issues[0];
          expect(issue?.code).toBe("invalid_value");
          if (issue?.code === "invalid_value") {
            expect(issue.received).toBe(10.5);
            expect(issue.message).toBe("Expected integer");
          }
        }
      });

      it("supports custom error message for int()", () => {
        const schema = baseSchema.int("Must be whole number");
        const safe = schema.safeParse(1.1);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Must be whole number");
        }
      });
    });

    describe("safe()", () => {
      it("validates safe IEEE-754 integers", () => {
        const schema = baseSchema.safe();
        expect(schema.parse(Number.MAX_SAFE_INTEGER)).toBe(
          Number.MAX_SAFE_INTEGER
        );
        expect(schema.parse(Number.MIN_SAFE_INTEGER)).toBe(
          Number.MIN_SAFE_INTEGER
        );
        expect(schema.parse(1000)).toBe(1000);

        const unsafeVal = Number.MAX_SAFE_INTEGER + 10;
        const safeUnsafe = schema.safeParse(unsafeVal);
        expect(safeUnsafe.success).toBe(false);
        if (!safeUnsafe.success) {
          expect(safeUnsafe.issues[0]?.message).toBe(
            "Number exceeds IEEE-754 safe integer limits"
          );
        }
      });

      it("supports custom error message for safe()", () => {
        const schema = baseSchema.safe("Outside safe range");
        const safe = schema.safeParse(Math.pow(2, 53));
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Outside safe range");
        }
      });
    });

    describe("finite()", () => {
      it("validates finite numbers and rejects Infinity and -Infinity", () => {
        const schema = baseSchema.finite();
        expect(schema.parse(100000)).toBe(100000);
        expect(schema.parse(-100000)).toBe(-100000);

        const safePosInf = schema.safeParse(Number.POSITIVE_INFINITY);
        expect(safePosInf.success).toBe(false);
        if (!safePosInf.success) {
          expect(safePosInf.issues[0]?.message).toBe("Expected finite number");
        }

        const safeNegInf = schema.safeParse(Number.NEGATIVE_INFINITY);
        expect(safeNegInf.success).toBe(false);
        if (!safeNegInf.success) {
          expect(safeNegInf.issues[0]?.message).toBe("Expected finite number");
        }
      });

      it("supports custom error message for finite()", () => {
        const schema = baseSchema.finite("Infinity forbidden");
        const safe = schema.safeParse(Infinity);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Infinity forbidden");
        }
      });
    });
  });

  describe("Sign Convenience Methods (positive, nonnegative, negative, nonpositive)", () => {
    it("positive() validates > 0 with default and custom messages", () => {
      const schema = baseSchema.positive();
      expect(schema.parse(1)).toBe(1);

      const safeZero = schema.safeParse(0);
      expect(safeZero.success).toBe(false);
      if (!safeZero.success) {
        expect(safeZero.issues[0]?.message).toBe(
          "Number must be positive (> 0)"
        );
      }

      const customSchema = baseSchema.positive("Must be strictly positive");
      const safeNeg = customSchema.safeParse(-1);
      expect(safeNeg.success).toBe(false);
      if (!safeNeg.success) {
        expect(safeNeg.issues[0]?.message).toBe("Must be strictly positive");
      }
    });

    it("nonnegative() validates >= 0 with default and custom messages", () => {
      const schema = baseSchema.nonnegative();
      expect(schema.parse(0)).toBe(0);
      expect(schema.parse(5)).toBe(5);

      const safeNeg = schema.safeParse(-0.01);
      expect(safeNeg.success).toBe(false);
      if (!safeNeg.success) {
        expect(safeNeg.issues[0]?.message).toBe(
          "Number must be non-negative (>= 0)"
        );
      }

      const customSchema = baseSchema.nonnegative("No negatives allowed");
      const safeCustom = customSchema.safeParse(-1);
      expect(safeCustom.success).toBe(false);
      if (!safeCustom.success) {
        expect(safeCustom.issues[0]?.message).toBe("No negatives allowed");
      }
    });

    it("negative() validates < 0 with default and custom messages", () => {
      const schema = baseSchema.negative();
      expect(schema.parse(-1)).toBe(-1);
      expect(schema.parse(-0.001)).toBe(-0.001);

      const safeZero = schema.safeParse(0);
      expect(safeZero.success).toBe(false);
      if (!safeZero.success) {
        expect(safeZero.issues[0]?.message).toBe(
          "Number must be negative (< 0)"
        );
      }

      const customSchema = baseSchema.negative("Must be strictly negative");
      const safePos = customSchema.safeParse(5);
      expect(safePos.success).toBe(false);
      if (!safePos.success) {
        expect(safePos.issues[0]?.message).toBe("Must be strictly negative");
      }
    });

    it("nonpositive() validates <= 0 with default and custom messages", () => {
      const schema = baseSchema.nonpositive();
      expect(schema.parse(0)).toBe(0);
      expect(schema.parse(-10)).toBe(-10);

      const safePos = schema.safeParse(0.001);
      expect(safePos.success).toBe(false);
      if (!safePos.success) {
        expect(safePos.issues[0]?.message).toBe(
          "Number must be non-positive (<= 0)"
        );
      }

      const customSchema = baseSchema.nonpositive("No positives allowed");
      const safeCustom = customSchema.safeParse(1);
      expect(safeCustom.success).toBe(false);
      if (!safeCustom.success) {
        expect(safeCustom.issues[0]?.message).toBe("No positives allowed");
      }
    });
  });

  describe("multipleOf() & floatSafeRemainder", () => {
    it("validates integer multiples with integer steps", () => {
      const schema = baseSchema.multipleOf(5);
      expect(schema.parse(0)).toBe(0);
      expect(schema.parse(15)).toBe(15);
      expect(schema.parse(-25)).toBe(-25);

      const safe = schema.safeParse(14);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        const issue = safe.issues[0];
        expect(issue?.code).toBe("invalid_value");
        if (issue?.code === "invalid_value") {
          expect(issue.received).toBe(14);
          expect(issue.message).toBe("Number must be a multiple of 5");
        }
      }
    });

    it("accurately handles floating point remainders without precision errors", () => {
      const floatSchema = baseSchema.multipleOf(0.1);
      expect(floatSchema.parse(0.3)).toBe(0.3);
      expect(floatSchema.parse(1.5)).toBe(1.5);

      const stepDecHigherSchema = baseSchema.multipleOf(0.05);
      expect(stepDecHigherSchema.parse(0.15)).toBe(0.15);

      const valDecHigherSchema = baseSchema.multipleOf(2);
      expect(valDecHigherSchema.parse(4)).toBe(4);

      const safeFloat = floatSchema.safeParse(0.35);
      expect(safeFloat.success).toBe(false);
      if (!safeFloat.success) {
        expect(safeFloat.issues[0]?.message).toBe(
          "Number must be a multiple of 0.1"
        );
      }
    });

    it("supports custom error message for multipleOf()", () => {
      const schema = baseSchema.multipleOf(3, "Must be divisible by three");
      const safe = schema.safeParse(10);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.message).toBe("Must be divisible by three");
      }
    });
  });

  describe("Direct Check Branches & Fallbacks", () => {
    it("handles checks without explicit metadata limits defined", () => {
      const customBoundSchema = new NumberSchema([
        { kind: "min", validate: () => false, message: "Limitless min failure" },
        { kind: "max", validate: () => false, message: "Limitless max failure" },
        { kind: "custom", validate: () => false, message: "Arbitrary check failure" },
      ]);

      const safe = customBoundSchema.safeParse(50);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues).toHaveLength(3);

        const issue0 = safe.issues[0];
        const issue1 = safe.issues[1];
        const issue2 = safe.issues[2];

        expect(issue0?.code).toBe("too_small");
        if (issue0?.code === "too_small") {
          expect(issue0.minimum).toBeUndefined();
        }

        expect(issue1?.code).toBe("too_big");
        if (issue1?.code === "too_big") {
          expect(issue1.maximum).toBeUndefined();
        }

        expect(issue2?.code).toBe("invalid_value");
        if (issue2?.code === "invalid_value") {
          expect(issue2.received).toBe(50);
          expect(issue2.message).toBe("Arbitrary check failure");
        }
      }
    });
  });

  describe("Compound & Chained Validations", () => {
    it("accumulates all violated constraints into parse errors", () => {
      const schema = baseSchema
        .min(10)
        .max(50)
        .int()
        .multipleOf(5);

      const safe = schema.safeParse(7.5);
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues).toHaveLength(3);
        expect(safe.issues[0]?.code).toBe("too_small");
        expect(safe.issues[1]?.code).toBe("invalid_value");
        expect(safe.issues[2]?.code).toBe("invalid_value");
      }
    });

    it("parses valid numbers satisfying all chained constraints", () => {
      const schema = baseSchema
        .gte(10)
        .lte(100)
        .int()
        .multipleOf(10);

      expect(schema.parse(10)).toBe(10);
      expect(schema.parse(50)).toBe(50);
      expect(schema.parse(100)).toBe(100);
    });
  });
});
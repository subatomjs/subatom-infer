// src/schemas/primitives/number.ts
import { Schema } from "../../core/schema.js";
import { addIssue, type ParseContext } from "../../core/context.js";
import { makeFailure, makeSuccess, type DynamicParseReturnType } from "../../core/result.js";

export interface NumberCheck {
  kind: string;
  validate: (val: number) => boolean;
  message: string;
  metadata?: Record<string, unknown>;
}

function floatSafeRemainder(val: number, step: number): number {
  const valDec = (val.toString().split(".")[1] || "").length;
  const stepDec = (step.toString().split(".")[1] || "").length;
  const precision = Math.pow(10, Math.max(valDec, stepDec));
  return (Math.round(val * precision) % Math.round(step * precision)) / precision;
}

export class NumberSchema extends Schema<number, number> {
  readonly checks: readonly NumberCheck[];

  constructor(checks: readonly NumberCheck[] = []) {
    super();
    this.checks = Object.freeze([...checks]);
  }

  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<number> {
    if (typeof input !== "number" || Number.isNaN(input)) {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "number",
        received: Number.isNaN(input) ? "NaN" : typeof input,
        message: `Expected number, received ${Number.isNaN(input) ? "NaN" : typeof input}`,
      });
      return makeFailure(ctx.issues);
    }

    for (const check of this.checks) {
      if (!check.validate(input)) {
        if (check.kind === "min" || check.kind === "gte" || check.kind === "gt") {
          addIssue(ctx, {
            code: "too_small",
            minimum: check.metadata?.["min"] as number,
            inclusive: check.kind !== "gt",
            origin: "number",
            message: check.message,
          });
        } else if (check.kind === "max" || check.kind === "lte" || check.kind === "lt") {
          addIssue(ctx, {
            code: "too_big",
            maximum: check.metadata?.["max"] as number,
            inclusive: check.kind !== "lt",
            origin: "number",
            message: check.message,
          });
        } else {
          addIssue(ctx, { code: "invalid_value", received: input, message: check.message });
        }
      }
    }
    if (ctx.issues.length > 0) return makeFailure(ctx.issues);
    return makeSuccess(input);
  }

  private addCheck(c: NumberCheck) {
    return new NumberSchema([...this.checks, c]);
  }

  min(min: number, msg?: string) {
    return this.addCheck({ kind: "min", validate: (v) => v >= min, message: msg ?? `Must be >= ${min}`, metadata: { min } });
  }

  gte(min: number, msg?: string) { return this.min(min, msg); }

  max(max: number, msg?: string) {
    return this.addCheck({ kind: "max", validate: (v) => v <= max, message: msg ?? `Must be <= ${max}`, metadata: { max } });
  }

  lte(max: number, msg?: string) { return this.max(max, msg); }

  gt(val: number, msg?: string) {
    return this.addCheck({ kind: "gt", validate: (v) => v > val, message: msg ?? `Must be > ${val}`, metadata: { min: val } });
  }

  lt(val: number, msg?: string) {
    return this.addCheck({ kind: "lt", validate: (v) => v < val, message: msg ?? `Must be < ${val}`, metadata: { max: val } });
  }

  int(msg = "Expected integer") {
    return this.addCheck({ kind: "int", validate: (v) => Number.isInteger(v), message: msg });
  }

  safe(msg = "Number exceeds IEEE-754 safe integer limits") {
    return this.addCheck({ kind: "safe", validate: (v) => Number.isSafeInteger(v), message: msg });
  }

  finite(msg = "Expected finite number") {
    return this.addCheck({ kind: "finite", validate: (v) => Number.isFinite(v), message: msg });
  }

  positive(msg = "Must be positive (> 0)") { return this.gt(0, msg); }
  nonnegative(msg = "Must be non-negative (>= 0)") { return this.gte(0, msg); }
  negative(msg = "Must be negative (< 0)") { return this.lt(0, msg); }
  nonpositive(msg = "Must be non-positive (<= 0)") { return this.lte(0, msg); }

  multipleOf(step: number, msg?: string) {
    return this.addCheck({
      kind: "multipleOf",
      validate: (v) => floatSafeRemainder(v, step) === 0,
      message: msg ?? `Must be a multiple of ${step}`,
    });
  }
}
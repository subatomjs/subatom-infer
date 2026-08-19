// src/schemas/primitives/bigint.ts
import { Schema } from "../../core/schema.js";
import { addIssue, type ParseContext } from "../../core/context.js";
import { makeFailure, makeSuccess, type DynamicParseReturnType } from "../../core/result.js";

export class BigIntSchema extends Schema<bigint, bigint> {
  constructor(readonly checks: readonly ((val: bigint, ctx: ParseContext) => void)[] = []) {
    super();
  }

  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<bigint> {
    if (typeof input !== "bigint") {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "bigint",
        received: typeof input,
        message: `Expected bigint, received ${typeof input}`,
      });
      return makeFailure(ctx.issues);
    }
    for (const check of this.checks) check(input, ctx);
    if (ctx.issues.length > 0) return makeFailure(ctx.issues);
    return makeSuccess(input);
  }

  min(min: bigint, msg?: string) {
    return new BigIntSchema([
      ...this.checks,
      (v, ctx) => {
        if (v < min) addIssue(ctx, { code: "too_small", minimum: min, inclusive: true, origin: "bigint", message: msg ?? `Must be >= ${min}n` });
      },
    ]);
  }

  max(max: bigint, msg?: string) {
    return new BigIntSchema([
      ...this.checks,
      (v, ctx) => {
        if (v > max) addIssue(ctx, { code: "too_big", maximum: max, inclusive: true, origin: "bigint", message: msg ?? `Must be <= ${max}n` });
      },
    ]);
  }

  positive(msg = "Must be positive") { return this.min(1n, msg); }
  nonnegative(msg = "Must be non-negative") { return this.min(0n, msg); }
  negative(msg = "Must be negative") { return this.max(-1n, msg); }
  nonpositive(msg = "Must be non-positive") { return this.max(0n, msg); }

  multipleOf(step: bigint, msg?: string) {
    return new BigIntSchema([
      ...this.checks,
      (v, ctx) => {
        if (v % step !== 0n) addIssue(ctx, { code: "invalid_value", received: v, message: msg ?? `Must be multiple of ${step}n` });
      },
    ]);
  }
}
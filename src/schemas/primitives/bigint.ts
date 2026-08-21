/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */

import { Schema } from "../../core/schema.js";
import { addIssue, type ParseContext } from "../../core/context.js";
import {
  makeFailure,
  makeSuccess,
  type DynamicParseReturnType,
} from "../../core/result.js";

export interface BigIntCheck {
  kind: string;
  validate: (val: bigint) => boolean;
  message: string;
  limit?: bigint;
}

export class BigIntSchema extends Schema<bigint, bigint> {
  readonly checks: readonly BigIntCheck[];

  constructor(checks: readonly BigIntCheck[] = []) {
    super();
    this.checks = Object.freeze([...checks]);
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

    for (const check of this.checks) {
      if (!check.validate(input)) {
        if (
          check.kind === "min" ||
          check.kind === "gte" ||
          check.kind === "gt"
        ) {
          addIssue(ctx, {
            code: "too_small",
            ...(check.limit !== undefined ? { minimum: check.limit } : {}),
            inclusive: check.kind !== "gt",
            origin: "bigint",
            message: check.message,
          });
        } else if (
          check.kind === "max" ||
          check.kind === "lte" ||
          check.kind === "lt"
        ) {
          addIssue(ctx, {
            code: "too_big",
            ...(check.limit !== undefined ? { maximum: check.limit } : {}),
            inclusive: check.kind !== "lt",
            origin: "bigint",
            message: check.message,
          });
        } else {
          addIssue(ctx, {
            code: "invalid_value",
            received: input,
            message: check.message,
          });
        }
      }
    }

    if (ctx.issues.length > 0) return makeFailure(ctx.issues);
    return makeSuccess(input);
  }

  private addCheck(check: BigIntCheck): BigIntSchema {
    return new BigIntSchema([...this.checks, check]);
  }

  min(min: bigint, msg?: string): BigIntSchema {
    return this.addCheck({
      kind: "min",
      validate: (v) => v >= min,
      message: msg ?? `Must be greater than or equal to ${min}n`,
      limit: min,
    });
  }

  gte(min: bigint, msg?: string): BigIntSchema {
    return this.min(min, msg);
  }

  max(max: bigint, msg?: string): BigIntSchema {
    return this.addCheck({
      kind: "max",
      validate: (v) => v <= max,
      message: msg ?? `Must be less than or equal to ${max}n`,
      limit: max,
    });
  }

  lte(max: bigint, msg?: string): BigIntSchema {
    return this.max(max, msg);
  }

  gt(val: bigint, msg?: string): BigIntSchema {
    return this.addCheck({
      kind: "gt",
      validate: (v) => v > val,
      message: msg ?? `Must be strictly greater than ${val}n`,
      limit: val,
    });
  }

  lt(val: bigint, msg?: string): BigIntSchema {
    return this.addCheck({
      kind: "lt",
      validate: (v) => v < val,
      message: msg ?? `Must be strictly less than ${val}n`,
      limit: val,
    });
  }

  positive(msg = "Must be positive"): BigIntSchema {
    return this.gt(0n, msg);
  }

  nonnegative(msg = "Must be non-negative"): BigIntSchema {
    return this.gte(0n, msg);
  }

  negative(msg = "Must be negative"): BigIntSchema {
    return this.lt(0n, msg);
  }

  nonpositive(msg = "Must be non-positive"): BigIntSchema {
    return this.lte(0n, msg);
  }

  multipleOf(step: bigint, msg?: string): BigIntSchema {
    return this.addCheck({
      kind: "multipleOf",
      validate: (v) => v % step === 0n,
      message: msg ?? `Must be a multiple of ${step}n`,
    });
  }
}

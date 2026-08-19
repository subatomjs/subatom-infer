// src/schemas/primitives/primitives.ts
import { Schema } from "../../core/schema.js";
import { addIssue, type ParseContext } from "../../core/context.js";
import { type DynamicParseReturnType, makeFailure, makeSuccess } from "../../core/result.js";

export class BooleanSchema extends Schema<boolean, boolean> {
  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<boolean> {
    if (typeof input !== "boolean") {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "boolean",
        received: typeof input,
        message: `Expected boolean, received ${typeof input}`,
      });
      return makeFailure(ctx.issues);
    }
    return makeSuccess(input);
  }
}

export { BigIntSchema } from "./bigint.js";

export class DateSchema extends Schema<Date, Date> {
  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<Date> {
    if (!(input instanceof Date) || Number.isNaN(input.getTime())) {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "Date",
        received: input instanceof Date ? "Invalid Date" : typeof input,
        message: "Expected valid Date instance",
      });
      return makeFailure(ctx.issues);
    }
    return makeSuccess(new Date(input.getTime()));
  }

  min(minDate: Date, message?: string): Schema<Date, Date> {
    return this.refine(
      (val) => val.getTime() >= minDate.getTime(),
      message ?? `Date must be greater than or equal to ${minDate.toISOString()}`
    );
  }

  max(maxDate: Date, message?: string): Schema<Date, Date> {
    return this.refine(
      (val) => val.getTime() <= maxDate.getTime(),
      message ?? `Date must be less than or equal to ${maxDate.toISOString()}`
    );
  }
}

export type LiteralValue = string | number | boolean | bigint | symbol | null | undefined;

export class LiteralSchema<T extends LiteralValue> extends Schema<T, T> {
  constructor(readonly value: T) {
    super();
  }

  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<T> {
    if (input !== this.value) {
      addIssue(ctx, {
        code: "invalid_value",
        expected: this.value,
        received: input,
        message: `Expected literal ${String(this.value)}, received ${String(input)}`,
      });
      return makeFailure(ctx.issues);
    }
    return makeSuccess(input as T);
  }
}

export class NullSchema extends Schema<null, null> {
  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<null> {
    if (input !== null) {
      addIssue(ctx, { code: "invalid_type", expected: "null", received: typeof input, message: "Expected null" });
      return makeFailure(ctx.issues);
    }
    return makeSuccess(null);
  }
}

export class UndefinedSchema extends Schema<undefined, undefined> {
  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<undefined> {
    if (input !== undefined) {
      addIssue(ctx, { code: "invalid_type", expected: "undefined", received: typeof input, message: "Expected undefined" });
      return makeFailure(ctx.issues);
    }
    return makeSuccess(undefined);
  }
}

export class AnySchema extends Schema<unknown, unknown> {
  _parse(input: unknown): DynamicParseReturnType<unknown> {
    return makeSuccess(input);
  }
}

export class UnknownSchema extends Schema<unknown, unknown> {
  _parse(input: unknown): DynamicParseReturnType<unknown> {
    return makeSuccess(input);
  }
}

export class NeverSchema extends Schema<never, never> {
  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<never> {
    addIssue(ctx, { code: "invalid_type", expected: "never", received: typeof input, message: "Expected never" });
    return makeFailure(ctx.issues);
  }
}

export class SymbolSchema extends Schema<symbol, symbol> {
  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<symbol> {
    if (typeof input !== "symbol") {
      addIssue(ctx, { code: "invalid_type", expected: "symbol", received: typeof input, message: "Expected symbol" });
      return makeFailure(ctx.issues);
    }
    return makeSuccess(input);
  }
}

export class NaNSchema extends Schema<number, number> {
  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<number> {
    if (typeof input !== "number" || !Number.isNaN(input)) {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "NaN",
        received: typeof input === "number" ? String(input) : typeof input,
        message: "Expected NaN",
      });
      return makeFailure(ctx.issues);
    }
    return makeSuccess(Number.NaN);
  }
}
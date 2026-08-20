import { addIssue, type ParseContext } from "../../core/context.js";
import { type DynamicParseReturnType, makeFailure } from "../../core/result.js";
import { StringSchema } from "./string.js";
import { NumberSchema} from "./number.js";
import { BigIntSchema } from "./bigint.js";
import { DateSchema } from "./advanced-primitives.js";
import { BooleanSchema } from "./advanced-primitives.js";

export class CoercedStringSchema extends StringSchema {
  override _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<string> {
    let coerced: string;
    if (input === null || input === undefined) {
      coerced = String(input);
    } else if (typeof input === "object") {
      try {
        coerced = JSON.stringify(input);
      } catch {
        coerced = String(input);
      }
    } else {
      coerced = String(input);
    }
    return super._parse(coerced, ctx);
  }
}

export class CoercedNumberSchema extends NumberSchema {
  override _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<number> {
    let num = Number.NaN;
    try {
      num = Number(input);
    } catch {
      // Ignored
    }

    if (Number.isNaN(num)) {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "number",
        received: String(input),
        message: `Could not coerce "${String(input)}" to number`,
      });
      return makeFailure(ctx.issues);
    }
    return super._parse(num, ctx);
  }
}

export class CoercedBooleanSchema extends BooleanSchema {
  override _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<boolean> {
    if (typeof input === "string") {
      const lower = input.trim().toLowerCase();
      if (lower === "false" || lower === "0" || lower === "off") {
        return super._parse(false, ctx);
      }
    }
    return super._parse(Boolean(input), ctx);
  }
}

export class CoercedBigIntSchema extends BigIntSchema {
  override _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<bigint> {
    try {
      if (
        typeof input === "string" ||
        typeof input === "number" ||
        typeof input === "boolean" ||
        typeof input === "bigint"
      ) {
        return super._parse(BigInt(input), ctx);
      }
      throw new Error();
    } catch {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "bigint",
        received: String(input),
        message: `Could not coerce "${String(input)}" to bigint`,
      });
      return makeFailure(ctx.issues);
    }
  }
}

export class CoercedDateSchema extends DateSchema {
  override _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<Date> {
    if (input === null || typeof input === "boolean") {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "Date",
        received: String(input),
        message: `Could not coerce "${String(input)}" to Date`,
      });
      return makeFailure(ctx.issues);
    }

    const d = new Date(input as string | number | Date);
    if (Number.isNaN(d.getTime())) {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "Date",
        received: String(input),
        message: `Could not coerce "${String(input)}" to Date`,
      });
      return makeFailure(ctx.issues);
    }
    return super._parse(d, ctx);
  }
}

export const coerce = {
  string: (): CoercedStringSchema => new CoercedStringSchema(),
  number: (): CoercedNumberSchema => new CoercedNumberSchema(),
  boolean: (): CoercedBooleanSchema => new CoercedBooleanSchema(),
  bigint: (): CoercedBigIntSchema => new CoercedBigIntSchema(),
  date: (): CoercedDateSchema => new CoercedDateSchema(),
} as const;
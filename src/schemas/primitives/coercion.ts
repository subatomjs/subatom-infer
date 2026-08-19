// src/schemas/primitives/coerce.ts
import { Schema } from "../../core/schema.js";
import { addIssue, type ParseContext } from "../../core/context.js";
import {
  type DynamicParseReturnType,
  makeFailure,
  makeSuccess,
} from "../../core/result.js";

export const coerce = {
  string: () =>
    new (class extends Schema<string, unknown> {
      _parse(input: unknown): DynamicParseReturnType<string> {
        if (input === null || input === undefined)
          return makeSuccess(String(input));
        if (typeof input === "object") {
          try {
            return makeSuccess(JSON.stringify(input));
          } catch {
            return makeSuccess(String(input));
          }
        }
        return makeSuccess(String(input));
      }
    })(),
  number: () =>
    new (class extends Schema<number, unknown> {
      _parse(
        input: unknown,
        ctx: ParseContext,
      ): DynamicParseReturnType<number> {
        let num = Number.NaN;
        try {
          num = Number(input);
        } catch {
          // Handles cases like Symbol where Number() throws TypeError
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
        return makeSuccess(num);
      }
    })(),

  boolean: () =>
    new (class extends Schema<boolean, unknown> {
      _parse(input: unknown): DynamicParseReturnType<boolean> {
        if (typeof input === "string") {
          const lower = input.trim().toLowerCase();
          if (lower === "false" || lower === "0" || lower === "off")
            return makeSuccess(false);
        }
        return makeSuccess(Boolean(input));
      }
    })(),

  bigint: () =>
    new (class extends Schema<bigint, unknown> {
      _parse(
        input: unknown,
        ctx: ParseContext,
      ): DynamicParseReturnType<bigint> {
        try {
          if (
            typeof input === "string" ||
            typeof input === "number" ||
            typeof input === "boolean" ||
            typeof input === "bigint"
          ) {
            return makeSuccess(BigInt(input));
          }
          throw new Error("Invalid input");
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
    })(),

  date: () =>
    new (class extends Schema<Date, unknown> {
      _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<Date> {
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
        return makeSuccess(d);
      }
    })(),
};

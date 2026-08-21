/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */

import { Schema } from "../../core/schema.js";
import {
  addIssue,
  createParseContext,
  type ParseContext,
} from "../../core/context.js";
import {
  makeFailure,
  makeSuccess,
  isPromise,
  type ParseResult,
  type DynamicParseReturnType,
} from "../../core/result.js";
import { ValidationError } from "../../core/error.js";
import type { ObjectSchema, RawShape } from "./object.js";
import type { LiteralSchema, LiteralValue } from "../primitives/advanced-primitives.js";

// --- Union Schema ---
export type UnionOptions = readonly [
  Schema<unknown, unknown>,
  ...Schema<unknown, unknown>[]
];

export class UnionSchema<TOptions extends UnionOptions> extends Schema<
  TOptions[number]["_output"],
  TOptions[number]["_input"]
> {
  constructor(readonly options: TOptions) {
    super();
  }

  _parse(
    input: unknown,
    ctx: ParseContext
  ): DynamicParseReturnType<TOptions[number]["_output"]> {
    const syncErrors: ValidationError[] = [];
    const asyncChecks: Promise<ParseResult<unknown>>[] = [];

    for (const option of this.options) {
      const branchCtx = createParseContext(ctx.async, ctx.path);
      let res: DynamicParseReturnType<unknown>;

      try {
        res = option._parse(input, branchCtx);
      } catch (err: unknown) {
        if (
          !ctx.async &&
          err instanceof Error &&
          err.message.includes("Synchronous parse")
        ) {
          throw new Error("Synchronous parse encountered async union variant.");
        }
        throw err;
      }

      if (isPromise(res)) {
        asyncChecks.push(res);
      } else if (res.success) {
        return makeSuccess(res.data as TOptions[number]["_output"]);
      } else {
        syncErrors.push(new ValidationError(branchCtx.issues));
      }
    }

    if (asyncChecks.length > 0) {
      if (!ctx.async) {
        throw new Error("Synchronous parse encountered async union variant.");
      }
      return Promise.all(asyncChecks).then((results) => {
        for (const res of results) {
          if (res.success) return makeSuccess(res.data as TOptions[number]["_output"]);
        }
        addIssue(ctx, {
          code: "invalid_union",
          unionErrors: syncErrors,
          message: "Input did not match any union branch",
        });
        return makeFailure(ctx.issues);
      });
    }

    addIssue(ctx, {
      code: "invalid_union",
      unionErrors: syncErrors,
      message: "Input did not match any union branch",
    });
    return makeFailure(ctx.issues);
  }
}

// --- Discriminated Union Schema ---
export class DiscriminatedUnionSchema<
  TDiscriminator extends string,
  TOptions extends readonly ObjectSchema<RawShape>[]
> extends Schema<TOptions[number]["_output"], TOptions[number]["_input"]> {
  private readonly optionMap = new Map<unknown, ObjectSchema<RawShape>>();

  constructor(
    readonly discriminator: TDiscriminator,
    readonly options: TOptions
  ) {
    super();
    for (const opt of options) {
      const field = opt.shape[discriminator];
      if (!field || !("value" in field)) {
        throw new Error(
          `Every discriminated union member must specify a LiteralSchema on "${discriminator}"`
        );
      }
      this.optionMap.set((field as LiteralSchema<LiteralValue>).value, opt);
    }
  }

  _parse(
    input: unknown,
    ctx: ParseContext
  ): DynamicParseReturnType<TOptions[number]["_output"]> {
    if (typeof input !== "object" || input === null) {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "object",
        received: input === null ? "null" : typeof input,
        message: "Expected object for discriminated union",
      });
      return makeFailure(ctx.issues);
    }

    const discValue = (input as Record<string, unknown>)[this.discriminator];
    const targetSchema = this.optionMap.get(discValue);

    if (!targetSchema) {
      addIssue(ctx, {
        code: "invalid_value",
        received: discValue,
        message: `No matching branch for discriminator ${this.discriminator}="${String(discValue)}"`,
      });
      return makeFailure(ctx.issues);
    }

    return targetSchema._parse(input, ctx) as DynamicParseReturnType<
      TOptions[number]["_output"]
    >;
  }
}

// --- Intersection Schema ---
export class IntersectionSchema<
  TLeft extends Schema<unknown, unknown>,
  TRight extends Schema<unknown, unknown>
> extends Schema<
  TLeft["_output"] & TRight["_output"],
  TLeft["_input"] & TRight["_input"]
> {
  constructor(
    readonly left: TLeft,
    readonly right: TRight
  ) {
    super();
  }

  _parse(
    input: unknown,
    ctx: ParseContext
  ): DynamicParseReturnType<TLeft["_output"] & TRight["_output"]> {
    if (!ctx.async) {
      let leftRes: DynamicParseReturnType<unknown>;
      let rightRes: DynamicParseReturnType<unknown>;

      try {
        leftRes = this.left._parse(input, ctx);
        rightRes = this.right._parse(input, ctx);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes("Synchronous parse")) {
          throw new Error(
            "Synchronous parse encountered async intersection branches."
          );
        }
        throw err;
      }

      if (isPromise(leftRes) || isPromise(rightRes)) {
        throw new Error(
          "Synchronous parse encountered async intersection branches."
        );
      }

      if (!leftRes.success || !rightRes.success) {
        return makeFailure(ctx.issues);
      }

      return makeSuccess(
        this.mergeDeep(leftRes.data, rightRes.data) as TLeft["_output"] &
          TRight["_output"]
      );
    }

    const leftCtx = createParseContext(true, ctx.path);
    const rightCtx = createParseContext(true, ctx.path);

    const leftRes = this.left._parse(input, leftCtx);
    const rightRes = this.right._parse(input, rightCtx);

    return Promise.all([
      Promise.resolve(leftRes),
      Promise.resolve(rightRes),
    ]).then(([l, r]) => {
      if (!l.success) ctx.issues.push(...leftCtx.issues);
      if (!r.success) ctx.issues.push(...rightCtx.issues);

      if (!l.success || !r.success) {
        return makeFailure(ctx.issues);
      }

      return makeSuccess(
        this.mergeDeep(l.data, r.data) as TLeft["_output"] & TRight["_output"]
      );
    });
  }

  private mergeDeep(a: unknown, b: unknown): unknown {
    if (
      typeof a === "object" &&
      a !== null &&
      typeof b === "object" &&
      b !== null
    ) {
      return { ...a, ...b };
    }
    return b;
  }
}

// --- Lazy Schema ---
export class LazySchema<TOutput, TInput = TOutput> extends Schema<
  TOutput,
  TInput
> {
  constructor(readonly getter: () => Schema<TOutput, TInput>) {
    super();
  }

  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<TOutput> {
    const schema = this.getter();
    return schema._parse(input, ctx);
  }
}
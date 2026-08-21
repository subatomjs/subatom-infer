/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */

import { Schema, type SchemaReadonly } from "../../core/schema.js";
import { makeSuccess, isPromise, type DynamicParseReturnType } from "../../core/result.js";
import type { ParseContext } from "../../core/context.js";

export class CatchSchema<TOutput, TInput> extends Schema<TOutput, TInput> {
  constructor(
    readonly innerSchema: Schema<TOutput, TInput>,
    readonly catchValue: TOutput | ((ctx: { error: unknown; input: unknown }) => TOutput)
  ) {
    super();
  }

  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<TOutput> {
    const baseIssuesCount = ctx.issues.length;
    const result = this.innerSchema._parse(input, ctx);

    const fallback = (): TOutput => {
      const addedIssues = ctx.issues.slice(baseIssuesCount);
      ctx.issues.length = baseIssuesCount;
      return typeof this.catchValue === "function"
        ? (this.catchValue as (c: { error: unknown; input: unknown }) => TOutput)({
            error: addedIssues,
            input,
          })
        : this.catchValue;
    };

    if (isPromise(result)) {
      return result.then((res) => (res.success ? res : makeSuccess(fallback())));
    }
    if (!result.success) {
      return makeSuccess(fallback());
    }
    return result;
  }
}

export class PreprocessSchema<TOutput, TInput> extends Schema<TOutput, unknown> {
  constructor(
    readonly preprocessor: (input: unknown) => unknown,
    readonly innerSchema: Schema<TOutput, TInput>
  ) {
    super();
  }

  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<TOutput> {
    const processed = this.preprocessor(input);
    return this.innerSchema._parse(processed, ctx);
  }
}

export class PipeSchema<A, B, C> extends Schema<C, A> {
  constructor(readonly first: Schema<B, A>, readonly second: Schema<C, B>) {
    super();
  }

  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<C> {
    const resA = this.first._parse(input, ctx);

    if (isPromise(resA)) {
      return resA.then((res) => {
        if (!res.success) return res;
        return this.second._parse(res.data, ctx);
      });
    }

    if (!resA.success) return resA;
    return this.second._parse(resA.data, ctx);
  }
}

export class ReadonlySchema<TOutput, TInput> extends Schema<
  SchemaReadonly<TOutput>,
  SchemaReadonly<TInput>
> {
  constructor(readonly innerSchema: Schema<TOutput, TInput>) {
    super();
  }

  _parse(
    input: unknown,
    ctx: ParseContext
  ): DynamicParseReturnType<SchemaReadonly<TOutput>> {
    const result = this.innerSchema._parse(input, ctx);
    if (isPromise(result)) {
      return result.then((res) => {
        if (res.success && typeof res.data === "object" && res.data !== null) {
          return makeSuccess(Object.freeze(res.data) as SchemaReadonly<TOutput>);
        }
        return res as DynamicParseReturnType<SchemaReadonly<TOutput>>;
      });
    }
    if (result.success && typeof result.data === "object" && result.data !== null) {
      return makeSuccess(Object.freeze(result.data) as SchemaReadonly<TOutput>);
    }
    return result as DynamicParseReturnType<SchemaReadonly<TOutput>>;
  }
}

export const BrandSymbol: unique symbol = Symbol("subatom.brand");
export type Brand<K, T> = K & { readonly [BrandSymbol]: T };

export class BrandSchema<
  TOutput,
  TInput,
  TBrand extends string | symbol
> extends Schema<Brand<TOutput, TBrand>, TInput> {
  constructor(
    readonly innerSchema: Schema<TOutput, TInput>,
    readonly brandName: TBrand
  ) {
    super();
  }

  _parse(
    input: unknown,
    ctx: ParseContext
  ): DynamicParseReturnType<Brand<TOutput, TBrand>> {
    return this.innerSchema._parse(input, ctx) as DynamicParseReturnType<
      Brand<TOutput, TBrand>
    >;
  }
}

export class Codec<TOutput, TInput = TOutput> extends Schema<TOutput, TInput> {
  constructor(
    readonly decoder: Schema<TOutput, TInput>,
    readonly encoder: (output: TOutput) => TInput
  ) {
    super();
  }

  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<TOutput> {
    return this.decoder._parse(input, ctx);
  }

  encode(output: TOutput): TInput {
    return this.encoder(output);
  }
}
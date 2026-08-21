/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */

import { Schema } from "../../core/schema.js";
import { makeSuccess, type DynamicParseReturnType } from "../../core/result.js";
import type { ParseContext } from "../../core/context.js";

export class DefaultSchema<TOutput, TInput> extends Schema<
  TOutput,
  TInput | undefined
> {
  constructor(
    readonly innerSchema: Schema<TOutput, TInput>,
    readonly defaultValue: TOutput | (() => TOutput)
  ) {
    super();
  }

  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<TOutput> {
    if (input === undefined) {
      const val =
        typeof this.defaultValue === "function"
          ? (this.defaultValue as () => TOutput)()
          : this.defaultValue;
      return makeSuccess(val);
    }
    return this.innerSchema._parse(input, ctx);
  }

  removeDefault(): Schema<TOutput, TInput> {
    return this.innerSchema;
  }
}
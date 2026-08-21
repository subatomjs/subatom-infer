/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */

import { Schema } from "../../core/schema.js";
import { type DynamicParseReturnType } from "../../core/result.js";
import type { ParseContext } from "../../core/context.js";

export class PrefaultSchema<TOutput, TInput> extends Schema<
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
    const val =
      input === undefined
        ? typeof this.defaultValue === "function"
          ? (this.defaultValue as () => TOutput)()
          : this.defaultValue
        : input;
    return this.innerSchema._parse(val, ctx);
  }
}
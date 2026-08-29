/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */

import { Schema } from "../../core/schema.js";
import {
  makeSuccess,
  isPromise,
  type DynamicParseReturnType,
} from "../../core/result.js";
import type { ParseContext } from "../../core/context.js";

export class OptionalSchema<TOutput, TInput> extends Schema<
  TOutput | undefined,
  TInput | undefined
> {
  /**
   * Identifies this schema as an optional schema.
   *
   * This is intentionally a stable public marker so consumers such as
   * OpenAPI generators can detect optional schemas without relying on
   * `instanceof`, which can fail across package boundaries.
   */
  readonly isOptional = true as const;

  /**
   * The underlying schema responsible for validating defined values.
   */
  readonly innerSchema: Schema<TOutput, TInput>;

  constructor(innerSchema: Schema<TOutput, TInput>) {
    super();

    this.innerSchema = innerSchema;
  }

  /**
   * Parses an optional value.
   *
   * `undefined` is accepted without invoking the inner schema.
   * Every other value is delegated to the wrapped schema.
   */
  _parse(
    input: unknown,
    ctx: ParseContext,
  ): DynamicParseReturnType<TOutput | undefined> {
    if (input === undefined) {
      return makeSuccess(undefined);
    }

    const result = this.innerSchema._parse(input, ctx);

    if (isPromise(result)) {
      return result.then((parsed) => {
        if (parsed.success) {
          return makeSuccess(parsed.data);
        }

        return parsed;
      });
    }

    return result;
  }

  /**
   * Returns the underlying non-optional schema.
   */
  unwrap(): Schema<TOutput, TInput> {
    return this.innerSchema;
  }
}
import { Schema } from "../../core/schema.js";
import { makeSuccess, isPromise, type DynamicParseReturnType } from "../../core/result.js";
import type { ParseContext } from "../../core/context.js";

export class NullableSchema<TOutput, TInput> extends Schema<
  TOutput | null,
  TInput | null
> {
  constructor(readonly innerSchema: Schema<TOutput, TInput>) {
    super();
  }

  _parse(
    input: unknown,
    ctx: ParseContext
  ): DynamicParseReturnType<TOutput | null> {
    if (input === null) {
      return makeSuccess(null);
    }
    const result = this.innerSchema._parse(input, ctx);
    if (isPromise(result)) {
      return result.then((res) => (res.success ? makeSuccess(res.data) : res));
    }
    return result;
  }

  unwrap(): Schema<TOutput, TInput> {
    return this.innerSchema;
  }
}
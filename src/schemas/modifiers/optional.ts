import { Schema } from "../../core/schema-base.js";
import { makeSuccess, isPromise, type DynamicParseReturnType } from "../../core/result.js";
import type { ParseContext } from "../../core/context.js";

export class OptionalSchema<TOutput, TInput> extends Schema<TOutput | undefined, TInput | undefined> {
  constructor(readonly innerSchema: Schema<TOutput, TInput>) {
    super();
  }

  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<TOutput | undefined> {
    if (input === undefined) {
      return makeSuccess(undefined);
    }
    const result = this.innerSchema._parse(input, ctx);
    if (isPromise(result)) {
      return result.then((res) => (res.success ? makeSuccess(res.data) : res));
    }
    return result;
  }
}
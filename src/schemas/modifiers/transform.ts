import { Schema } from "../../core/schema.js";
import { addIssue, type ParseContext } from "../../core/context.js";
import { makeFailure, makeSuccess, isPromise, type DynamicParseReturnType } from "../../core/result.js";

export class TransformSchema<TOutput, TInput, TNewOutput> extends Schema<TNewOutput, TInput> {
  constructor(
    readonly innerSchema: Schema<TOutput, TInput>,
    readonly transformer: (value: TOutput) => TNewOutput | Promise<TNewOutput>
  ) {
    super();
  }

  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<TNewOutput> {
    const innerResult = this.innerSchema._parse(input, ctx);

    const applyTransform = (data: TOutput): DynamicParseReturnType<TNewOutput> => {
      try {
        const transformed = this.transformer(data);
        if (isPromise(transformed)) {
          if (!ctx.async) {
            throw new Error("Asynchronous transform executed during synchronous parse.");
          }
          return transformed
            .then((res) => makeSuccess(res))
            .catch((err: unknown) => {
              addIssue(ctx, {
                code: "custom",
                message: err instanceof Error ? err.message : "Transformer threw an error",
              });
              return makeFailure(ctx.issues);
            });
        }
        return makeSuccess(transformed);
      } catch (err: unknown) {
        addIssue(ctx, {
          code: "custom",
          message: err instanceof Error ? err.message : "Transformer threw an error",
        });
        return makeFailure(ctx.issues);
      }
    };

    if (isPromise(innerResult)) {
      return innerResult.then((res) => {
        if (!res.success) return res;
        return applyTransform(res.data);
      });
    }

    if (!innerResult.success) {
      return innerResult;
    }

    return applyTransform(innerResult.data);
  }
}
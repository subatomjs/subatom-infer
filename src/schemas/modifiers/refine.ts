import { Schema } from "../../core/schema.js";
import { makeFailure, makeSuccess, isPromise, type DynamicParseReturnType } from "../../core/result.js";
import { addIssue, type ParseContext } from "../../core/context.js";

export class RefinementSchema<TOutput, TInput> extends Schema<TOutput, TInput> {
  constructor(
    readonly innerSchema: Schema<TOutput, TInput>,
    readonly refinement: (value: TOutput) => boolean | Promise<boolean>,
    readonly message: string | ((value: TOutput) => string) = "Invalid input"
  ) {
    super();
  }

  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<TOutput> {
    const result = this.innerSchema._parse(input, ctx);

    const applyRefinement = (val: TOutput): DynamicParseReturnType<TOutput> => {
      const isValidOrPromise = this.refinement(val);

      if (isPromise(isValidOrPromise)) {
        if (!ctx.async) {
          throw new Error("Asynchronous refinement executed during synchronous parse.");
        }
        return isValidOrPromise.then((isValid) => {
          if (!isValid) {
            const msg =
              typeof this.message === "function"
                ? this.message(val)
                : this.message;
            addIssue(ctx, { code: "custom", message: msg });
            return makeFailure(ctx.issues);
          }
          return makeSuccess(val);
        });
      }

      if (!isValidOrPromise) {
        const msg =
          typeof this.message === "function"
            ? this.message(val)
            : this.message;
        addIssue(ctx, { code: "custom", message: msg });
        return makeFailure(ctx.issues);
      }

      return makeSuccess(val);
    };

    if (isPromise(result)) {
      return result.then((res) => {
        if (!res.success) return res;
        return applyRefinement(res.data);
      });
    }

    if (!result.success) return result;
    return applyRefinement(result.data);
  }
}
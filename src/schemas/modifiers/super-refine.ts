import { Schema, type RefinementContext } from "../../core/schema.js";
import { addIssue, type ParseContext } from "../../core/context.js";
import { makeFailure, makeSuccess, isPromise, type DynamicParseReturnType } from "../../core/result.js";

export class SuperRefineSchema<TOutput, TInput> extends Schema<TOutput, TInput> {
  constructor(
    readonly innerSchema: Schema<TOutput, TInput>,
    readonly refinement: (value: TOutput, ctx: RefinementContext) => void | Promise<void>
  ) {
    super();
  }

  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<TOutput> {
    const innerResult = this.innerSchema._parse(input, ctx);

    const applySuperRefine = (data: TOutput): DynamicParseReturnType<TOutput> => {
      const baseIssueCount = ctx.issues.length;
      const refCtx: RefinementContext = {
        addIssue: (issue) => addIssue(ctx, issue),
        path: ctx.path,
      };

      const res = this.refinement(data, refCtx);

      if (isPromise(res)) {
        if (!ctx.async) {
          throw new Error("Asynchronous superRefine executed during synchronous parse mode.");
        }
        return res.then(() =>
          ctx.issues.length > baseIssueCount ? makeFailure(ctx.issues) : makeSuccess(data)
        );
      }

      if (ctx.issues.length > baseIssueCount) return makeFailure(ctx.issues);
      return makeSuccess(data);
    };

    if (isPromise(innerResult)) {
      return innerResult.then((r) => (r.success ? applySuperRefine(r.data) : r));
    }
    if (!innerResult.success) return innerResult;
    return applySuperRefine(innerResult.data);
  }
}
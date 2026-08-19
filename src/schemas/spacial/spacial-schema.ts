// src/schemas/special/function-promise-file.ts
import { Schema } from "../../core/schema.js";
import { addIssue, type ParseContext } from "../../core/context.js";
import { makeFailure, makeSuccess, isPromise, type DynamicParseReturnType } from "../../core/result.js";
import type { TupleSchemas, InferTupleOutput } from "../composites/collections.js";
import { TupleSchema } from "../composites/collections.js";

export class FunctionSchema<
  TArgs extends TupleSchemas,
  TReturn extends Schema<unknown, unknown>
> extends Schema<
  (...args: InferTupleOutput<TArgs>) => TReturn["_output"],
  (...args: unknown[]) => unknown
> {
  constructor(readonly argsSchema: TupleSchema<TArgs>, readonly returnSchema: TReturn) {
    super();
  }

  _parse(
    input: unknown,
    ctx: ParseContext
  ): DynamicParseReturnType<(...args: InferTupleOutput<TArgs>) => TReturn["_output"]> {
    if (typeof input !== "function") {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "function",
        received: typeof input,
        message: `Expected function, received ${typeof input}`,
      });
      return makeFailure(ctx.issues);
    }

    const targetFn = input as (...args: unknown[]) => unknown;

    const validatedWrapper = (...args: InferTupleOutput<TArgs>): TReturn["_output"] => {
      const validatedArgs = this.argsSchema.parse(args);
      const result = targetFn(...(validatedArgs as unknown[]));
      return this.returnSchema.parse(result);
    };

    return makeSuccess(validatedWrapper);
  }

  args<TNewArgs extends TupleSchemas>(...schemas: TNewArgs) {
    return new FunctionSchema(new TupleSchema(schemas), this.returnSchema);
  }

  returns<TNewReturn extends Schema<unknown, unknown>>(schema: TNewReturn) {
    return new FunctionSchema(this.argsSchema, schema);
  }
}

export class PromiseSchema<TValueSchema extends Schema<unknown, unknown>> extends Schema<
  Promise<TValueSchema["_output"]>,
  Promise<TValueSchema["_input"]>
> {
  constructor(readonly unwrapSchema: TValueSchema) {
    super();
  }

  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<Promise<TValueSchema["_output"]>> {
    if (!isPromise(input)) {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "Promise",
        received: typeof input,
        message: "Expected Promise instance",
      });
      return makeFailure(ctx.issues);
    }

    const wrappedPromise = (input as Promise<unknown>).then((val) => this.unwrapSchema.parseAsync(val));
    return makeSuccess(wrappedPromise);
  }
}

export interface FileValue {
  size: number;
  type: string;
  name?: string;
  [key: string]: unknown;
}

export interface FileCheck {
  kind: string;
  validate: (file: FileValue) => boolean;
  message: string;
}

export class FileSchema extends Schema<FileValue, FileValue> {
  constructor(readonly checks: readonly FileCheck[] = []) {
    super();
  }

  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<FileValue> {
    if (typeof input !== "object" || input === null || !("size" in input) || !("type" in input)) {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "File | Blob",
        received: input === null ? "null" : typeof input,
        message: "Expected File or Blob instance",
      });
      return makeFailure(ctx.issues);
    }

    const file = input as FileValue;

    for (const check of this.checks) {
      if (!check.validate(file)) {
        addIssue(ctx, {
          code: "invalid_value",
          received: file,
          message: check.message,
        });
      }
    }

    if (ctx.issues.length > 0) return makeFailure(ctx.issues);
    return makeSuccess(file);
  }

  min(minBytes: number, msg?: string) {
    return new FileSchema([...this.checks, { kind: "min", validate: (f) => f.size >= minBytes, message: msg ?? `File must be >= ${minBytes} bytes` }]);
  }

  max(maxBytes: number, msg?: string) {
    return new FileSchema([...this.checks, { kind: "max", validate: (f) => f.size <= maxBytes, message: msg ?? `File must be <= ${maxBytes} bytes` }]);
  }

  mime(mimeType: string | readonly string[], msg?: string) {
    const allowed = Array.isArray(mimeType) ? mimeType : [mimeType];
    return new FileSchema([...this.checks, { kind: "mime", validate: (f) => allowed.includes(f.type), message: msg ?? `MIME type must be ${allowed.join(", ")}` }]);
  }
}
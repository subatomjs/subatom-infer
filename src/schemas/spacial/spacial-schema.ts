/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */


import { Schema } from "../../core/schema.js";
import { addIssue, type ParseContext } from "../../core/context.js";
import {
  makeFailure,
  makeSuccess,
  isPromise,
  type DynamicParseReturnType,
} from "../../core/result.js";
import {
  TupleSchema,
  type TupleSchemas,
  type InferTupleOutput,
} from "../composites/collections.js";

export class FunctionSchema<
  TArgs extends TupleSchemas,
  TReturn extends Schema<unknown, unknown>
> extends Schema<
  (...args: InferTupleOutput<TArgs>) => TReturn["_output"],
  (...args: unknown[]) => unknown
> {
  constructor(
    readonly argsSchema: TupleSchema<TArgs>,
    readonly returnSchema: TReturn
  ) {
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

    const validatedWrapper = (
      ...args: InferTupleOutput<TArgs>
    ): TReturn["_output"] => {
      const validatedArgs = this.argsSchema.parse(args);
      const result = targetFn(...(validatedArgs as unknown[]));
      return this.returnSchema.parse(result);
    };

    return makeSuccess(validatedWrapper);
  }

  args<TNewArgs extends TupleSchemas>(
    ...schemas: TNewArgs
  ): FunctionSchema<TNewArgs, TReturn> {
    return new FunctionSchema(new TupleSchema(schemas), this.returnSchema);
  }

  returns<TNewReturn extends Schema<unknown, unknown>>(
    schema: TNewReturn
  ): FunctionSchema<TArgs, TNewReturn> {
    return new FunctionSchema(this.argsSchema, schema);
  }
}

export class PromiseSchema<
  TValueSchema extends Schema<unknown, unknown>
> extends Schema<
  Promise<TValueSchema["_output"]>,
  Promise<TValueSchema["_input"]>
> {
  constructor(readonly unwrapSchema: TValueSchema) {
    super();
  }

  _parse(
    input: unknown,
    ctx: ParseContext
  ): DynamicParseReturnType<Promise<TValueSchema["_output"]>> {
    if (!isPromise(input)) {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "Promise",
        received: typeof input,
        message: "Expected Promise instance",
      });
      return makeFailure(ctx.issues);
    }

    const wrappedPromise = (input as Promise<unknown>).then((val) =>
      this.unwrapSchema.parseAsync(val)
    );
    return makeSuccess(wrappedPromise);
  }

  unwrap(): TValueSchema {
    return this.unwrapSchema;
  }
}

export interface FileValue {
  readonly size: number;
  readonly type: string;
  readonly name?: string;
  readonly [key: string]: unknown;
}

export interface FileCheck {
  readonly kind: string;
  readonly validate: (file: FileValue) => boolean;
  readonly message: string;
}

export class FileSchema extends Schema<FileValue, FileValue> {
  readonly checks: readonly FileCheck[];

  constructor(checks: readonly FileCheck[] = []) {
    super();
    this.checks = Object.freeze([...checks]);
  }

  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<FileValue> {
    if (
      typeof input !== "object" ||
      input === null ||
      !("size" in input) ||
      !("type" in input)
    ) {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "File | Blob",
        received: input === null ? "null" : typeof input,
        message: "Expected File or Blob-like object",
      });
      return makeFailure(ctx.issues);
    }

    const file = input as FileValue;

    for (const check of this.checks) {
      if (!check.validate(file)) {
        if (check.kind === "min") {
          addIssue(ctx, {
            code: "too_small",
            minimum: (check as unknown as { minBytes: number }).minBytes,
            inclusive: true,
            origin: "file",
            message: check.message,
          });
        } else if (check.kind === "max") {
          addIssue(ctx, {
            code: "too_big",
            maximum: (check as unknown as { maxBytes: number }).maxBytes,
            inclusive: true,
            origin: "file",
            message: check.message,
          });
        } else {
          addIssue(ctx, {
            code: "invalid_value",
            received: file,
            message: check.message,
          });
        }
      }
    }

    if (ctx.issues.length > 0) return makeFailure(ctx.issues);
    return makeSuccess(file);
  }

  private addCheck(check: FileCheck): FileSchema {
    return new FileSchema([...this.checks, check]);
  }

  min(minBytes: number, msg?: string): FileSchema {
    return this.addCheck({
      kind: "min",
      validate: (f) => f.size >= minBytes,
      message: msg ?? `File must be >= ${minBytes} bytes`,
      ...({ minBytes } as object),
    });
  }

  max(maxBytes: number, msg?: string): FileSchema {
    return this.addCheck({
      kind: "max",
      validate: (f) => f.size <= maxBytes,
      message: msg ?? `File must be <= ${maxBytes} bytes`,
      ...({ maxBytes } as object),
    });
  }

  mime(mimeType: string | readonly string[], msg?: string): FileSchema {
    const allowed = Array.isArray(mimeType) ? mimeType : [mimeType];
    return this.addCheck({
      kind: "mime",
      validate: (f) => allowed.includes(f.type),
      message: msg ?? `MIME type must be one of: ${allowed.join(", ")}`,
    });
  }
}
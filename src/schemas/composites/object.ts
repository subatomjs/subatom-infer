/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */

import { Schema } from "../../core/schema.js";
import {
  addIssue,
  nestContext,
  type ParseContext,
} from "../../core/context.js";
import {
  makeFailure,
  makeSuccess,
  isPromise,
  type ParseResult,
  type DynamicParseReturnType,
} from "../../core/result.js";
import { OptionalSchema } from "../modifiers/optional.js";
import { EnumSchema } from "./enum.js";

export type RawShape = { [key: string]: Schema<any, any> };

export type InferObjectOutput<TShape extends RawShape> = {
  [K in keyof TShape]: TShape[K]["_output"];
};

export type InferObjectInput<TShape extends RawShape> = {
  [K in keyof TShape]: TShape[K]["_input"];
};

export type ObjectPolicy = "strip" | "strict" | "passthrough";

type MergeShapes<A extends RawShape, B extends RawShape> = {
  [K in keyof A | keyof B]: K extends keyof B
    ? B[K]
    : K extends keyof A
      ? A[K]
      : never;
};

export class ObjectSchema<
  TShape extends RawShape,
  TPolicy extends ObjectPolicy = "strip",
  TCatchall extends Schema<any, any> | undefined = undefined,
> extends Schema<InferObjectOutput<TShape>, InferObjectInput<TShape>> {
  readonly shape: TShape;
  readonly policy: TPolicy;
  readonly catchallSchema: TCatchall;

  constructor(
    shape: TShape,
    policy: TPolicy = "strip" as TPolicy,
    catchall: TCatchall = undefined as TCatchall,
  ) {
    super();
    this.shape = Object.freeze({ ...shape });
    this.policy = policy;
    this.catchallSchema = catchall;
  }

  _parse(
    input: unknown,
    ctx: ParseContext,
  ): DynamicParseReturnType<InferObjectOutput<TShape>> {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "object",
        received:
          input === null
            ? "null"
            : Array.isArray(input)
              ? "array"
              : typeof input,
        message: `Expected object, received ${input === null ? "null" : Array.isArray(input) ? "array" : typeof input}`,
      });
      return makeFailure(ctx.issues);
    }

    const inputObj = input as Record<string, unknown>;
    const output: Record<string, unknown> = Object.create(null);
    const shapeKeys = new Set(Object.keys(this.shape));
    const inputKeys = Object.keys(inputObj);
    const extraKeys = inputKeys.filter(
      (k) => !shapeKeys.has(k) && k !== "__proto__" && k !== "constructor",
    );
    const promises: Promise<void>[] = [];
    let hasAsync = false;

    if (this.policy === "strict" && extraKeys.length > 0) {
      addIssue(ctx, {
        code: "unrecognized_keys",
        keys: extraKeys,
        message: `Unrecognized key(s) in object: ${extraKeys.join(", ")}`,
      });
    }

    for (const key of shapeKeys) {
      if (key === "__proto__" || key === "constructor") continue;
      const fieldSchema = this.shape[key];
      if (!fieldSchema) continue;

      const fieldValue = inputObj[key];
      const fieldCtx = nestContext(ctx, key);
      const res = fieldSchema._parse(fieldValue, fieldCtx);

      if (isPromise(res)) {
        hasAsync = true;
        promises.push(
          res.then((r: ParseResult<unknown>) => {
            if (r.success) output[key] = r.data;
          }),
        );
      } else if (res.success) {
        output[key] = res.data;
      }
    }

    for (const key of extraKeys) {
      if (this.catchallSchema) {
        const fieldCtx = nestContext(ctx, key);
        const res = this.catchallSchema._parse(inputObj[key], fieldCtx);
        if (isPromise(res)) {
          hasAsync = true;
          promises.push(
            res.then((r: ParseResult<unknown>) => {
              if (r.success) output[key] = r.data;
            }),
          );
        } else if (res.success) {
          output[key] = res.data;
        }
      } else if (this.policy === "passthrough") {
        output[key] = inputObj[key];
      }
    }

    if (hasAsync) {
      if (!ctx.async) {
        throw new Error(
          "Synchronous parse encountered asynchronous nested object parsing.",
        );
      }
      return Promise.all(promises).then(() =>
        ctx.issues.length > 0
          ? makeFailure(ctx.issues)
          : makeSuccess(output as InferObjectOutput<TShape>),
      );
    }

    return ctx.issues.length > 0
      ? makeFailure(ctx.issues)
      : makeSuccess(output as InferObjectOutput<TShape>);
  }

  strict(): ObjectSchema<TShape, "strict", TCatchall> {
    return new ObjectSchema(this.shape, "strict", this.catchallSchema);
  }

  passthrough(): ObjectSchema<TShape, "passthrough", TCatchall> {
    return new ObjectSchema(this.shape, "passthrough", this.catchallSchema);
  }

  strip(): ObjectSchema<TShape, "strip", TCatchall> {
    return new ObjectSchema(this.shape, "strip", this.catchallSchema);
  }

  loose(): ObjectSchema<TShape, "passthrough", TCatchall> {
    return this.passthrough();
  }

  catchall<TCatch extends Schema<any, any>>(
    schema: TCatch,
  ): ObjectSchema<TShape, TPolicy, TCatch> {
    return new ObjectSchema(this.shape, this.policy, schema);
  }

  extend<TExtendShape extends RawShape>(
    extension: TExtendShape,
  ): ObjectSchema<MergeShapes<TShape, TExtendShape>, TPolicy, TCatchall> {
    return new ObjectSchema(
      { ...this.shape, ...extension } as MergeShapes<TShape, TExtendShape>,
      this.policy,
      this.catchallSchema,
    );
  }

  safeExtend<TExtendShape extends RawShape>(
    extension: TExtendShape,
  ): ObjectSchema<MergeShapes<TShape, TExtendShape>, TPolicy, TCatchall> {
    return this.extend(extension);
  }

  merge<TMergeShape extends RawShape>(
    other: ObjectSchema<
      TMergeShape,
      ObjectPolicy,
      Schema<any, any> | undefined
    >,
  ): ObjectSchema<MergeShapes<TShape, TMergeShape>, TPolicy, TCatchall> {
    return new ObjectSchema(
      { ...this.shape, ...other.shape } as MergeShapes<TShape, TMergeShape>,
      this.policy,
      this.catchallSchema,
    );
  }

  pick<Mask extends { [K in keyof TShape]?: boolean }>(
    mask: Mask,
  ): ObjectSchema<
    Pick<TShape, Extract<keyof Mask, keyof TShape>>,
    TPolicy,
    TCatchall
  > {
    const picked: Record<string, Schema<any, any>> = {};
    for (const key of Object.keys(mask)) {
      if (mask[key as keyof TShape] && this.shape[key]) {
        picked[key] = this.shape[key]!;
      }
    }
    return new ObjectSchema(
      picked as Pick<TShape, Extract<keyof Mask, keyof TShape>>,
      this.policy,
      this.catchallSchema,
    );
  }

  omit<Mask extends { [K in keyof TShape]?: boolean }>(
    mask: Mask,
  ): ObjectSchema<
    Omit<TShape, Extract<keyof Mask, keyof TShape>>,
    TPolicy,
    TCatchall
  > {
    const omitted: Record<string, Schema<any, any>> = { ...this.shape };
    for (const key of Object.keys(mask)) {
      if (mask[key as keyof TShape]) delete omitted[key];
    }
    return new ObjectSchema(
      omitted as Omit<TShape, Extract<keyof Mask, keyof TShape>>,
      this.policy,
      this.catchallSchema,
    );
  }

  partial(): ObjectSchema<
    {
      [K in keyof TShape]: OptionalSchema<
        TShape[K]["_output"],
        TShape[K]["_input"]
      >;
    },
    TPolicy,
    TCatchall
  > {
    const partialShape: Record<string, Schema<any, any>> = {};
    for (const key of Object.keys(this.shape)) {
      partialShape[key] = new OptionalSchema(this.shape[key]!);
    }
    return new ObjectSchema(
      partialShape as {
        [K in keyof TShape]: OptionalSchema<
          TShape[K]["_output"],
          TShape[K]["_input"]
        >;
      },
      this.policy,
      this.catchallSchema,
    );
  }

  required(): ObjectSchema<
    {
      [K in keyof TShape]: TShape[K] extends OptionalSchema<infer O, infer I>
        ? Schema<O, I>
        : TShape[K];
    },
    TPolicy,
    TCatchall
  > {
    const reqShape: Record<string, Schema<any, any>> = {};
    for (const key of Object.keys(this.shape)) {
      const s = this.shape[key]!;
      reqShape[key] = s instanceof OptionalSchema ? s.innerSchema : s;
    }
    return new ObjectSchema(
      reqShape as {
        [K in keyof TShape]: TShape[K] extends OptionalSchema<infer O, infer I>
          ? Schema<O, I>
          : TShape[K];
      },
      this.policy,
      this.catchallSchema,
    );
  }

  deepPartial(): ObjectSchema<
    Record<string, Schema<any, any>>,
    TPolicy,
    TCatchall
  > {
    const deepShape: Record<string, Schema<any, any>> = {};
    for (const key of Object.keys(this.shape)) {
      const s = this.shape[key]!;
      if (s instanceof ObjectSchema) {
        deepShape[key] = new OptionalSchema(s.deepPartial());
      } else {
        deepShape[key] = new OptionalSchema(s);
      }
    }
    return new ObjectSchema(deepShape, this.policy, this.catchallSchema);
  }

  keyof(): EnumSchema<
    [Extract<keyof TShape, string>, ...Array<Extract<keyof TShape, string>>]
  > {
    const keys = Object.keys(this.shape);
    if (keys.length === 0) {
      throw new Error(
        "Cannot invoke keyof() on an ObjectSchema with an empty shape.",
      );
    }
    return new EnumSchema(
      keys as [
        Extract<keyof TShape, string>,
        ...Array<Extract<keyof TShape, string>>,
      ],
    );
  }
}

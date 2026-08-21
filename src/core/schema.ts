/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */

import { createParseContext, type ParseContext } from "./context.js";
import { ValidationError } from "./error.js";
import type { IssueData } from "./issue.js";
import {
  isPromise,
  type DynamicParseReturnType,
  type ParseResult,
} from "./result.js";

/**
 * Homomorphic readonly type mapper that safely handles any, primitives,
 * arrays, and object unions without forcing primitives into indexed object types.
 */
export type SchemaReadonly<T> = 0 extends 1 & T
  ? any
  : T extends (...args: any[]) => any
    ? T
    : T extends readonly (infer U)[]
      ? readonly U[]
      : T extends object
        ? { readonly [K in keyof T]: T[K] }
        : T;

export interface RefinementContext {
  addIssue: (
    issue: IssueData & { path?: readonly (string | number)[] },
  ) => void;
  readonly path: readonly (string | number)[];
}

export interface SchemaRegistryBridge {
  optional: <O, I>(
    schema: Schema<O, I>,
  ) => Schema<O | undefined, I | undefined>;
  nullable: <O, I>(schema: Schema<O, I>) => Schema<O | null, I | null>;
  default: <O, I>(
    schema: Schema<O, I>,
    def: O | (() => O),
  ) => Schema<O, I | undefined>;
  prefault: <O, I>(
    schema: Schema<O, I>,
    def: O | (() => O),
  ) => Schema<O, I | undefined>;
  transform: <O, I, Next>(
    schema: Schema<O, I>,
    fn: (val: O) => Next | Promise<Next>,
  ) => Schema<Next, I>;
  refine: <O, I>(
    schema: Schema<O, I>,
    check: (val: O) => boolean | Promise<boolean>,
    msg?: string | ((val: O) => string),
  ) => Schema<O, I>;
  superRefine: <O, I>(
    schema: Schema<O, I>,
    refiner: (val: O, ctx: RefinementContext) => void | Promise<void>,
  ) => Schema<O, I>;
  pipe: <A, B, C>(first: Schema<B, A>, second: Schema<C, B>) => Schema<C, A>;
  readonly: <O, I>(
    schema: Schema<O, I>,
  ) => Schema<SchemaReadonly<O>, SchemaReadonly<I>>;
  catch: <O, I>(
    schema: Schema<O, I>,
    fallback: O | ((ctx: { error: unknown; input: unknown }) => O),
  ) => Schema<O, I>;
}

export const schemaRegistry: Partial<SchemaRegistryBridge> = {};

export abstract class Schema<TOutput, TInput = TOutput> {
  declare readonly _output: TOutput;
  declare readonly _input: TInput;

  abstract _parse(
    input: unknown,
    ctx: ParseContext,
  ): DynamicParseReturnType<TOutput>;

  parse(input: unknown): TOutput {
    const ctx = createParseContext(false);
    const result = this._parse(input, ctx);

    if (isPromise(result)) {
      throw new Error(
        "Asynchronous validation occurred during synchronous parse(). Use parseAsync() instead.",
      );
    }

    if (!result.success) {
      throw new ValidationError(result.issues);
    }

    return result.data;
  }

  async parseAsync(input: unknown): Promise<TOutput> {
    const ctx = createParseContext(true);
    const result = await Promise.resolve(this._parse(input, ctx));

    if (!result.success) {
      throw new ValidationError(result.issues);
    }

    return result.data;
  }

  safeParse(input: unknown): ParseResult<TOutput> {
    const ctx = createParseContext(false);
    try {
      const result = this._parse(input, ctx);
      if (isPromise(result)) {
        throw new Error(
          "Encountered Promise during synchronous safeParse(). Use safeParseAsync().",
        );
      }
      return result;
    } catch (error) {
      if (error instanceof ValidationError) {
        return<any> { success: false, issues: error.issues };
      }
      throw error;
    }
  }

  async safeParseAsync(input: unknown): Promise<ParseResult<TOutput>> {
    const ctx = createParseContext(true);
    try {
      return await Promise.resolve(this._parse(input, ctx));
    } catch (error:unknown) {
      if (error instanceof ValidationError) {
        return<any> { success: false, issues: error.issues };
      }
      throw error;
    }
  }

  spa(input: unknown): Promise<ParseResult<TOutput>> {
    return this.safeParseAsync(input);
  }

  optional(): Schema<TOutput | undefined, TInput | undefined> {
    if (!schemaRegistry.optional)
      throw new Error("OptionalSchema not registered");
    return schemaRegistry.optional(this);
  }

  nullable(): Schema<TOutput | null, TInput | null> {
    if (!schemaRegistry.nullable)
      throw new Error("NullableSchema not registered");
    return schemaRegistry.nullable(this);
  }

  nullish(): Schema<TOutput | null | undefined, TInput | null | undefined> {
    return this.nullable().optional();
  }

  default(
    defaultValue: TOutput | (() => TOutput),
  ): Schema<TOutput, TInput | undefined> {
    if (!schemaRegistry.default)
      throw new Error("DefaultSchema not registered");
    return schemaRegistry.default(this, defaultValue);
  }

  prefault(
    defaultValue: TOutput | (() => TOutput),
  ): Schema<TOutput, TInput | undefined> {
    if (!schemaRegistry.prefault)
      throw new Error("PrefaultSchema not registered");
    return schemaRegistry.prefault(this, defaultValue);
  }

  transform<TNext>(
    transformer: (value: TOutput) => TNext | Promise<TNext>,
  ): Schema<TNext, TInput> {
    if (!schemaRegistry.transform)
      throw new Error("TransformSchema not registered");
    return schemaRegistry.transform(this, transformer);
  }

  refine(
    check: (value: TOutput) => boolean | Promise<boolean>,
    message: string | ((value: TOutput) => string) = "Invalid input",
  ): Schema<TOutput, TInput> {
    if (!schemaRegistry.refine)
      throw new Error("RefinementSchema not registered");
    return schemaRegistry.refine(this, check, message);
  }

  superRefine(
    refiner: (value: TOutput, ctx: RefinementContext) => void | Promise<void>,
  ): Schema<TOutput, TInput> {
    if (!schemaRegistry.superRefine)
      throw new Error("SuperRefineSchema not registered");
    return schemaRegistry.superRefine(this, refiner);
  }

  pipe<TNext>(nextSchema: Schema<TNext, TOutput>): Schema<TNext, TInput> {
    if (!schemaRegistry.pipe) throw new Error("PipeSchema not registered");
    return schemaRegistry.pipe(this, nextSchema);
  }

  readonly(): Schema<SchemaReadonly<TOutput>, SchemaReadonly<TInput>> {
    if (!schemaRegistry.readonly)
      throw new Error("ReadonlySchema not registered");
    return schemaRegistry.readonly(this);
  }

  catch(
    fallback: TOutput | ((ctx: { error: unknown; input: unknown }) => TOutput),
  ): Schema<TOutput, TInput> {
    if (!schemaRegistry.catch) throw new Error("CatchSchema not registered");
    return schemaRegistry.catch(this, fallback);
  }
}

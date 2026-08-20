// Initialize modifier registrations to enable fluent prototype chaining
import "./schemas/modifiers/index.js";

// Core exports
export * from "./core/context.js";
export * from "./core/error.js";
export * from "./core/issue.js";
export * from "./core/result.js";
export * from "./core/schema.js";
export * from "./core/types.js";

// Schema exports
export * from "./schemas/primitives/index.js";
export * from "./schemas/modifiers/index.js";
export * from "./schemas/composites/index.js";
export * from "./schemas/spacial/index.js";

// Factory imports for standard API namespace
import { Schema } from "./core/schema.js";
import { addIssue, type ParseContext } from "./core/context.js";
import {
  makeFailure,
  makeSuccess,
  isPromise,
  type DynamicParseReturnType,
} from "./core/result.js";

import { StringSchema } from "./schemas/primitives/string.js";
import { NumberSchema } from "./schemas/primitives/number.js";
import { BigIntSchema } from "./schemas/primitives/bigint.js";
import {
  BooleanSchema,
  DateSchema,
  LiteralSchema,
  LiteralValue,
  NullSchema,
  UndefinedSchema,
  AnySchema,
  UnknownSchema,
  NeverSchema,
  SymbolSchema,
  NaNSchema,
} from "./schemas/primitives/advanced-primitives.js";
import { coerce } from "./schemas/primitives/coercion.js";
import {
  ArraySchema,
  TupleSchema,
  TupleSchemas,
  RecordSchema,
  SetSchema,
  MapSchema,
} from "./schemas/composites/collections.js";
import { ObjectSchema, RawShape } from "./schemas/composites/object.js";
import { EnumSchema, NativeEnumSchema } from "./schemas/composites/enum.js";
import {
  UnionSchema,
  UnionOptions,
  DiscriminatedUnionSchema,
  IntersectionSchema,
  LazySchema,
} from "./schemas/composites/combinators.js";
import {
  PreprocessSchema,
  PipeSchema,
  BrandSchema,
  Codec,
} from "./schemas/modifiers/all-modifiers.js";
import {
  FunctionSchema,
  PromiseSchema,
  FileSchema,
} from "./schemas/spacial/spacial-schema.js";

/**
 * Dedicated schema for arbitrary boolean validation functions
 */
export class CustomSchema<TOutput> extends Schema<TOutput, unknown> {
  constructor(
    readonly validator: (val: unknown) => boolean | Promise<boolean>,
    readonly message: string = "Custom validation failed"
  ) {
    super();
  }

  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<TOutput> {
    const isValidOrPromise = this.validator(input);

    if (isPromise(isValidOrPromise)) {
      if (!ctx.async) {
        throw new Error("Asynchronous custom validator executed during synchronous parse.");
      }
      return isValidOrPromise.then((valid) => {
        if (!valid) {
          addIssue(ctx, { code: "custom", message: this.message });
          return makeFailure(ctx.issues);
        }
        return makeSuccess(input as TOutput);
      });
    }

    if (!isValidOrPromise) {
      addIssue(ctx, { code: "custom", message: this.message });
      return makeFailure(ctx.issues);
    }

    return makeSuccess(input as TOutput);
  }
}

/**
 * Primary fluent API namespace for subatom-infer matching documentation specification
 */
export const infer = {
  // Primitives & Unit Types
  string: (): StringSchema => new StringSchema(),
  number: (): NumberSchema => new NumberSchema(),
  bigint: (): BigIntSchema => new BigIntSchema(),
  boolean: (): BooleanSchema => new BooleanSchema(),
  date: (): DateSchema => new DateSchema(),
  literal: <T extends LiteralValue>(value: T): LiteralSchema<T> => new LiteralSchema(value),
  null: (): NullSchema => new NullSchema(),
  undefined: (): UndefinedSchema => new UndefinedSchema(),
  void: (): UndefinedSchema => new UndefinedSchema(),
  any: (): AnySchema => new AnySchema(),
  unknown: (): UnknownSchema => new UnknownSchema(),
  never: (): NeverSchema => new NeverSchema(),
  symbol: (): SymbolSchema => new SymbolSchema(),
  nan: (): NaNSchema => new NaNSchema(),

  // Direct Format Shortcuts
  uuid: (msg?: string): StringSchema => new StringSchema().uuid(msg),
  email: (msg?: string): StringSchema => new StringSchema().email(msg),

  // Coercion
  coerce,

  // Composites
  object: <TShape extends RawShape>(shape: TShape): ObjectSchema<TShape, "strip", undefined> =>
    new ObjectSchema(shape),
  strictObject: <TShape extends RawShape>(shape: TShape): ObjectSchema<TShape, "strict", undefined> =>
    new ObjectSchema(shape, "strict"),
  passthroughObject: <TShape extends RawShape>(
    shape: TShape
  ): ObjectSchema<TShape, "passthrough", undefined> =>
    new ObjectSchema(shape, "passthrough"),
  array: <TOutput, TInput>(elementSchema: Schema<TOutput, TInput>): ArraySchema<TOutput, TInput> =>
    new ArraySchema(elementSchema),
  tuple: <TItems extends TupleSchemas>(schemas: TItems): TupleSchema<TItems> =>
    new TupleSchema(schemas),
  record: <
    TKey extends Schema<string | number | symbol, string | number | symbol>,
    TValue extends Schema<unknown, unknown>
  >(
    keySchema: TKey,
    valueSchema: TValue
  ): RecordSchema<TKey, TValue> => new RecordSchema(keySchema, valueSchema),
  set: <TOutput, TInput>(valueSchema: Schema<TOutput, TInput>): SetSchema<TOutput, TInput> =>
    new SetSchema(valueSchema),
  map: <TKeyOutput, TKeyInput, TValOutput, TValInput>(
    keySchema: Schema<TKeyOutput, TKeyInput>,
    valueSchema: Schema<TValOutput, TValInput>
  ): MapSchema<TKeyOutput, TKeyInput, TValOutput, TValInput> =>
    new MapSchema(keySchema, valueSchema),
  enum: <const TValues extends readonly [string, ...string[]]>(
    values: TValues
  ): EnumSchema<TValues> => new EnumSchema(values),
  nativeEnum: <TEnum extends Record<string, string | number>>(
    enumObj: TEnum
  ): NativeEnumSchema<TEnum> => new NativeEnumSchema(enumObj),

  // Combinators
  union: <TOptions extends UnionOptions>(
    optionsOrFirst: TOptions | Schema<unknown, unknown>,
    ...rest: Schema<unknown, unknown>[]
  ): UnionSchema<TOptions> => {
    if (Array.isArray(optionsOrFirst)) {
      return new UnionSchema(optionsOrFirst as unknown as TOptions);
    }
    return new UnionSchema([optionsOrFirst, ...rest] as unknown as TOptions);
  },
  discriminatedUnion: <
    TDiscriminator extends string,
    TOptions extends readonly ObjectSchema<RawShape>[]
  >(
    discriminator: TDiscriminator,
    options: TOptions
  ): DiscriminatedUnionSchema<TDiscriminator, TOptions> =>
    new DiscriminatedUnionSchema(discriminator, options),
  intersection: <
    TLeft extends Schema<unknown, unknown>,
    TRight extends Schema<unknown, unknown>
  >(
    left: TLeft,
    right: TRight
  ): IntersectionSchema<TLeft, TRight> => new IntersectionSchema(left, right),
  lazy: <TOutput, TInput = TOutput>(
    getter: () => Schema<TOutput, TInput>
  ): LazySchema<TOutput, TInput> => new LazySchema(getter),

  // Modifiers & Transforms
  preprocess: <TOutput, TInput>(
    fn: (input: unknown) => unknown,
    schema: Schema<TOutput, TInput>
  ): PreprocessSchema<TOutput, TInput> => new PreprocessSchema(fn, schema),
  pipe: <A, B, C>(first: Schema<B, A>, second: Schema<C, B>): PipeSchema<A, B, C> =>
    new PipeSchema(first, second),
  brand: <TOutput, TInput, TBrand extends string | symbol>(
    schema: Schema<TOutput, TInput>,
    name: TBrand
  ): BrandSchema<TOutput, TInput, TBrand> => new BrandSchema(schema, name),
  codec: <TOutput, TInput = TOutput>(
    decoder: Schema<TOutput, TInput>,
    encoder: (output: TOutput) => TInput
  ): Codec<TOutput, TInput> => new Codec(decoder, encoder),
  custom: <TOutput = unknown>(
    validator: (val: unknown) => boolean | Promise<boolean>,
    message = "Custom validation failed"
  ): CustomSchema<TOutput> => new CustomSchema<TOutput>(validator, message),

  // Special
  function: <
    TArgs extends TupleSchemas = TupleSchemas,
    TReturn extends Schema<unknown, unknown> = Schema<unknown, unknown>
  >(
    args: TupleSchema<TArgs> = new TupleSchema([] as unknown as TArgs),
    returns: TReturn = new UnknownSchema() as unknown as TReturn
  ): FunctionSchema<TArgs, TReturn> => new FunctionSchema(args, returns),
  promise: <TValueSchema extends Schema<unknown, unknown>>(
    schema: TValueSchema
  ): PromiseSchema<TValueSchema> => new PromiseSchema(schema),
  file: (): FileSchema => new FileSchema(),
} as const;

// Backward compatibility alias
export const s = infer;
export default infer;
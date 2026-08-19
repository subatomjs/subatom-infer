import { StringSchema } from "./src/schemas/primitives/string.js";
import { NumberSchema } from "./src/schemas/primitives/number.js";
import { BigIntSchema } from "./src/schemas/primitives/bigint.js";
import {
  BooleanSchema,
  DateSchema,
  LiteralSchema,
  NullSchema,
  UndefinedSchema,
  AnySchema,
  UnknownSchema,
  NeverSchema,
  SymbolSchema,
  NaNSchema,
  type LiteralValue,
} from "./src/schemas/primitives/advanced-primitives.js";
import {
  ArraySchema,
  TupleSchema,
  RecordSchema,
  SetSchema,
  MapSchema,
  type TupleSchemas,
} from "./src/schemas/composites/collections.js";
import { ObjectSchema, type RawShape } from "./src/schemas/composites/object.js";
import { EnumSchema, NativeEnumSchema } from "./src/schemas/composites/enum.js";
import {
  UnionSchema,
  DiscriminatedUnionSchema,
  IntersectionSchema,
  LazySchema,
  type UnionOptions,
} from "./src/schemas/composites/combinators.js";
import {
  FunctionSchema,
  PromiseSchema,
  FileSchema,
} from "./src/schemas/spacial/spacial-schema.js";
import { OptionalSchema } from "./src/schemas/modifiers/optional.js";
import { NullableSchema } from "./src/schemas/modifiers/nullable.js";
import { DefaultSchema } from "./src/schemas/modifiers/default.js";
import { PrefaultSchema } from "./src/schemas/modifiers/prefault.js";
import {
  CatchSchema,
  PreprocessSchema,
  PipeSchema,
  ReadonlySchema,
  BrandSchema,
  Codec,
} from "./src/schemas/modifiers/all-modifiers.js";
import { RefinementSchema } from "./src/schemas/modifiers/refine.js";
import { SuperRefineSchema } from "./src/schemas/modifiers/extended-modifiers.js";
import { TransformSchema } from "./src/schemas/modifiers/transform.js";
import { coerce } from "./src/schemas/primitives/coercion.js";
import { Schema, type RefinementContext } from "./src/core/schema.js";

export type { Infer, Input, Output } from "./src/core/types.js";
export { ValidationError, type FormattedError } from "./src/core/error.js";
export type {
  ValidationIssue,
  InvalidTypeIssue,
  InvalidValueIssue,
  TooSmallIssue,
  TooBigIssue,
  InvalidFormatIssue,
  UnrecognizedKeysIssue,
  InvalidUnionIssue,
  CustomIssue,
  IssuePathElement,
} from "./src/core/issue.js";
export type {
  ParseResult,
  SafeParseResult,
  SyncParseReturnType,
  AsyncParseReturnType,
  DynamicParseReturnType,
} from "./src/core/result.js";
export type { ParseContext, IssuePayload } from "./src/core/context.js";
export {
  type RefinementContext,
  type SchemaMetadata,
} from "./src/core/schema.js";

// Export concrete schema classes for manual typing & inheritance
export {
  StringSchema,
  NumberSchema,
  BigIntSchema,
  BooleanSchema,
  DateSchema,
  LiteralSchema,
  NullSchema,
  UndefinedSchema,
  AnySchema,
  UnknownSchema,
  NeverSchema,
  SymbolSchema,
  NaNSchema,
  ArraySchema,
  TupleSchema,
  RecordSchema,
  SetSchema,
  MapSchema,
  ObjectSchema,
  EnumSchema,
  NativeEnumSchema,
  UnionSchema,
  DiscriminatedUnionSchema,
  IntersectionSchema,
  LazySchema,
  FunctionSchema,
  PromiseSchema,
  FileSchema,
  OptionalSchema,
  NullableSchema,
  DefaultSchema,
  PrefaultSchema,
  CatchSchema,
  PreprocessSchema,
  PipeSchema,
  ReadonlySchema,
  BrandSchema,
  Codec,
  RefinementSchema,
  SuperRefineSchema,
  TransformSchema,
};

export const infer = {
  // Primitives
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new BooleanSchema(),
  bigint: () => new BigIntSchema(),
  date: () => new DateSchema(),
  symbol: () => new SymbolSchema(),
  undefined: () => new UndefinedSchema(),
  null: () => new NullSchema(),
  void: () => new UndefinedSchema(),
  any: () => new AnySchema(),
  unknown: () => new UnknownSchema(),
  never: () => new NeverSchema(),
  nan: () => new NaNSchema(),
  literal: <T extends LiteralValue>(val: T) => new LiteralSchema(val),

  // Formats / Shortcuts
  uuid: (msg?: string) => new StringSchema().uuid(msg),
  guid: (msg?: string) => new StringSchema().guid(msg),
  email: (msg?: string) => new StringSchema().email(msg),
  url: (msg?: string) => new StringSchema().url(msg),
  httpUrl: (msg?: string) => new StringSchema().httpUrl(msg),
  cuid: (msg?: string) => new StringSchema().cuid(msg),
  cuid2: (msg?: string) => new StringSchema().cuid2(msg),
  ulid: (msg?: string) => new StringSchema().ulid(msg),
  nanoid: (msg?: string) => new StringSchema().nanoid(msg),
  datetime: (msg?: string) => new StringSchema().datetime(msg),
  ipv4: (msg?: string) => new StringSchema().ipv4(msg),
  ipv6: (msg?: string) => new StringSchema().ipv6(msg),
  hostname: (msg?: string) => new StringSchema().hostname(msg),

  // Composites
  object: <TShape extends RawShape>(shape: TShape) => new ObjectSchema(shape),
  strictObject: <TShape extends RawShape>(shape: TShape) =>
    new ObjectSchema(shape, "strict"),
  looseObject: <TShape extends RawShape>(shape: TShape) =>
    new ObjectSchema(shape, "passthrough"),
  array: <TOut, TIn>(element: Schema<TOut, TIn>) => new ArraySchema(element),
  tuple: <TItems extends TupleSchemas>(schemas: TItems) =>
    new TupleSchema(schemas),
  record: <
    TKey extends Schema<string | number | symbol, string | number | symbol>,
    TVal extends Schema<unknown, unknown>,
  >(
    key: TKey,
    val: TVal,
  ) => new RecordSchema(key, val),
  set: <TOut, TIn>(val: Schema<TOut, TIn>) => new SetSchema(val),
  map: <KOut, KIn, VOut, VIn>(key: Schema<KOut, KIn>, val: Schema<VOut, VIn>) =>
    new MapSchema(key, val),
  enum: <const TValues extends readonly [string, ...string[]]>(
    values: TValues,
  ) => new EnumSchema(values),
  nativeEnum: <TEnum extends Record<string, string | number>>(
    nativeEnum: TEnum,
  ) => new NativeEnumSchema(nativeEnum),

  // Combinators
  union: <TOptions extends UnionOptions>(options: TOptions) =>
    new UnionSchema(options),
  discriminatedUnion: <
    TDisc extends string,
    TOpts extends readonly ObjectSchema<RawShape>[],
  >(
    discriminator: TDisc,
    options: TOpts,
  ) => new DiscriminatedUnionSchema(discriminator, options),
  intersection: <
    L extends Schema<unknown, unknown>,
    R extends Schema<unknown, unknown>,
  >(
    left: L,
    right: R,
  ) => new IntersectionSchema(left, right),
  lazy: <TOut, TIn = TOut>(fn: () => Schema<TOut, TIn>) => new LazySchema(fn),

  // Special Run-time Types
  function: <
    TArgs extends TupleSchemas = [Schema<unknown, unknown>],
    TRet extends Schema<unknown, unknown> = Schema<unknown, unknown>,
  >(
    args?: TupleSchema<TArgs>,
    returns?: TRet,
  ) =>
    new FunctionSchema(
      args ?? new TupleSchema([] as unknown as TArgs),
      returns ?? (new UnknownSchema() as unknown as TRet),
    ),
  promise: <TVal extends Schema<unknown, unknown>>(val: TVal) =>
    new PromiseSchema(val),
  file: () => new FileSchema(),

  // Modifiers & Piping
  optional: <TOut, TIn>(schema: Schema<TOut, TIn>) =>
    new OptionalSchema(schema),
  nullable: <TOut, TIn>(schema: Schema<TOut, TIn>) =>
    new NullableSchema(schema),
  nullish: <TOut, TIn>(schema: Schema<TOut, TIn>) =>
    new NullableSchema(new OptionalSchema(schema)),
  default: <TOut, TIn>(
    schema: Schema<TOut, TIn>,
    defaultValue: TOut | (() => TOut),
  ) => new DefaultSchema(schema, defaultValue),
  prefault: <TOut, TIn>(
    schema: Schema<TOut, TIn>,
    defaultValue: TOut | (() => TOut),
  ) => new PrefaultSchema(schema, defaultValue),
  catch: <TOut, TIn>(
    schema: Schema<TOut, TIn>,
    fallback: TOut | ((ctx: { error: unknown; input: unknown }) => TOut),
  ) => new CatchSchema(schema, fallback),
  preprocess: <TOut, TIn>(
    fn: (arg: unknown) => unknown,
    schema: Schema<TOut, TIn>,
  ) => new PreprocessSchema(fn, schema),
  pipe: <A, B, C>(first: Schema<B, A>, second: Schema<C, B>) =>
    new PipeSchema(first, second),
  transform: <TOut, TIn, TNewOut>(
    schema: Schema<TOut, TIn>,
    transformer: (value: TOut) => TNewOut | Promise<TNewOut>,
  ) => new TransformSchema(schema, transformer),
  refine: <TOut, TIn>(
    schema: Schema<TOut, TIn>,
    predicate: (value: TOut) => boolean | Promise<boolean>,
    message?: string | ((value: TOut) => string),
  ) => new RefinementSchema(schema, predicate, message ?? "Invalid input"),
  superRefine: <TOut, TIn>(
    schema: Schema<TOut, TIn>,
    refinement: (value: TOut, ctx: RefinementContext) => void | Promise<void>,
  ) => new SuperRefineSchema(schema, refinement),
  readonly: <TOut, TIn>(schema: Schema<TOut, TIn>) =>
    new ReadonlySchema(schema),
  brand: <TOut, TIn, B extends string | symbol>(
    schema: Schema<TOut, TIn>,
    brandName: B,
  ) => new BrandSchema(schema, brandName),
  codec: <TOut, TIn>(
    decoder: Schema<TOut, TIn>,
    encoder: (output: TOut) => TIn,
  ) => new Codec(decoder, encoder),

  // Coercion Engine
  coerce,
};
// src/index.ts
export { Schema } from "./src/core/schema.js";

// Import registrations AFTER base Schema is fully exported
import "./src/core/register.js";
export const z = infer; // Backward-compatible alias
export default infer;

import {
  createParseContext,
  type IssuePayload,
} from "./context.js";
import { ValidationError } from "./error.js";
import {
  isPromise,
  type SafeParseResult,
} from "./result.js";
import { Schema, getCtor } from "./schema-base.js";
export * from "./schema-base.js";
import "./register.js";
// Type-only imports (Erased at compile time)
import type { OptionalSchema } from "../schemas/modifiers/optional.js";
import type { NullableSchema } from "../schemas/modifiers/nullable.js";
import type { DefaultSchema } from "../schemas/modifiers/default.js";
import type { PrefaultSchema } from "../schemas/modifiers/prefault.js";
import type {
  CatchSchema,
  PipeSchema,
  TransformSchema,
  RefinementSchema,
  SuperRefineSchema,
} from "../schemas/modifiers/extended-modifiers.js";
import type {
  UnionSchema,
  IntersectionSchema,
} from "../schemas/composites/combinators.js";

export * from "./schema-base.js";

export interface RefinementContext {
  addIssue: (issue: IssuePayload) => void;
  readonly path: readonly (string | number | symbol)[];
}

declare module "./schema-base.js" {
  interface Schema<TOutput, TInput> {
    parse(input: unknown): TOutput;
    safeParse(input: unknown): SafeParseResult<TOutput>;
    parseAsync(input: unknown): Promise<TOutput>;
    safeParseAsync(input: unknown): Promise<SafeParseResult<TOutput>>;
    spa(input: unknown): Promise<SafeParseResult<TOutput>>;
    describe(description: string): this;
    meta(meta: Record<string, unknown>): this;
    optional(): Schema<TOutput | undefined, TInput | undefined>;
    nullable(): Schema<TOutput | null, TInput | null>;
    nullish(): Schema<TOutput | null | undefined, TInput | null | undefined>;
    default(defaultValue: TOutput | (() => TOutput)): Schema<TOutput, TInput | undefined>;
    prefault(defaultValue: TOutput | (() => TOutput)): Schema<TOutput, TInput | undefined>;
    catch(catchValue: TOutput | ((ctx: { error: unknown; input: unknown }) => TOutput)): Schema<TOutput, TInput>;
    or<TOrOut, TOrIn>(schema: Schema<TOrOut, TOrIn>): Schema<TOutput | TOrOut, TInput | TOrIn>;
    and<TAndOut, TAndIn>(schema: Schema<TAndOut, TAndIn>): Schema<TOutput & TAndOut, TInput & TAndIn>;
    refine(predicate: (value: TOutput) => boolean | Promise<boolean>, message?: string | ((value: TOutput) => string)): Schema<TOutput, TInput>;
    superRefine(refinement: (value: TOutput, ctx: RefinementContext) => void | Promise<void>): Schema<TOutput, TInput>;
    check(validator: (value: TOutput) => boolean, message?: string): Schema<TOutput, TInput>;
    transform<TNewOutput>(transformer: (value: TOutput) => TNewOutput | Promise<TNewOutput>): Schema<TNewOutput, TInput>;
    pipe<TFinalOutput>(nextSchema: Schema<TFinalOutput, TOutput>): Schema<TFinalOutput, TInput>;
  }
}

Schema.prototype.parse = function <TOutput, TInput>(this: Schema<TOutput, TInput>, input: unknown): TOutput {
  const ctx = createParseContext(false);
  const result = this._parse(input, ctx);
  if (isPromise(result)) {
    throw new Error(
      "Synchronous parse encountered an asynchronous operation. Use .parseAsync() instead."
    );
  }
  if (!result.success) throw new ValidationError(result.issues);
  return result.data;
};

Schema.prototype.safeParse = function <TOutput, TInput>(this: Schema<TOutput, TInput>, input: unknown): SafeParseResult<TOutput> {
  try {
    const data = this.parse(input);
    return { success: true, data };
  } catch (err) {
    if (err instanceof ValidationError) return { success: false, error: err };
    throw err;
  }
};

Schema.prototype.parseAsync = async function <TOutput, TInput>(this: Schema<TOutput, TInput>, input: unknown): Promise<TOutput> {
  const ctx = createParseContext(true);
  const resOrPromise = this._parse(input, ctx);
  const result = isPromise(resOrPromise) ? await resOrPromise : resOrPromise;
  if (!result.success) throw new ValidationError(result.issues);
  return result.data;
};

Schema.prototype.safeParseAsync = async function <TOutput, TInput>(this: Schema<TOutput, TInput>, input: unknown): Promise<SafeParseResult<TOutput>> {
  try {
    const data = await this.parseAsync(input);
    return { success: true, data };
  } catch (err) {
    if (err instanceof ValidationError) return { success: false, error: err };
    throw err;
  }
};

Schema.prototype.spa = async function <TOutput, TInput>(this: Schema<TOutput, TInput>, input: unknown): Promise<SafeParseResult<TOutput>> {
  return this.safeParseAsync(input);
};

Schema.prototype.describe = function <TOutput, TInput>(this: Schema<TOutput, TInput>, description: string) {
  (this.metadata as { description: string }).description = description;
  return this;
};

Schema.prototype.meta = function <TOutput, TInput>(this: Schema<TOutput, TInput>, meta: Record<string, unknown>) {
  (this.metadata as { meta: Record<string, unknown> }).meta = Object.freeze({
    ...(this.metadata.meta ?? {}),
    ...meta,
  });
  return this;
};

Schema.prototype.optional = function <TOutput, TInput>(this: Schema<TOutput, TInput>) {
  const Ctor = getCtor<typeof OptionalSchema>("OptionalSchema");
  return new Ctor(this);
};

Schema.prototype.nullable = function <TOutput, TInput>(this: Schema<TOutput, TInput>) {
  const Ctor = getCtor<typeof NullableSchema>("NullableSchema");
  return new Ctor(this);
};

Schema.prototype.nullish = function <TOutput, TInput>(this: Schema<TOutput, TInput>) {
  const NullableCtor = getCtor<typeof NullableSchema>("NullableSchema");
  const OptionalCtor = getCtor<typeof OptionalSchema>("OptionalSchema");
  return new NullableCtor(new OptionalCtor(this));
};

Schema.prototype.default = function <TOutput, TInput>(this: Schema<TOutput, TInput>, defaultValue: TOutput | (() => TOutput)) {
  const Ctor = getCtor<typeof DefaultSchema>("DefaultSchema");
  return new Ctor(this, defaultValue);
};

Schema.prototype.prefault = function <TOutput, TInput>(this: Schema<TOutput, TInput>, defaultValue: TOutput | (() => TOutput)) {
  const Ctor = getCtor<typeof PrefaultSchema>("PrefaultSchema");
  return new Ctor(this, defaultValue);
};

Schema.prototype.catch = function <TOutput, TInput>(this: Schema<TOutput, TInput>, catchValue: TOutput | ((ctx: { error: unknown; input: unknown }) => TOutput)) {
  const Ctor = getCtor<typeof CatchSchema>("CatchSchema");
  return new Ctor(this, catchValue);
};

Schema.prototype.or = function <TOutput, TInput, TOrOut, TOrIn>(this: Schema<TOutput, TInput>, schema: Schema<TOrOut, TOrIn>) {
  const Ctor = getCtor<typeof UnionSchema>("UnionSchema");
  return new Ctor([this, schema]) as any;
};

Schema.prototype.and = function <TOutput, TInput, TAndOut, TAndIn>(this: Schema<TOutput, TInput>, schema: Schema<TAndOut, TAndIn>) {
  const Ctor = getCtor<typeof IntersectionSchema>("IntersectionSchema");
  return new Ctor(this, schema) as any;
};

Schema.prototype.refine = function <TOutput, TInput>(this: Schema<TOutput, TInput>, predicate: (value: TOutput) => boolean | Promise<boolean>, message = "Invalid input") {
  const Ctor = getCtor<typeof RefinementSchema>("RefinementSchema");
  return new Ctor(this, predicate, message);
};

Schema.prototype.superRefine = function <TOutput, TInput>(this: Schema<TOutput, TInput>, refinement: (value: TOutput, ctx: RefinementContext) => void | Promise<void>) {
  const Ctor = getCtor<typeof SuperRefineSchema>("SuperRefineSchema");
  return new Ctor(this, refinement);
};

Schema.prototype.check = function <TOutput, TInput>(this: Schema<TOutput, TInput>, validator: (value: TOutput) => boolean, message = "Check failed") {
  return this.refine(validator, message);
};

Schema.prototype.transform = function <TOutput, TInput, TNewOutput>(this: Schema<TOutput, TInput>, transformer: (value: TOutput) => TNewOutput | Promise<TNewOutput>) {
  const Ctor = getCtor<typeof TransformSchema>("TransformSchema");
  return new Ctor(this, transformer);
};

Schema.prototype.pipe = function <TOutput, TInput, TFinalOutput>(this: Schema<TOutput, TInput>, nextSchema: Schema<TFinalOutput, TOutput>) {
  const Ctor = getCtor<typeof PipeSchema>("PipeSchema");
  return new Ctor(this, nextSchema);
};
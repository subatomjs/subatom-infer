import {
  createParseContext,
  type ParseContext,
  type IssuePayload,
} from "./context.js";
import { ValidationError } from "./error.js";
import {
  isPromise,
  type DynamicParseReturnType,
  type SafeParseResult,
} from "./result.js";

export const schemaRegistry: Record<string, any> = {};

export function registerSchemaConstructor(name: string, ctor: any): void {
  schemaRegistry[name] = ctor;
}

export function getCtor<T>(name: string): T {
  const ctor = schemaRegistry[name];
  if (!ctor) {
    throw new Error(
      `Schema constructor '${name}' is not registered in schemaRegistry.`
    );
  }
  return ctor;
}

export interface SchemaMetadata {
  description?: string;
  meta?: Record<string, unknown>;
}

export interface RefinementContext {
  addIssue: (issue: IssuePayload) => void;
  readonly path: readonly (string | number | symbol)[];
}

export abstract class Schema<TOutput, TInput = TOutput> {
  declare readonly _output: TOutput;
  declare readonly _input: TInput;
  readonly metadata: SchemaMetadata = {};

  abstract _parse(
    input: unknown,
    ctx: ParseContext
  ): DynamicParseReturnType<TOutput>;

  parse(input: unknown): TOutput {
    const ctx = createParseContext(false);
    const result = this._parse(input, ctx);
    if (isPromise(result)) {
      throw new Error(
        "Synchronous parse encountered an asynchronous operation. Use .parseAsync() instead."
      );
    }
    if (!result.success) throw new ValidationError(result.issues);
    return result.data;
  }

  safeParse(input: unknown): SafeParseResult<TOutput> {
    try {
      const data = this.parse(input);
      return { success: true, data };
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err };
      throw err;
    }
  }

  async parseAsync(input: unknown): Promise<TOutput> {
    const ctx = createParseContext(true);
    const resOrPromise = this._parse(input, ctx);
    const result = isPromise(resOrPromise) ? await resOrPromise : resOrPromise;
    if (!result.success) throw new ValidationError(result.issues);
    return result.data;
  }

  async safeParseAsync(input: unknown): Promise<SafeParseResult<TOutput>> {
    try {
      const data = await this.parseAsync(input);
      return { success: true, data };
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err };
      throw err;
    }
  }

  async spa(input: unknown): Promise<SafeParseResult<TOutput>> {
    return this.safeParseAsync(input);
  }

  describe(description: string): this {
    (this.metadata as { description: string }).description = description;
    return this;
  }

  meta(meta: Record<string, unknown>): this {
    (this.metadata as { meta: Record<string, unknown> }).meta = Object.freeze({
      ...(this.metadata.meta ?? {}),
      ...meta,
    });
    return this;
  }

  optional(): Schema<TOutput | undefined, TInput | undefined> {
    const Ctor = getCtor<any>("OptionalSchema");
    return new Ctor(this);
  }

  nullable(): Schema<TOutput | null, TInput | null> {
    const Ctor = getCtor<any>("NullableSchema");
    return new Ctor(this);
  }

  nullish(): Schema<TOutput | null | undefined, TInput | null | undefined> {
    const NullableCtor = getCtor<any>("NullableSchema");
    const OptionalCtor = getCtor<any>("OptionalSchema");
    return new NullableCtor(new OptionalCtor(this));
  }

  default(
    defaultValue: TOutput | (() => TOutput)
  ): Schema<TOutput, TInput | undefined> {
    const Ctor = getCtor<any>("DefaultSchema");
    return new Ctor(this, defaultValue);
  }

  prefault(
    defaultValue: TOutput | (() => TOutput)
  ): Schema<TOutput, TInput | undefined> {
    const Ctor = getCtor<any>("PrefaultSchema");
    return new Ctor(this, defaultValue);
  }

  catch(
    catchValue:
      | TOutput
      | ((ctx: { error: unknown; input: unknown }) => TOutput)
  ): Schema<TOutput, TInput> {
    const Ctor = getCtor<any>("CatchSchema");
    return new Ctor(this, catchValue);
  }

  or<TOrOut, TOrIn>(
    schema: Schema<TOrOut, TOrIn>
  ): Schema<TOutput | TOrOut, TInput | TOrIn> {
    const Ctor = getCtor<any>("UnionSchema");
    return new Ctor([this, schema]);
  }

  and<TAndOut, TAndIn>(
    schema: Schema<TAndOut, TAndIn>
  ): Schema<TOutput & TAndOut, TInput & TAndIn> {
    const Ctor = getCtor<any>("IntersectionSchema");
    return new Ctor(this, schema);
  }

  refine(
    predicate: (value: TOutput) => boolean | Promise<boolean>,
    message: string | ((value: TOutput) => string) = "Invalid input"
  ): Schema<TOutput, TInput> {
    const Ctor = getCtor<any>("RefinementSchema");
    return new Ctor(this, predicate, message);
  }

  superRefine(
    refinement: (
      value: TOutput,
      ctx: RefinementContext
    ) => void | Promise<void>
  ): Schema<TOutput, TInput> {
    const Ctor = getCtor<any>("SuperRefineSchema");
    return new Ctor(this, refinement);
  }

  check(
    validator: (value: TOutput) => boolean,
    message = "Check failed"
  ): Schema<TOutput, TInput> {
    return this.refine(validator, message);
  }

  transform<TNewOutput>(
    transformer: (value: TOutput) => TNewOutput | Promise<TNewOutput>
  ): Schema<TNewOutput, TInput> {
    const Ctor = getCtor<any>("TransformSchema");
    return new Ctor(this, transformer);
  }

  pipe<TFinalOutput>(
    nextSchema: Schema<TFinalOutput, TOutput>
  ): Schema<TFinalOutput, TInput> {
    const Ctor = getCtor<any>("PipeSchema");
    return new Ctor(this, nextSchema);
  }
}
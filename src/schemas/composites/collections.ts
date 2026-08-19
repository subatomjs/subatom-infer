import { Schema } from "../../core/schema-base.js";
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
  DynamicParseReturnType,
} from "../../core/result.js";

// --- Array Schema ---
export class ArraySchema<TItemOutput, TItemInput> extends Schema<
  TItemOutput[],
  TItemInput[]
> {
  constructor(readonly elementSchema: Schema<TItemOutput, TItemInput>) {
    super();
  }

  _parse(
    input: unknown,
    ctx: ParseContext,
  ): DynamicParseReturnType<TItemOutput[]> {
    if (!Array.isArray(input)) {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "array",
        received: typeof input,
        message: `Expected array, received ${typeof input}`,
      });
      return makeFailure(ctx.issues);
    }

    const output: TItemOutput[] = new Array(input.length);
    const promises: Promise<void>[] = [];
    let hasAsync = false;

    for (let i = 0; i < input.length; i++) {
      const itemCtx = nestContext(ctx, i);
      const res = this.elementSchema._parse(input[i], itemCtx);

      if (isPromise(res)) {
        hasAsync = true;
        const index = i;
        promises.push(
          res.then((r: ParseResult<TItemOutput>) => {
            if (r.success) output[index] = r.data;
          }),
        );
      } else if (res.success) {
        output[i] = res.data;
      }
    }

    if (hasAsync) {
      if (!ctx.async)
        throw new Error(
          "Synchronous parse encountered asynchronous item parsing.",
        );
      return Promise.all(promises).then(() =>
        ctx.issues.length > 0 ? makeFailure(ctx.issues) : makeSuccess(output),
      );
    }

    return ctx.issues.length > 0
      ? makeFailure(ctx.issues)
      : makeSuccess(output);
  }

  min(length: number, message?: string): Schema<TItemOutput[], TItemInput[]> {
    return this.refine(
      (val) => val.length >= length,
      message ?? `Array must contain at least ${length} element(s)`,
    );
  }

  max(length: number, message?: string): Schema<TItemOutput[], TItemInput[]> {
    return this.refine(
      (val) => val.length <= length,
      message ?? `Array must contain at most ${length} element(s)`,
    );
  }

  length(
    length: number,
    message?: string,
  ): Schema<TItemOutput[], TItemInput[]> {
    return this.refine(
      (val) => val.length === length,
      message ?? `Array must contain exactly ${length} element(s)`,
    );
  }

  nonempty(
    message = "Array cannot be empty",
  ): Schema<[TItemOutput, ...TItemOutput[]], [TItemInput, ...TItemInput[]]> {
    return this.refine((val) => val.length > 0, message) as unknown as Schema<
      [TItemOutput, ...TItemOutput[]],
      [TItemInput, ...TItemInput[]]
    >;
  }
}

// --- Tuple Schema ---
export type TupleSchemas = readonly [
  Schema<unknown, unknown>,
  ...Schema<unknown, unknown>[],
];

export type InferTupleOutput<T extends TupleSchemas> = {
  [K in keyof T]: T[K] extends Schema<infer O, any> ? O : never;
};

export type InferTupleInput<T extends TupleSchemas> = {
  [K in keyof T]: T[K] extends Schema<any, infer I> ? I : never;
};

export class TupleSchema<TItems extends TupleSchemas> extends Schema<
  InferTupleOutput<TItems>,
  InferTupleInput<TItems>
> {
  constructor(readonly schemas: TItems) {
    super();
  }

  _parse(
    input: unknown,
    ctx: ParseContext,
  ): DynamicParseReturnType<InferTupleOutput<TItems>> {
    if (!Array.isArray(input)) {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "tuple",
        received: typeof input,
        message: `Expected tuple array, received ${typeof input}`,
      });
      return makeFailure(ctx.issues);
    }

    if (input.length !== this.schemas.length) {
      addIssue(ctx, {
        code: "too_small",
        minimum: this.schemas.length,
        inclusive: true,
        origin: "array",
        message: `Expected tuple with ${this.schemas.length} elements, received ${input.length}`,
      });
      return makeFailure(ctx.issues);
    }

    const output: unknown[] = new Array(this.schemas.length);
    const promises: Promise<void>[] = [];
    let hasAsync = false;

    for (let i = 0; i < this.schemas.length; i++) {
      const fieldSchema = this.schemas[i]!;
      const itemCtx = nestContext(ctx, i);
      const res = fieldSchema._parse(input[i], itemCtx);

      if (isPromise(res)) {
        hasAsync = true;
        const index = i;
        promises.push(
          res.then((r: ParseResult<unknown>) => {
            if (r.success) output[index] = r.data;
          }),
        );
      } else if (res.success) {
        output[i] = res.data;
      }
    }

    if (hasAsync) {
      if (!ctx.async)
        throw new Error("Synchronous parse encountered async tuple elements.");
      return Promise.all(promises).then(() =>
        ctx.issues.length > 0
          ? makeFailure(ctx.issues)
          : makeSuccess(output as InferTupleOutput<TItems>),
      );
    }

    return ctx.issues.length > 0
      ? makeFailure(ctx.issues)
      : makeSuccess(output as InferTupleOutput<TItems>);
  }
}

// --- Record Schema ---
export class RecordSchema<
  TKey extends Schema<string | number | symbol, string | number | symbol>,
  TValue extends Schema<unknown, unknown>,
> extends Schema<
  Record<TKey["_output"], TValue["_output"]>,
  Record<TKey["_input"], TValue["_input"]>
> {
  constructor(
    readonly keySchema: TKey,
    readonly valueSchema: TValue,
  ) {
    super();
  }

  _parse(
    input: unknown,
    ctx: ParseContext,
  ): DynamicParseReturnType<Record<TKey["_output"], TValue["_output"]>> {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "record",
        received:
          input === null
            ? "null"
            : Array.isArray(input)
              ? "array"
              : typeof input,
        message: "Expected object record",
      });
      return makeFailure(ctx.issues);
    }

    const output: Record<string | number | symbol, unknown> = {};
    const inputObj = input as Record<string | number | symbol, unknown>;
    const promises: Promise<void>[] = [];
    let hasAsync = false;

    for (const key of Object.keys(inputObj)) {
      const keyCtx = nestContext(ctx, key);
      const parsedKeyRes = this.keySchema._parse(key, keyCtx);
      const parsedValRes = this.valueSchema._parse(inputObj[key], keyCtx);

      if (isPromise(parsedKeyRes) || isPromise(parsedValRes)) {
        hasAsync = true;
        promises.push(
          Promise.all([
            Promise.resolve(parsedKeyRes),
            Promise.resolve(parsedValRes),
          ]).then(([kRes, vRes]) => {
            if (kRes.success && vRes.success) {
              output[kRes.data] = vRes.data;
            }
          }),
        );
      } else if (parsedKeyRes.success && parsedValRes.success) {
        output[parsedKeyRes.data] = parsedValRes.data;
      }
    }

    if (hasAsync) {
      if (!ctx.async)
        throw new Error("Synchronous parse encountered async record elements.");
      return Promise.all(promises).then(() =>
        ctx.issues.length > 0
          ? makeFailure(ctx.issues)
          : makeSuccess(output as Record<TKey["_output"], TValue["_output"]>),
      );
    }

    return ctx.issues.length > 0
      ? makeFailure(ctx.issues)
      : makeSuccess(output as Record<TKey["_output"], TValue["_output"]>);
  }
}

// --- Set Schema ---
export class SetSchema<TItemOutput, TItemInput> extends Schema<
  Set<TItemOutput>,
  Set<TItemInput>
> {
  constructor(readonly valueSchema: Schema<TItemOutput, TItemInput>) {
    super();
  }

  _parse(
    input: unknown,
    ctx: ParseContext,
  ): DynamicParseReturnType<Set<TItemOutput>> {
    if (!(input instanceof Set)) {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "Set",
        received: typeof input,
        message: "Expected Set instance",
      });
      return makeFailure(ctx.issues);
    }

    const output = new Set<TItemOutput>();
    const promises: Promise<void>[] = [];
    let hasAsync = false;
    let index = 0;

    for (const item of input) {
      const itemCtx = nestContext(ctx, index++);
      const res = this.valueSchema._parse(item, itemCtx);

      if (isPromise(res)) {
        hasAsync = true;
        promises.push(
          res.then((r: ParseResult<TItemOutput>) => {
            if (r.success) output.add(r.data);
          }),
        );
      } else if (res.success) {
        output.add(res.data);
      }
    }

    if (hasAsync) {
      if (!ctx.async)
        throw new Error("Synchronous parse encountered async Set values.");
      return Promise.all(promises).then(() =>
        ctx.issues.length > 0 ? makeFailure(ctx.issues) : makeSuccess(output),
      );
    }

    return ctx.issues.length > 0
      ? makeFailure(ctx.issues)
      : makeSuccess(output);
  }
}

// --- Map Schema ---
export class MapSchema<
  TKeyOutput,
  TKeyInput,
  TValOutput,
  TValInput,
> extends Schema<Map<TKeyOutput, TValOutput>, Map<TKeyInput, TValInput>> {
  constructor(
    readonly keySchema: Schema<TKeyOutput, TKeyInput>,
    readonly valueSchema: Schema<TValOutput, TValInput>,
  ) {
    super();
  }

  _parse(
    input: unknown,
    ctx: ParseContext,
  ): DynamicParseReturnType<Map<TKeyOutput, TValOutput>> {
    if (!(input instanceof Map)) {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "Map",
        received: typeof input,
        message: "Expected Map instance",
      });
      return makeFailure(ctx.issues);
    }

    const output = new Map<TKeyOutput, TValOutput>();
    const promises: Promise<void>[] = [];
    let hasAsync = false;
    let index = 0;

    for (const [k, v] of input.entries()) {
      const keyCtx = nestContext(ctx, `${index}.key`);
      const valCtx = nestContext(ctx, `${index}.val`);
      index++;

      const kRes = this.keySchema._parse(k, keyCtx);
      const vRes = this.valueSchema._parse(v, valCtx);

      if (isPromise(kRes) || isPromise(vRes)) {
        hasAsync = true;
        promises.push(
          Promise.all([Promise.resolve(kRes), Promise.resolve(vRes)]).then(
            ([keyParsed, valParsed]) => {
              if (keyParsed.success && valParsed.success) {
                output.set(keyParsed.data, valParsed.data);
              }
            },
          ),
        );
      } else if (kRes.success && vRes.success) {
        output.set(kRes.data, vRes.data);
      }
    }

    if (hasAsync) {
      if (!ctx.async)
        throw new Error("Synchronous parse encountered async Map elements.");
      return Promise.all(promises).then(() =>
        ctx.issues.length > 0 ? makeFailure(ctx.issues) : makeSuccess(output),
      );
    }

    return ctx.issues.length > 0
      ? makeFailure(ctx.issues)
      : makeSuccess(output);
  }
}

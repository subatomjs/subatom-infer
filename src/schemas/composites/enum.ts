/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */

import { Schema } from "../../core/schema.js";
import { addIssue, type ParseContext } from "../../core/context.js";
import { makeFailure, makeSuccess, type DynamicParseReturnType } from "../../core/result.js";

export class EnumSchema<const TValues extends readonly [string, ...string[]]> extends Schema<
  TValues[number],
  TValues[number]
> {
  readonly options: readonly string[];
  readonly enum: Readonly<{ [K in TValues[number]]: K }>;

  constructor(values: TValues) {
    super();
    this.options = Object.freeze([...values]);
    const enumObj = {} as { [K in TValues[number]]: K };
    for (const val of values) {
      (enumObj as Record<string, string>)[val] = val;
    }
    this.enum = Object.freeze(enumObj);
  }

  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<TValues[number]> {
    if (typeof input !== "string" || !this.options.includes(input)) {
      addIssue(ctx, {
        code: "invalid_value",
        expected: this.options.join(" | "),
        received: input,
        message: `Expected ${this.options.map((v) => `"${v}"`).join(" | ")}, received ${JSON.stringify(input)}`,
      });
      return makeFailure(ctx.issues);
    }
    return makeSuccess(input as TValues[number]);
  }

  extract<TExtract extends TValues[number]>(
    values: readonly TExtract[]
  ): EnumSchema<[TExtract, ...TExtract[]]> {
    const valid = values.filter((v) => this.options.includes(v));
    if (valid.length === 0) {
      throw new Error("EnumSchema.extract requires at least one valid matching option.");
    }
    return new EnumSchema(valid as unknown as [TExtract, ...TExtract[]]);
  }

  exclude<TExclude extends TValues[number]>(
    values: readonly TExclude[]
  ): EnumSchema<[Exclude<TValues[number], TExclude>, ...Array<Exclude<TValues[number], TExclude>>]> {
    const filtered = this.options.filter((opt) => !values.includes(opt as TExclude));
    if (filtered.length === 0) {
      throw new Error("EnumSchema.exclude cannot result in an empty options array.");
    }
    return new EnumSchema(
      filtered as unknown as [Exclude<TValues[number], TExclude>, ...Array<Exclude<TValues[number], TExclude>>]
    );
  }
}

export class NativeEnumSchema<TEnum extends Record<string, string | number>> extends Schema<
  TEnum[keyof TEnum],
  TEnum[keyof TEnum]
> {
  readonly enumValues: ReadonlySet<unknown>;

  constructor(readonly nativeEnum: TEnum) {
    super();
    const keys = Object.keys(nativeEnum);
    const numericKeys = new Set(keys.filter((k) => !Number.isNaN(Number(k))));

    const values = keys
      .filter((k) => !numericKeys.has(k))
      .map((k) => nativeEnum[k]);

    this.enumValues = new Set(values);
  }

  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<TEnum[keyof TEnum]> {
    if (!this.enumValues.has(input)) {
      addIssue(ctx, {
        code: "invalid_value",
        received: input,
        message: `Invalid enum value: received ${JSON.stringify(input)}`,
      });
      return makeFailure(ctx.issues);
    }
    return makeSuccess(input as TEnum[keyof TEnum]);
  }
}
import type { Schema } from "./schema.js";

export type Infer<S extends Schema<unknown, unknown>> = S["_output"];
export type Output<S extends Schema<unknown, unknown>> = S["_output"];
export type Input<S extends Schema<unknown, unknown>> = S["_input"];

export type AsyncSafeReturnType<T> = T | Promise<T>;
export type DeepReadonly<T> = T extends any | boolean | number | string | bigint | symbol | null | undefined
  ? T
  : T extends ReadonlyMap<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends ReadonlySet<infer M>
  ? ReadonlySet<DeepReadonly<M>>
  : T extends readonly [...infer Elements]
  ? { readonly [Key in keyof Elements]: DeepReadonly<Elements[Key]> }
  : T extends object
  ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
  : unknown;
import type { Schema } from "./schema.js";

export type Infer<S extends Schema<unknown, unknown>> = S["_output"];
export type Output<S extends Schema<unknown, unknown>> = S["_output"];
export type Input<S extends Schema<unknown, unknown>> = S["_input"];
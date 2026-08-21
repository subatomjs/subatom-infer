/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */


import { schemaRegistry } from "../../core/schema.js";
import { OptionalSchema } from "./optional.js";
import { NullableSchema } from "./nullable.js";
import { DefaultSchema } from "./default.js";
import { PrefaultSchema } from "./prefault.js";
import { RefinementSchema } from "./refine.js";
import { SuperRefineSchema } from "./super-refine.js";
import { TransformSchema } from "./transform.js";
import {
  CatchSchema,
  PipeSchema,
  ReadonlySchema,
} from "./all-modifiers.js";

// Bridge registry binding for fluent method chaining without circular dependencies
schemaRegistry.optional = (schema) => new OptionalSchema(schema);
schemaRegistry.nullable = (schema) => new NullableSchema(schema);
schemaRegistry.default = (schema, def) => new DefaultSchema(schema, def);
schemaRegistry.prefault = (schema, def) => new PrefaultSchema(schema, def);
schemaRegistry.refine = (schema, check, msg) => new RefinementSchema(schema, check, msg);
schemaRegistry.superRefine = (schema, refiner) => new SuperRefineSchema(schema, refiner);
schemaRegistry.transform = (schema, fn) => new TransformSchema(schema, fn);
schemaRegistry.pipe = (first, second) => new PipeSchema(first, second);
schemaRegistry.readonly = (schema) => new ReadonlySchema(schema);
schemaRegistry.catch = (schema, fallback) => new CatchSchema(schema, fallback);

export * from "./optional.js";
export * from "./nullable.js";
export * from "./default.js";
export * from "./prefault.js";
export * from "./refine.js";
export * from "./super-refine.js";
export * from "./transform.js";
export * from "./all-modifiers.js";
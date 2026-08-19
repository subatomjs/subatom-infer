import { registerSchemaConstructor } from "./schema-base.js";
import { OptionalSchema } from "../schemas/modifiers/optional.js";
import { NullableSchema } from "../schemas/modifiers/nullable.js";
import { DefaultSchema } from "../schemas/modifiers/default.js";
import { PrefaultSchema } from "../schemas/modifiers/prefault.js";
import {
  CatchSchema,
  PipeSchema,
  TransformSchema,
  RefinementSchema,
  SuperRefineSchema,
} from "../schemas/modifiers/extended-modifiers.js";
import {
  UnionSchema,
  IntersectionSchema,
} from "../schemas/composites/combinators.js";

registerSchemaConstructor("OptionalSchema", OptionalSchema);
registerSchemaConstructor("NullableSchema", NullableSchema);
registerSchemaConstructor("DefaultSchema", DefaultSchema);
registerSchemaConstructor("PrefaultSchema", PrefaultSchema);
registerSchemaConstructor("CatchSchema", CatchSchema);
registerSchemaConstructor("PipeSchema", PipeSchema);
registerSchemaConstructor("TransformSchema", TransformSchema);
registerSchemaConstructor("RefinementSchema", RefinementSchema);
registerSchemaConstructor("SuperRefineSchema", SuperRefineSchema);
registerSchemaConstructor("UnionSchema", UnionSchema);
registerSchemaConstructor("IntersectionSchema", IntersectionSchema);
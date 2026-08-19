# Subatom Infer

> Production-grade, high-performance runtime validation, strict schema transformation, and compile-time type inference engine powered by the unified `infer` namespace.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D24.0.0-339933?logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-%3E%3D5.0%20Strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Module](https://img.shields.io/badge/Format-Pure%20ESM%20%2F%20CJS-orange)](https://github.com/)

---

## 📖 Documentation

[![Documentation](https://img.shields.io/badge/docs-infer.subatomjs.dev-38bdf8?style=for-the-badge&logo=googledocs&logoColor=white)](https://infer.subatomjs.dev/)


For complete guides, API references, and interactive examples, visit the [Official Documentation](https://infer.subatomjs.dev/).

---
## ⚡ Highlights & Key Architecture

- **🚀 Dual Pipeline Execution:** Synchronous execution throws when encountering async refinements/transforms; asynchronous pipeline evaluates fully non-blocking.
- **🛡️ Bidirectional Typing (`Schema<Out, In>`):** Clearly separates runtime input preconditions from validated/transformed output types.
- **🔒 Immutable AST & Memory Safety:** Zero runtime side-effects, full prototype poisoning protection, and thread-safe schema composition.
- **🎯 Discriminated Diagnostic AST:** Exact JSON/array paths, key-level issue grouping, and structured error trees (`.flatten()`, `.format()`, `.prettifyError()`).
- **📦 Zero-Bloat ESM & CJS:** Full dual export compatibility with strict TypeScript declarations.

---

## 📦 Installation

```bash
npm install subatom-infer
# or
pnpm add subatom-infer
# or
yarn add subatom-infer
# or
bun add subatom-infer
```

---

## 🚀 Quick Start

```typescript
import { infer, type Infer } from "subatom-infer";

// 1. Define schema
const UserSchema = infer.object({
  id: infer.uuid(),
  username: infer.string().min(3).max(30),
  email: infer.string().email(),
  role: infer.enum(["admin", "user", "guest"]).default("user"),
  profile: infer.object({
    bio: infer.string().max(200).optional(),
    avatarUrl: infer.string().url().optional(),
  }),
});

// 2. Infer static TypeScript types
export type User = Infer<typeof UserSchema>;

// 3. Validate synchronously
const result = UserSchema.safeParse({
  id: "123e4567-e89b-12d3-a456-426614174000",
  username: "alex",
  email: "alex@example.com",
});

if (result.success) {
  console.log("Valid user:", result.data);
} else {
  console.error("Validation error:", result.error.flatten());
}
```

---

## 📖 Complete API Reference

### 1. Execution & Parsing Engine

Every schema instance exposes synchronous and asynchronous parsing methods:

| Method | Return Signature | Description & Behavior |
| :--- | :--- | :--- |
| `.parse(input)` | `TOutput` | Synchronous. Throws `ValidationError` on failure or if async nodes exist. |
| `.safeParse(input)` | `SafeParseResult<TOutput>` | Returns `{ success: true, data }` or `{ success: false, error }`. |
| `.parseAsync(input)` | `Promise<TOutput>` | Asynchronous. Awaits all async transformations, refinements, and sub-schemas. |
| `.safeParseAsync(input)` / `.spa()` | `Promise<SafeParseResult>` | Non-throwing async promise resolving to a discriminated union. |

---

### 2. Primitives & String Validation

#### Primitives & Unit Types

```typescript
infer.string();
infer.number();
infer.boolean();
infer.bigint();
infer.date();
infer.symbol();
infer.undefined();
infer.null();
infer.void();
infer.any();
infer.unknown();
infer.never();
infer.nan();
infer.literal("ACTIVE");
```

#### String Format & Rule Modifiers

```typescript
infer.string()
  .min(5)
  .max(100)
  .length(20)
  .email()
  .url()
  .httpUrl()
  .uuid()
  .guid()
  .cuid()
  .cuid2()
  .ulid()
  .nanoid()
  .regex(/^[a-z]+$/i)
  .startsWith("sub_")
  .endsWith("_node")
  .includes("@")
  .datetime()
  .date()
  .time()
  .duration()
  .ipv4()
  .ipv6()
  .hostname()
  .trim()
  .toLowerCase()
  .toUpperCase();
```

---

### 3. Numbers & BigInt Constraints

#### Number Constraints

```typescript
infer.number()
  .int()          // Integer only
  .safe()         // Safe IEEE-754 range (Number.MIN_SAFE_INTEGER to MAX_SAFE_INTEGER)
  .finite()       // Rejects Infinity / -Infinity
  .positive()     // > 0
  .nonnegative()  // >= 0
  .negative()     // < 0
  .nonpositive()  // <= 0
  .min(1)
  .max(100)
  .gte(1)
  .lte(100)
  .gt(0)
  .lt(101)
  .multipleOf(5);
```

#### BigInt Constraints

```typescript
infer.bigint()
  .positive()     // > 0n
  .nonnegative()  // >= 0n
  .negative()     // < 0n
  .nonpositive()  // <= 0n
  .min(100n)
  .max(1000000n)
  .multipleOf(10n);
```

---

### 4. Objects & Structural Policies

```typescript
const BaseUser = infer.object({
  id: infer.uuid(),
  name: infer.string(),
  role: infer.enum(["admin", "user"]),
});

// Structural Policies
const StrictUser   = BaseUser.strict();                 // Rejects unrecognized keys
const LooseUser    = BaseUser.passthrough();            // Retains unknown keys
const StrippedUser = BaseUser.strip();                  // Default: strips extra properties
const CatchallUser = BaseUser.catchall(infer.boolean()); // Validates unknown keys against schema

// Schema Composition & Shape Utilities
const ExtendedUser = BaseUser.extend({ email: infer.string().email() });
const MergedSchema = BaseUser.merge(infer.object({ traceId: infer.string() }));
const PickedName   = BaseUser.pick({ name: true });
const OmittedId    = BaseUser.omit({ id: true });
const PartialUser  = BaseUser.partial();                // All fields optional
const RequiredUser = PartialUser.required();            // All fields required
const DeepOptional = BaseUser.deepPartial();            // Recursively optional
const UserKeysEnum = BaseUser.keyof();                  // Returns EnumSchema of keys
```

---

### 5. Collections & Data Structures

```typescript
// Arrays & Tuples
const Tags = infer.array(infer.string()).min(1).max(10).nonempty();
const Coord = infer.tuple([
  infer.number(),
  infer.number(),
  infer.number().optional(),
]);

// Dynamic Key-Value Records
const Config = infer.record(
  infer.string().min(2),
  infer.number()
);

// Native JavaScript Sets & Maps
const Roles = infer.set(infer.string()).min(1);
const Lookup = infer.map(infer.uuid(), infer.boolean());
```

---

### 6. Combinators & Special Schemas

```typescript
// Tagged / Discriminated Union (O(1) fast branch dispatch)
const EventSchema = infer.discriminatedUnion("type", [
  infer.object({ type: infer.literal("click"), x: infer.number(), y: infer.number() }),
  infer.object({ type: infer.literal("hover"), element: infer.string() }),
]);

// Untagged Union & Intersection
const StrOrNum = infer.union([infer.string(), infer.number()]);
const Combined = infer.intersection(SchemaA, SchemaB);

// Functions & Promises
const AddFn = infer.function(
  infer.tuple([infer.number(), infer.number()]),
  infer.number()
);
const AsyncStr = infer.promise(infer.string());

// File & Binary Blobs
const Upload = infer.file().max(5_000_000).mime("image/png");

// Recursive & Self-Referencing Types
type Category = { name: string; subcategories?: Category[] };
const CategorySchema: infer.Schema<Category> = infer.lazy(() =>
  infer.object({
    name: infer.string(),
    subcategories: infer.array(CategorySchema).optional(),
  })
);
```

---

### 7. Modifiers, Pipelines, Refinements & Codecs

```typescript
// 1. Modifiers, Defaults & Fallbacks
const OptStr       = infer.string().optional();                 // string | undefined
const NullableNum  = infer.number().nullable();                 // number | null
const NullishDate  = infer.date().nullish();                    // Date | null | undefined
const DefaultPort  = infer.number().default(3000);              // Defaults to 3000 if undefined
const PrefaultVal  = infer.string().prefault("anonymous");
const SafeValue    = infer.number().catch(0);                   // Fallback value on failure

// 2. Transformations & Pipelines
const StrToDate = infer.string().transform((val) => new Date(val));
const PipedValidation = infer.pipe(
  infer.string().min(2),
  infer.string().email()
);

// 3. Custom Refinements & Context Diagnostics
const PasswordCheck = infer.object({
  password: infer.string().min(8),
  confirm: infer.string(),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirm) {
    ctx.addIssue({
      code: "custom",
      path: ["confirm"],
      message: "Passwords must match",
    });
  }
});

// 4. Nominal Branding & Bidirectional Codecs
const UserIdSchema = infer.brand(infer.uuid(), "UserId");

const Base64Codec = infer.codec(
  infer.string().transform((str) => Buffer.from(str, "base64")),
  (buf: Buffer) => buf.toString("base64")
);
```

---

### 8. Primitive Coercion Engine

Subatom Infer provides built-in coercion schemas to handle query strings, form data, and dynamic inputs automatically:

```typescript
infer.coerce.string();
infer.coerce.number().int();
infer.coerce.boolean();
infer.coerce.bigint();
infer.coerce.date();

// Example: Coercing request query params
const parsedCount = infer.coerce.number().parse("42"); // 42 (number)
const parsedDate = infer.coerce.date().parse("2026-08-19T00:00:00Z"); // Date instance
```

---

### 9. Error Formatting & Diagnostics

When validation fails, `ValidationError` provides rich structural formatting utilities:

```typescript
try {
  UserSchema.parse(badInput);
} catch (err) {
  // Flat field & form error dictionary
  const flatErrors = err.flatten();
  console.log(flatErrors);
  // Output: { formErrors: [], fieldErrors: { username: ["Too short"], email: ["Invalid email"] } }

  // Nested hierarchical error tree
  const formattedTree = err.format();
  console.log(formattedTree);

  // Clean, ANSI-colored CLI diagnostic output
  console.log(err.prettifyError());
}
```

---

## 🛠️ TypeScript Support & Type Inference

Subatom Infer extracts exact compile-time types from your runtime schemas:

```typescript
import { infer, type Infer, type Input, type Output } from "subatom-infer";

const ProductSchema = infer.object({
  id: infer.string().uuid(),
  price: infer.coerce.number(),
  createdAt: infer.string().transform((s) => new Date(s)),
});

// Output type (after transformations & coercions)
type Product = Infer<typeof ProductSchema>;
// Equivalent to: Output<typeof ProductSchema>
// { id: string; price: number; createdAt: Date; }

// Input type (pre-transformation input requirement)
type ProductInput = Input<typeof ProductSchema>;
// { id: string; price: string | number; createdAt: string; }
```

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.


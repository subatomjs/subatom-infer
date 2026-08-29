# subatom-infer

> **Production-grade runtime validation and type-inference library for Node.js and TypeScript.**

[![npm version](https://img.shields.io/npm/v/subatom-infer.svg)](https://www.npmjs.com/package/subatom-infer)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen.svg)](https://nodejs.org)

`subatom-infer` is an ultra-fast, modern, composable schema validation and static type inference engine built from the ground up for modern JavaScript and TypeScript runtimes. It provides a developer-friendly API similar to Zod with first-class support for synchronous and asynchronous validations, deep transformations, file and multipart payload checks, rich error structures, and tight integration with the **Subatom Framework ecosystem**.

---

## 🌟 Key Features

- 🔒 **End-to-End Type Safety**: Automatically infer TypeScript types directly from schema definitions using `Infer<typeof schema>`.
- ⚡ **Dual Engine (Sync & Async)**: High-speed synchronous validation path with automated runtime branching for asynchronous refinements, transformations, and promises.
- 📁 **First-Class File & Upload Validation**: Built-in support for single (`infer.file()`) and multi-file (`infer.files()`) checks (MIME types, extensions, size thresholds, and storage drivers).
- 🧩 **Comprehensive Modifier Pipeline**: Fluent schema chaining with `.optional()`, `.nullable()`, `.nullish()`, `.default()`, `.prefault()`, `.transform()`, `.refine()`, `.superRefine()`, `.pipe()`, `.catch()`, and `.readonly()`.
- 🛡️ **Defensive Schema Security**: Automatic prototype pollution defenses (`__proto__`, `constructor` key suppression) across objects, records, and merged composites.
- 🎯 **Advanced Diagnostics & Error Formatting**: Clean, actionable error reporting with structured path trails, nested tree structures (`error.format()`), flat forms (`error.flatten()`), and terminal-friendly visual output (`error.prettifyError()`).
- 🔄 **Coercion Suite**: Clean coercion layer (`infer.coerce.*`) for forms, query strings, headers, and request params.
- 📦 **Dual Module Formats**: Native ESM (`.mjs`) and CommonJS (`.cjs`) distributions with zero external runtime dependencies.

---

## 📦 Installation

```bash
# npm
npm install subatom-infer

# pnpm
pnpm add subatom-infer

# yarn
yarn add subatom-infer

# bun
bun add subatom-infer
```

> **Requirements:** Node.js `>= 24.0.0` or any modern JavaScript runtime (Bun, Deno, modern browsers).

---

## 🚀 Quick Start

```typescript
import { infer, type Infer } from "subatom-infer";

// 1. Define schema
const UserSchema = infer.object({
  id: infer.string().uuid(),
  username: infer.string().min(3).max(20).toLowerCase().trim(),
  email: infer.string().email(),
  age: infer.number().int().min(18).optional(),
  role: infer.enum(["admin", "member", "guest"]).default("member"),
  tags: infer.array(infer.string()).min(1),
  createdAt: infer.coerce.date().default(() => new Date()),
});

// 2. Infer TypeScript Type
export type User = Infer<typeof UserSchema>;
/*
type User = {
  id: string;
  username: string;
  email: string;
  age?: number | undefined;
  role: "admin" | "member" | "guest";
  tags: string[];
  createdAt: Date;
}
*/

// 3. Validate data
const payload = {
  id: "c8e265c2-6447-4e94-813e-f18c6670e3ec",
  username: "  AlexDev ",
  email: "alex@example.com",
  tags: ["typescript", "subatom"],
};

// Safe parsing (does not throw)
const result = UserSchema.safeParse(payload);

if (result.success) {
  console.log("Validated User:", result.data);
  // result.data.username === "alexdev" (trimmed & lowercased)
  // result.data.role === "member" (default applied)
  // result.data.createdAt === Date instance
} else {
  console.error("Validation failed:", result.error.format());
}
```

---

## 📖 API Reference

### 1. Primitives & Literals

```typescript
import { infer } from "subatom-infer";

// Strings
infer.string();
infer.string().min(3);
infer.string().max(255);
infer.string().length(10);
infer.string().email();
infer.string().url();
infer.string().httpUrl();
infer.string().uuid();
infer.string().cuid();
infer.string().cuid2();
infer.string().ulid();
infer.string().nanoid();
infer.string().regex(/^[A-Z0-9]+$/);
infer.string().startsWith("sub_");
infer.string().endsWith(".json");
infer.string().includes("atom");
infer.string().datetime();      // ISO 8601 DateTime
infer.string().date();          // YYYY-MM-DD
infer.string().time();          // HH:MM:SS
infer.string().duration();      // ISO 8601 Duration
infer.string().ipv4();
infer.string().ipv6();
infer.string().hostname();
infer.string().trim();
infer.string().toLowerCase();
infer.string().toUpperCase();
infer.string().normalize("NFC");

// Numbers
infer.number();
infer.number().min(0);
infer.number().max(100);
infer.number().gt(0);
infer.number().gte(0);
infer.number().lt(100);
infer.number().lte(100);
infer.number().int();
infer.number().safe();          // IEEE-754 safe integer
infer.number().finite();
infer.number().positive();
infer.number().nonnegative();
infer.number().negative();
infer.number().nonpositive();
infer.number().multipleOf(5);

// BigInt
infer.bigint();
infer.bigint().min(0n);
infer.bigint().max(1000000000000000000n);
infer.bigint().positive();
infer.bigint().nonnegative();
infer.bigint().multipleOf(2n);

// Other Primitives
infer.boolean();
infer.date();
infer.date().min(new Date("2026-01-01"));
infer.date().max(new Date("2030-12-31"));

// Unit & Top/Bottom Types
infer.literal("ACTIVE");
infer.literal(42);
infer.null();
infer.undefined();
infer.void();
infer.any();
infer.unknown();
infer.never();
infer.symbol();
infer.nan();

// Shortcuts
infer.email();
infer.uuid();
```

---

### 2. Type Coercion (`infer.coerce`)

Coerce incoming primitives from strings, HTTP query params, headers, or form fields before validating:

```typescript
const QuerySchema = infer.object({
  page: infer.coerce.number().int().min(1).default(1),
  limit: infer.coerce.number().int().max(100).default(20),
  active: infer.coerce.boolean(),          // Parses "false", "0", "off" -> false
  timestamp: infer.coerce.date(),          // Parses ISO string/epoch -> Date
  offset: infer.coerce.bigint().default(0n),
  label: infer.coerce.string(),
});
```

---

### 3. Objects & Records

```typescript
const BaseUser = infer.object({
  name: infer.string(),
  email: infer.string().email(),
});

// Object Policies:
// Default is "strip" (removes undeclared keys)
BaseUser.strip();

// Disallow unknown keys
const StrictUser = BaseUser.strict();
// Or directly:
infer.strictObject({ key: infer.string() });

// Preserve unknown keys
const LooseUser = BaseUser.passthrough();
// Or directly:
infer.passthroughObject({ key: infer.string() });

// Accept unknown keys conforming to a schema
const CustomUser = BaseUser.catchall(infer.number());

// Object Combinators & Manipulations
const Extended = BaseUser.extend({ age: infer.number() });
const Merged = BaseUser.merge(infer.object({ role: infer.string() }));
const Picked = BaseUser.pick({ name: true });
const Omitted = BaseUser.omit({ email: true });
const PartialUser = BaseUser.partial();
const RequiredUser = PartialUser.required();
const DeepPartialUser = BaseUser.deepPartial();
const KeyEnum = BaseUser.keyof(); // EnumSchema<["name", "email"]>

// Records (Key-Value Dictionaries)
const ScoreMap = infer.record(infer.string(), infer.number());
```

---

### 4. Collections & Combinators

```typescript
// Arrays
infer.array(infer.string()).min(1).max(10).nonempty();

// Tuples
infer.tuple([infer.string(), infer.number(), infer.boolean().optional()]);

// Sets
infer.set(infer.string()).min(1).max(5).size(3).nonempty();

// Maps
infer.map(infer.string(), infer.number());

// String Enums
const RoleEnum = infer.enum(["ADMIN", "MODERATOR", "USER"]);
RoleEnum.enum.ADMIN; // "ADMIN"
const SubRole = RoleEnum.extract(["ADMIN", "MODERATOR"]);
const NonAdmin = RoleEnum.exclude(["ADMIN"]);

// Native Enums
enum Status {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
}
infer.nativeEnum(Status);

// Unions
infer.union([infer.string(), infer.number()]);
// Or varargs:
infer.union(infer.string(), infer.number(), infer.boolean());

// Discriminated Unions (Optimized O(1) branch lookups)
const ActionSchema = infer.discriminatedUnion("type", [
  infer.object({ type: infer.literal("create"), payload: infer.string() }),
  infer.object({ type: infer.literal("delete"), id: infer.number() }),
]);

// Intersections
infer.intersection(
  infer.object({ a: infer.string() }),
  infer.object({ b: infer.number() })
);

// Recursive / Lazy Schemas
interface Category {
  name: string;
  subcategories: Category[];
}

const CategorySchema: infer.Schema<Category> = infer.lazy(() =>
  infer.object({
    name: infer.string(),
    subcategories: infer.array(CategorySchema),
  })
);
```

---

### 5. File & Upload Validation

`subatom-infer` provides dedicated file schemas tailored for Node.js multipart handlers and web upload pipelines.

#### Single File (`infer.file()`)

```typescript
const AvatarUpload = infer.file()
  .mime(["image/png", "image/jpeg", "image/webp"])
  .extension(["png", "jpg", "jpeg", "webp"])
  .min(1024)            // 1 KB minimum
  .max(5 * 1024 * 1024) // 5 MB maximum
  .storage("memory");   // "memory" | "disk"
```

#### Multiple Files (`infer.files()`)

```typescript
const DocumentBatch = infer.files()
  .min(1)
  .max(5)
  .mime(["application/pdf", "image/*"])
  .extension(["pdf", "png", "jpg"])
  .minEach(512)
  .maxEach(10 * 1024 * 1024); // 10 MB per file
```

---

### 6. Modifiers, Transformations & Pipelines

```typescript
// Optional, Nullable, Nullish
infer.string().optional(); // string | undefined
infer.string().nullable(); // string | null
infer.string().nullish();  // string | null | undefined

// Defaults & Prefaults
infer.string().default("default_val");
infer.string().default(() => generateDefault());
infer.string().prefault("initial"); // Injected before inner validation

// Transforms
const ToInt = infer.string().transform((val) => parseInt(val, 10));

// Pipelines
const TrimmedEmail = infer.pipe(
  infer.string().trim(),
  infer.string().email()
);

// Fallbacks (Catch)
const SafeCount = infer.number().catch(0);
const ContextCatch = infer.number().catch(({ error, input }) => 0);

// Readonly
const ImmutableConfig = infer.object({ host: infer.string() }).readonly();

// Nominal / Branded Types
type UserId = Brand<string, "UserId">;
const UserIdSchema = infer.brand(infer.string().uuid(), "UserId");

// Bidirectional Codecs
const Base64Codec = infer.codec(
  infer.string().transform((str) => Buffer.from(str, "base64").toString("utf-8")),
  (output) => Buffer.from(output, "utf-8").toString("base64")
);
```

---

### 7. Refinements & Custom Validation

```typescript
// Basic Refinement
const PasswordSchema = infer.string().min(8).refine(
  (val) => /[A-Z]/.test(val) && /[0-9]/.test(val),
  "Password must contain at least one uppercase letter and one number"
);

// SuperRefine (Add multiple contextual issues with specific paths)
const PasswordConfirmation = infer.object({
  password: infer.string().min(8),
  confirm: infer.string(),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirm) {
    ctx.addIssue({
      code: "custom",
      path: ["confirm"],
      message: "Passwords do not match",
    });
  }
});

// Asynchronous Custom Validation
const UniqueEmail = infer.string().email().refine(
  async (email) => {
    const exists = await checkEmailInDb(email);
    return !exists;
  },
  "Email is already in use"
);

// Custom Schema Top-Level
const CustomValidator = infer.custom<string>(
  (val) => typeof val === "string" && val.startsWith("0x"),
  "Must be a hex string"
);
```

---

### 8. Functions & Promises

```typescript
// Function argument & return validation
const AddFunction = infer.function(
  infer.tuple([infer.number(), infer.number()]),
  infer.number()
);

const validatedAdd = AddFunction.parse((a: number, b: number) => a + b);
validatedAdd(2, 3); // 5

// Promise schema
const AsyncDataSchema = infer.promise(infer.object({ id: infer.number() }));
const parsedPromise = await AsyncDataSchema.parseAsync(Promise.resolve({ id: 10 }));
```

---

## ⚡ Execution Methods & Error Handling

Schemas provide both synchronous and asynchronous execution paths:

| Method | Behavior | Return Type |
|---|---|---|
| `.parse(data)` | Synchronously parses data; throws `ValidationError` on failure. | `TOutput` |
| `.parseAsync(data)` | Asynchronously parses data; throws `ValidationError` on failure. | `Promise<TOutput>` |
| `.safeParse(data)` | Synchronous non-throwing result. | `ParseResult<TOutput>` |
| `.safeParseAsync(data)` / `.spa(data)` | Asynchronous non-throwing result. | `Promise<ParseResult<TOutput>>` |

### Error Diagnostic Methods

```typescript
const result = UserSchema.safeParse(badData);

if (!result.success) {
  const error = result.error;

  // 1. Hierarchical object representation
  console.log(error.format());
  /*
  {
    _errors: [],
    username: { _errors: ['String must contain at least 3 character(s)'] },
    email: { _errors: ['Invalid email address'] }
  }
  */

  // 2. Flattened form and field error arrays
  console.log(error.flatten());
  /*
  {
    formErrors: [],
    fieldErrors: {
      username: ['String must contain at least 3 character(s)'],
      email: ['Invalid email address']
    }
  }
  */

  // 3. Formatted CLI / terminal string
  console.log(error.prettifyError());
  /*
  Validation Errors:
    → [username] (too_small): String must contain at least 3 character(s)
    → [email] (invalid_format): Invalid email address
  */
}
```

---

## 🏗️ TypeScript Type Inference Utilities

```typescript
import {
  infer,
  type Infer,
  type Output,
  type Input,
  type DeepReadonly,
  type SchemaReadonly,
} from "subatom-infer";

const UserSchema = infer.object({
  id: infer.string(),
  joinedAt: infer.coerce.date(),
  role: infer.string().default("user"),
});

// Infer output type
type UserOutput = Infer<typeof UserSchema>; // or Output<typeof UserSchema>

// Infer input type (before defaults/coercions/transforms)
type UserInput = Input<typeof UserSchema>;
```

---

## 🌐 Subatom Framework Ecosystem

`subatom-infer` is designed as the core schema validator and type inference engine for the **Subatom Framework** ecosystem. It provides direct, zero-overhead validation for HTTP request bodies, route parameters, headers, and form multipart uploads across Subatom microservices, REST APIs, and event-driven applications.

---

## 📄 License & Maintainer

- **Official Documentation**: [https://infer.subatomjs.dev](https://infer.subatomjs.dev)
- **Maintainer**: Kunal Chandra Das ([kunal@subatomjs.dev](mailto:kunal@subatomjs.dev))
- **Framework Ecosystem**: Built with reference to the [Subatom Framework](https://infer.subatomjs.dev)
- **License**: Released under the [MIT License](LICENSE).

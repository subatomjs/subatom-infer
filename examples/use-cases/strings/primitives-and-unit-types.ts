// tests/primitives-and-unit-types.test.ts
import { infer } from "subatom-infer";

const PrimitivesSchema = infer.object({
  str: infer.string(),
  num: infer.number(),
  bool: infer.boolean(),
  big: infer.bigint(),
  d: infer.date(),
  sym: infer.symbol(),
  undef: infer.undefined(),
  nil: infer.null(),
  v: infer.void(),
  status: infer.literal("ACTIVE"),
  nanVal: infer.nan(),
  anyVal: infer.any(),
  unkVal: infer.unknown(),
});



// Case 1: Happy Path with exact matching primitive types
const symKey = Symbol("token");
const validPayload = {
  str: "hello",
  num: 42,
  bool: true,
  big: 9007199254740991n,
  d: new Date("2026-01-01T00:00:00Z"),
  sym: symKey,
  undef: undefined,
  nil: null,
  v: undefined,
  status: "ACTIVE",
  nanVal: Number.NaN,
  anyVal: { arbitrary: 123 },
  unkVal: ["anything"],
};

const result1 = PrimitivesSchema.safeParse(validPayload);
console.log("Primitives Happy Path:", result1.success);
/* Expected Output:
Primitives Happy Path: true
*/

// Case 2: Literal Mismatch & Invalid Null/Undefined
const invalidPayload = {
  ...validPayload,
  status: "INACTIVE", // Fails literal check
  nil: "not-null",    // Fails null check
};

const result2 = PrimitivesSchema.safeParse(invalidPayload);
console.log("Literal & Null failure issues:", (result2 as any).issues);
/* Expected Output:
[
  {
    code: 'invalid_literal', // or 'invalid_type'
    expected: 'ACTIVE',
    path: ['status'],
    message: 'Expected ACTIVE, received INACTIVE'
  },
  {
    code: 'invalid_type',
    expected: 'null',
    received: 'string',
    path: ['nil'],
    message: 'Expected null, received string'
  }
]
*/

// Case 3: infer.never() Rejection
const NeverSchema = infer.object({
  prohibited: infer.never(),
});

const resultNever = NeverSchema.safeParse({ prohibited: "present" });
console.log("Never check:", resultNever.success === false);
/* Expected Output:
Never check: true
*/
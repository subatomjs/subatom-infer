// tests/bigint-validation.test.ts
import { infer} from "subatom-infer";

// 1. Schema Definition
const BigIntSchema = infer.object({
  boundedBig: infer.bigint().min(100n).max(1_000_000n),
  steppedBig: infer.bigint().multipleOf(10n),
  posBig: infer.bigint().positive(),
  nonNegBig: infer.bigint().nonnegative(),
  negBig: infer.bigint().negative(),
  nonPosBig: infer.bigint().nonpositive(),
});


// Case 1: Valid BigInts (Happy Path)
const validBigInts = {
  boundedBig: 500_000n,
  steppedBig: 100n,
  posBig: 1n,
  nonNegBig: 0n,
  negBig: -1n,
  nonPosBig: 0n,
};

const result1 = BigIntSchema.safeParse(validBigInts);
console.log("BigInt Valid Check:", result1.success);
console.log("BigInt Data:", (result1 as any).data);
/* Expected Output:
BigInt Valid Check: true
BigInt Data: [Object: null prototype] {
  boundedBig: 500000n,
  steppedBig: 100n,
  posBig: 1n,
  nonNegBig: 0n,
  negBig: -1n,
  nonPosBig: 0n
}
*/

// Case 2: Boundary and Constraint Violations
const invalidBigInts = {
  boundedBig: 50n,   // Fails .min(100n)
  steppedBig: 23n,   // Fails .multipleOf(10n)
  posBig: 0n,        // Fails .positive() (0n is not > 0n)
  nonNegBig: -5n,    // Fails .nonnegative()
  negBig: 0n,        // Fails .negative() (0n is not < 0n)
  nonPosBig: 10n,    // Fails .nonpositive()
};

const result2 = BigIntSchema.safeParse(invalidBigInts);
console.log("BigInt Violations Count:", (result2 as any).issues?.length);
console.log("BigInt Issues:", (result2 as any).issues?.map((i:any) => ({ path: i.path, message: i.message })));
/* Expected Output:
BigInt Violations Count: 6
BigInt Issues: [
  { path: [ 'boundedBig' ], message: 'BigInt must be greater than or equal to 100' },
  { path: [ 'steppedBig' ], message: 'BigInt must be a multiple of 10' },
  { path: [ 'posBig' ], message: 'BigInt must be greater than 0' },
  { path: [ 'nonNegBig' ], message: 'BigInt must be greater than or equal to 0' },
  { path: [ 'negBig' ], message: 'BigInt must be less than 0' },
  { path: [ 'nonPosBig' ], message: 'BigInt must be less than or equal to 0' }
]
*/

// Case 3: Type Mismatch (Number passed instead of BigInt)
const wrongTypePayload = {
  ...validBigInts,
  boundedBig: 500000, // standard number, not BigInt literal
};

const result3 = BigIntSchema.safeParse(wrongTypePayload);
console.log("BigInt Type Mismatch Detected:", (result3 as any).issues?.[0]?.code === "invalid_type");
/* Expected Output:
BigInt Type Mismatch Detected: true
*/
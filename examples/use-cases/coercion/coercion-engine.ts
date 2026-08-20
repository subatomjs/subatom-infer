// tests/coercion-engine.test.ts
import { infer } from "subatom-infer";

// 1. Coercion Schema Definitions
const CoercedProfile = infer.object({
  id: infer.coerce.string(),
  age: infer.coerce.number().int().positive(),
  isActive: infer.coerce.boolean(),
  balance: infer.coerce.bigint().nonnegative(),
  joinedAt: infer.coerce.date(),
});


// Case 1: Automatic Coercion of String-Encoded Inputs (Happy Path)
const rawFormInput = {
  id: 12345,                     // number coerced to string
  age: "28",                     // string coerced to number
  isActive: "true",              // string coerced to boolean
  balance: "900000",             // string coerced to bigint
  joinedAt: "2026-06-01T12:00:00Z", // string coerced to Date
};

const result1 = CoercedProfile.safeParse(rawFormInput);
console.log("Coercion Happy Path Success:", result1.success);
console.log("Coerced Age Type:", typeof (result1 as any).data?.age, (result1 as any).data?.age);
console.log("Coerced Date Instance:", (result1 as any).data?.joinedAt instanceof Date);
console.log("Coerced BigInt Value:", (result1 as any).data?.balance);
/* Expected Output:
Coercion Happy Path Success: true
Coerced Age Type: number 28
Coerced Date Instance: true
Coerced BigInt Value: 900000n
*/

// Case 2: Coercion Failure Handling (Invalid un-coercible formats)
const invalidCoerceInput = {
  id: true,
  age: "not-a-number",          // Cannot be coerced to int
  isActive: "maybe",            // Invalid boolean representation
  balance: "abc",               // Invalid bigint format
  joinedAt: "invalid-date-str", // Invalid date
};

const result2 = CoercedProfile.safeParse(invalidCoerceInput);
console.log("Coercion Failure Detected:", result2.success === false);
console.log("Coercion Error Count:", (result2 as any).issues?.length);
/* Expected Output:
Coercion Failure Detected: true
Coercion Error Count: 5
*/
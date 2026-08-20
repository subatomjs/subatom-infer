// tests/schema-constraints.test.ts
import { infer, type Infer } from "subatom-infer";
import { assertSuccess, assertFailure } from "./assert-helpers.js";

const AccountSchema = infer.object({
  id: infer.uuid(),
  handle: infer.string().min(4),
});

type Account = Infer<typeof AccountSchema>;

// Case 1: Valid payload with extra keys (tests prototype & key stripping)
const rawInput = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  handle: "developer",
  internalSecret: "strip-me",
};

const res1 = AccountSchema.safeParse(rawInput);
const parsed = assertSuccess<Account>(res1 as any);

console.log("Passed Valid:", parsed.handle === "developer");
console.log("Extra key stripped:", (parsed as any).internalSecret === undefined);

// Case 2: Boundary check for .min(4) on string
const res2 = AccountSchema.safeParse({
  id: "550e8400-e29b-41d4-a716-446655440000",
  handle: "dev", // length 3 -> should fail
});

const issues2 = assertFailure(res2 as any);
console.log("Boundary failure detected:", issues2);
/* Expected Output:
issues: [
  {
    code: 'too_small', // or custom constraint error
    path: ['handle'],
    message: '...'
  }
]
*/

// Case 3: Invalid UUID structure
const res3 = AccountSchema.safeParse({
  id: "12345-invalid-uuid",
  handle: "validHandle",
});

const issues3 = assertFailure(res3 as any);
console.log("UUID failure detected:", issues3[0]?.path[0] === "id");
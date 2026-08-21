/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */



import { infer } from "subatom-infer";

const BaseUser = infer.object({
  id: infer.uuid(),
  name: infer.string(),
  role: infer.enum(["admin", "user"]),
});

// Structural Extensions & Merges
const ExtendedUser = BaseUser.extend({ email: infer.string().email() });
const MergedSchema = BaseUser.merge(infer.object({ traceId: infer.string() }));



// Case 1: Extended Schema Validation
const validExtended = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "Alex",
  role: "user" as const,
  email: "alex@subatom.io",
};

const resultExtended = ExtendedUser.safeParse(validExtended);
console.log("Extend Success:", resultExtended.success);
console.log("Extended Email:", (resultExtended as any).data?.email);
/* Expected Output:
Extend Success: true
Extended Email: 'alex@subatom.io'
*/

// Case 2: Extended Schema with invalid added property
const invalidExtended = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "Alex",
  role: "user" as const,
  email: "not-an-email",
};
const failedExtended = ExtendedUser.safeParse(invalidExtended);
console.log("Extend Failure Detected:", (failedExtended as any).issues?.[0]?.path);
/* Expected Output:
Extend Failure Detected: [ 'email' ]
*/

// Case 3: Merged Schema Validation
const validMerged = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "Alex",
  role: "admin" as const,
  traceId: "trace-xyz-789",
};

const resultMerged = MergedSchema.safeParse(validMerged);
console.log("Merge Success:", resultMerged.success);
console.log("Merged traceId:", (resultMerged as any).data?.traceId);
/* Expected Output:
Merge Success: true
Merged traceId: 'trace-xyz-789'
*/
/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */


import { infer } from "subatom-infer";

// 1. Schema Definition
const OrganizationSchema = infer.object({
  orgId: infer.uuid(),
  name: infer.string().min(2),
  owner: infer.object({
    id: infer.uuid(),
    username: infer.string().min(3),
  }),
});


// 2. Test Cases

// Case A: Valid Nested Object
const validOrg = {
  orgId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  name: "Acme Corp",
  owner: {
    id: "123e4567-e89b-12d3-a456-426614174000",
    username: "founder",
  },
};
const resultA = OrganizationSchema.safeParse(validOrg);
console.log("Case A:", resultA);
/* Expected Output:
{
  success: true,
  data: {
    orgId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    name: "Acme Corp",
    owner: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      username: "founder"
    }
  }
}
*/

// Case B: Nested Property Failure
const invalidNestedOrg = {
  orgId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  name: "Acme Corp",
  owner: {
    id: "invalid-id",
    username: "fo", // fails min(3)
  },
};
const resultB = OrganizationSchema.safeParse(invalidNestedOrg);
console.log("Case B:", resultB);
/* Expected Output:
{
  success: false,
  error: {
    issues: [
      { path: ["owner", "id"], message: "Invalid UUID string" },
      { path: ["owner", "username"], message: "String must contain at least 3 character(s)" }
    ]
  }
}
*/
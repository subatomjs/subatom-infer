/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */



import { infer } from "subatom-infer";
import { assertFailure } from "./assert-helpers.js";

const WorkspaceSchema = infer.object({
  workspaceId: infer.uuid(),
  admin: infer.object({
    id: infer.uuid(),
    role: infer.string().min(2),
  }),
});

// Case A: Missing nested property checks path traversal
const resA = WorkspaceSchema.safeParse({
  workspaceId: "550e8400-e29b-41d4-a716-446655440000",
  admin: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    // 'role' is missing
  },
});

const issuesA = assertFailure(resA as any);
console.log("Nested path tracked:", issuesA[0]?.path);
// Expected path: ['admin', 'role']
// Expected code: 'invalid_type', received: 'undefined'

// Case B: Top-level mismatch on nested object field
const resB = WorkspaceSchema.safeParse({
  workspaceId: "550e8400-e29b-41d4-a716-446655440000",
  admin: "not-an-object",
});

const issuesB = assertFailure(resB as any);
console.log("Admin type failure:", issuesB[0]);
/* Expected Output:
{
  code: 'invalid_type',
  expected: 'object',
  received: 'string',
  path: ['admin']
}
*/
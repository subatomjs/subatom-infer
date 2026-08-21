/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */



import { infer } from "subatom-infer";

// 1. Schema Definitions
const Roles = infer.set(infer.string()).min(1);
const Lookup = infer.map(infer.uuid(), infer.boolean());

// Case 1: Valid Set Handling
const validRoleSet = new Set(["admin", "editor", "viewer"]);
const resultRoles1 = Roles.safeParse(validRoleSet);
console.log("Valid Set Check:", resultRoles1.success);
console.log(
  "Set Size:",
  (resultRoles1 as any).data instanceof Set
    ? (resultRoles1 as any).data.size
    : 0,
);
/* Expected Output:
Valid Set Check: true
Set Size: 3
*/

// Case 2: Set Min Size Constraint & Non-Set Input
const emptySetResult = Roles.safeParse(new Set());
console.log("Empty Set Rejected:", emptySetResult.success === false);
console.log("Empty Set Issue Code:", (emptySetResult as any).issues?.[0]?.code);

const nonSetResult = Roles.safeParse(["admin"]); // Array passed instead of Set
console.log("Non-Set Input Rejected:", nonSetResult.success === false);
console.log("Non-Set Issue Code:", (nonSetResult as any).issues?.[0]?.code);
/* Expected Output:
Empty Set Rejected: true
Empty Set Issue Code: too_small
Non-Set Input Rejected: true
Non-Set Issue Code: invalid_type
*/

// Case 3: Valid Native Map Handling
const validMap = new Map<string, boolean>();
validMap.set("123e4567-e89b-12d3-a456-426614174000", true);
validMap.set("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", false);

const resultMap1 = Lookup.safeParse(validMap);
console.log("Valid Map Check:", resultMap1.success);
console.log("Map Instance:", (resultMap1 as any).data instanceof Map);
/* Expected Output:
Valid Map Check: true
Map Instance: true
*/

// Case 4: Map Key and Value Violations
const invalidMap = new Map<any, any>();
invalidMap.set("not-a-uuid", true); // Invalid UUID Key
invalidMap.set("123e4567-e89b-12d3-a456-426614174000", "not-a-boolean"); // Invalid Boolean Value

const resultMap2 = Lookup.safeParse(invalidMap);
console.log("Map Violations Caught:", resultMap2.success === false);
console.log("Map Issues Count:", (resultMap2 as any).issues?.length);
/* Expected Output:
Map Violations Caught: true
Map Issues Count: 2
*/

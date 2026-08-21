/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */



import { infer } from "subatom-infer";

// 1. Schema Definitions
const Tags = infer.array(infer.string())
  .min(1)
  .max(10)
  .nonempty();

const Coord = infer.tuple([
  infer.number(),
  infer.number(),
  infer.number().optional(),
]);


// Case 1: Valid Array (Happy Path)
const validTags = ["typescript", "validation", "subatom"];
const resultTags1 = Tags.safeParse(validTags);
console.log("Valid Array Check:", resultTags1.success);
console.log("Array Elements:", (resultTags1 as any).data);
/* Expected Output:
Valid Array Check: true
Array Elements: [ 'typescript', 'validation', 'subatom' ]
*/

// Case 2: Array Boundary Violations (Empty & Exceeds Max)
const emptyTagsResult = Tags.safeParse([]);
console.log("Empty Array Rejected:", emptyTagsResult.success === false);
console.log("Empty Array Issue:", (emptyTagsResult as any).issues?.[0]?.code);

const tooManyTags = Array(11).fill("tag");
const maxTagsResult = Tags.safeParse(tooManyTags);
console.log("Max Array Rejected:", maxTagsResult.success === false);
console.log("Max Array Issue Code:", (maxTagsResult as any).issues?.[0]?.code);
/* Expected Output:
Empty Array Rejected: true
Empty Array Issue: too_small
Max Array Rejected: true
Max Array Issue Code: too_big
*/

// Case 3: Array Item Type Mismatch with Nested Index Path
const invalidItemTags = ["valid", 123, "also-valid"];
const itemFailResult = Tags.safeParse(invalidItemTags);
console.log("Item Type Failure Path:", (itemFailResult as any).issues?.[0]?.path);
/* Expected Output:
Item Type Failure Path: [ 1 ]
*/

// Case 4: Valid Tuples (With and Without Optional Element)
const coord2D = [10.5, 20.2];
const coord3D = [10.5, 20.2, 30.0];

console.log("2D Tuple Check:", Coord.safeParse(coord2D).success);
console.log("3D Tuple Check:", Coord.safeParse(coord3D).success);
/* Expected Output:
2D Tuple Check: true
3D Tuple Check: true
*/

// Case 5: Tuple Positional Mismatch & Length Violations
const invalidTupleType = ["10.5", 20.2]; // string at index 0
const tupleTooLong = [10, 20, 30, 40];   // extra unexpected item

console.log("Tuple Type Fail Path:", (Coord.safeParse(invalidTupleType) as any).issues?.[0]?.path);
console.log("Tuple Overflow Rejected:", Coord.safeParse(tupleTooLong).success === false);
/* Expected Output:
Tuple Type Fail Path: [ 0 ]
Tuple Overflow Rejected: true
*/
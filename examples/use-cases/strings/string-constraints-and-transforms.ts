// tests/string-constraints-and-transforms.test.ts
import { infer } from "subatom-infer";

const ConstraintSchema = infer.object({
  bounded: infer.string().min(5).max(10),
  fixedCode: infer.string().length(6),
  prefixedNode: infer.string().startsWith("sub_").endsWith("_node"),
  mustContain: infer.string().includes("@"),
  pattern: infer.string().regex(/^[a-z]+$/i),
  isoTime: infer.string().time(),
  isoDuration: infer.string().duration(),
  cleanedText: infer.string().trim().toLowerCase(),
});

// Case 1: All Constraints & Transforms Met
const validInputs = {
  bounded: "subatom",              // length 7 (within 5..10)
  fixedCode: "ABCDEF",             // length exactly 6
  prefixedNode: "sub_core_node",   // correct prefix & suffix
  mustContain: "user@admin",       // contains '@'
  pattern: "ValidRegexOnly",       // matches letters only
  isoTime: "14:30:00",             // ISO-8601 time
  isoDuration: "P3Y6M4DT12H30M5S", // ISO-8601 duration
  cleanedText: "   PARSED_VALUE   ",
};

const result1 = ConstraintSchema.safeParse(validInputs);
console.log("Constraints Valid:", result1.success);
console.log("Transformed output:", (result1 as any).data?.cleanedText);
/* Expected Output:
Constraints Valid: true
Transformed output: 'parsed_value'
*/

// Case 2: Min/Max and Prefix Boundary Failures
const invalidInputs = {
  ...validInputs,
  bounded: "abc",                  // Fails min(5)
  fixedCode: "ABC",                // Fails length(6)
  prefixedNode: "main_cluster",    // Fails startsWith & endsWith
  mustContain: "no-at-sign",       // Fails includes("@")
  pattern: "letters_and_123",      // Fails regex
};

const result2 = ConstraintSchema.safeParse(invalidInputs);
console.log("Boundary Failures:", (result2 as any).issues?.map((i:any) => ({ path: i.path, message: i.message })));
/* Expected Output:
Boundary Failures: [
  { path: ['bounded'], message: 'String must contain at least 5 character(s)' },
  { path: ['fixedCode'], message: 'String must contain exactly 6 character(s)' },
  { path: ['prefixedNode'], message: 'String must start with "sub_"' },
  { path: ['mustContain'], message: 'String must include "@"' },
  { path: ['pattern'], message: 'Invalid format' }
]
*/
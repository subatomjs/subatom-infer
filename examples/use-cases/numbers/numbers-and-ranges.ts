/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */


import { infer } from "subatom-infer";

// 1. Schema Definition
const NumberRangeSchema = infer.object({
  score: infer.number().int().min(1).max(100),
  percentage: infer.number().gte(0).lte(100),
  strictlyBetween: infer.number().gt(0).lt(10),
  stepValue: infer.number().multipleOf(5),
  safeCount: infer.number().int().safe(),
  finiteMetric: infer.number().finite(),
});


// Case 1: Valid Inputs (Happy Path)
const validNumbers = {
  score: 42,
  percentage: 100,
  strictlyBetween: 5.5,
  stepValue: 25,
  safeCount: 9007199254740991, // Number.MAX_SAFE_INTEGER
  finiteMetric: 3.14159,
};

const result1 = NumberRangeSchema.safeParse(validNumbers);
console.log("Valid Numbers Check:", result1.success);
console.log("Parsed Data:", (result1 as any).data);
/* Expected Output:
Valid Numbers Check: true
Parsed Data: [Object: null prototype] {
  score: 42,
  percentage: 100,
  strictlyBetween: 5.5,
  stepValue: 25,
  safeCount: 9007199254740991,
  finiteMetric: 3.14159
}
*/

// Case 2: Boundary & Constraint Violations
const invalidNumbers = {
  score: 42.5,                 // Fails .int()
  percentage: 101,             // Fails .lte(100)
  strictlyBetween: 0,          // Fails .gt(0) - boundary test
  stepValue: 12,               // Fails .multipleOf(5)
  safeCount: 9007199254740992, // Fails .safe() (> MAX_SAFE_INTEGER)
  finiteMetric: Number.POSITIVE_INFINITY, // Fails .finite()
};

const result2 = NumberRangeSchema.safeParse(invalidNumbers);
console.log("Boundary Failures Success:", result2.success);
console.log("Issue Paths:", (result2 as any).issues?.map((i:any) => ({ path: i.path, code: i.code, message: i.message })));
/* Expected Output:
Boundary Failures Success: false
Issue Paths: [
  { path: [ 'score' ], code: 'invalid_type', message: 'Expected integer, received float' },
  { path: [ 'percentage' ], code: 'too_big', message: 'Number must be less than or equal to 100' },
  { path: [ 'strictlyBetween' ], code: 'too_small', message: 'Number must be greater than 0' },
  { path: [ 'stepValue' ], code: 'not_multiple_of', message: 'Number must be a multiple of 5' },
  { path: [ 'safeCount' ], code: 'not_safe', message: 'Number must be within safe integer range' },
  { path: [ 'finiteMetric' ], code: 'not_finite', message: 'Number must be finite' }
]
*/
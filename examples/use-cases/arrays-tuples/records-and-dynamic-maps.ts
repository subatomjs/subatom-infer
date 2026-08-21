/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */



import { infer } from "subatom-infer";

// 1. Schema Definition
const Config = infer.record(
  infer.string().min(2),
  infer.number()
);



// Case 1: Valid Record
const validConfig = {
  port: 8080,
  timeout: 3000,
  retries: 3,
};

const result1 = Config.safeParse(validConfig);
console.log("Valid Record Check:", result1.success);
console.log("Parsed Record:", (result1 as any).data);
/* Expected Output:
Valid Record Check: true
Parsed Record: [Object: null prototype] { port: 8080, timeout: 3000, retries: 3 }
*/

// Case 2: Record Value Type Violation
const invalidValueConfig = {
  port: 8080,
  timeout: "3000", // Fails number validation
};

const result2 = Config.safeParse(invalidValueConfig);
console.log("Value Failure Detected:", result2.success === false);
console.log("Value Failure Path:", (result2 as any).issues?.[0]?.path);
/* Expected Output:
Value Failure Detected: true
Value Failure Path: [ 'timeout' ]
*/

// Case 3: Record Key Constraint Violation (.min(2))
const invalidKeyConfig = {
  q: 1, // Key length < 2
};

const result3 = Config.safeParse(invalidKeyConfig);
console.log("Key Constraint Failure:", result3.success === false);
console.log("Key Error Issue:", (result3 as any).issues?.[0]);
/* Expected Output:
Key Constraint Failure: true
Key Error Issue: {
  code: 'too_small',
  minimum: 2,
  inclusive: true,
  origin: 'string',
  message: 'String must contain at least 2 character(s)',
  path: [ 'q' ]
}
*/
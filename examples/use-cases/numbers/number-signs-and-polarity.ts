// tests/number-signs-and-polarity.test.ts
import { infer } from "subatom-infer";

// 1. Schema Definition
const SignSchema = infer.object({
  pos: infer.number().positive(),       // > 0
  nonNeg: infer.number().nonnegative(), // >= 0
  neg: infer.number().negative(),       // < 0
  nonPos: infer.number().nonpositive(), // <= 0
});



// Case 1: Valid zero and sign boundary handling
const validSigns = {
  pos: 0.001,
  nonNeg: 0,    // 0 is valid for non-negative
  neg: -0.001,
  nonPos: 0,    // 0 is valid for non-positive
};

const result1 = SignSchema.safeParse(validSigns);
console.log("Valid Signs Check:", result1.success);
/* Expected Output:
Valid Signs Check: true
*/

// Case 2: Zero boundary violations against strict positive/negative
const invalidZeroSigns = {
  pos: 0,       // Fails .positive() (0 is not > 0)
  nonNeg: -1,   // Fails .nonnegative()
  neg: 0,       // Fails .negative() (0 is not < 0)
  nonPos: 1,    // Fails .nonpositive()
};

const result2 = SignSchema.safeParse(invalidZeroSigns);
console.log("Sign Violations Count:", (result2 as any).issues?.length);
console.log("Sign Issues:", (result2 as any).issues?.map((i:any) => ({ path: i.path, message: i.message })));
/* Expected Output:
Sign Violations Count: 4
Sign Issues: [
  { path: [ 'pos' ], message: 'Number must be greater than 0' },
  { path: [ 'nonNeg' ], message: 'Number must be greater than or equal to 0' },
  { path: [ 'neg' ], message: 'Number must be less than 0' },
  { path: [ 'nonPos' ], message: 'Number must be less than or equal to 0' }
]
*/
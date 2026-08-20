// tests/deep-partial-nesting.test.ts
import { infer } from "subatom-infer";

const NestedCompanySchema = infer.object({
  companyId: infer.uuid(),
  metadata: infer.object({
    established: infer.number(),
    founder: infer.object({
      id: infer.uuid(),
      name: infer.string(),
    }),
  }),
});

const DeepOptionalCompany = NestedCompanySchema.deepPartial();


// Case 1: Empty Root Object passes deep partial
const emptyRes = DeepOptionalCompany.safeParse({});
console.log("Deep Partial Empty Object:", emptyRes.success);
/* Expected Output:
Deep Partial Empty Object: true
*/

// Case 2: Partially supplied nested properties
const partiallySupplied = DeepOptionalCompany.safeParse({
  metadata: {
    founder: {
      name: "Founder Name", // id omitted inside deeply nested object
    },
  },
});
console.log("Deep Partial Nested Fields:", partiallySupplied.success);
console.log("Nested Name Extracted:", (partiallySupplied as any).data?.metadata?.founder?.name);
/* Expected Output:
Deep Partial Nested Fields: true
Nested Name Extracted: 'Founder Name'
*/

// Case 3: Invalid type in deeply nested field still triggers error
const deepInvalidType = DeepOptionalCompany.safeParse({
  metadata: {
    established: "not-a-number",
  },
});
console.log("Deep Partial Type Violation Caught:", deepInvalidType.success === false);
console.log("Deep Error Path:", (deepInvalidType as any).issues?.[0]?.path);
/* Expected Output:
Deep Partial Type Violation Caught: true
Deep Error Path: [ 'metadata', 'established' ]
*/
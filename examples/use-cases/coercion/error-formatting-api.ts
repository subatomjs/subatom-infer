// tests/error-formatting-api.test.ts
import { infer } from "subatom-infer";

// 1. Nested Schema for Error Inspection
const RegistrationSchema = infer.object({
  username: infer.string().min(5),
  profile: infer.object({
    email: infer.string().email(),
    age: infer.number().min(18),
  }),
});

const invalidPayload = {
  username: "alex", // Too short (min 5)
  profile: {
    email: "not-an-email", // Invalid email format
    age: 16,               // Too small (min 18)
  },
};

// Case 1: Exception-based .parse() combined with formatting methods
try {
  RegistrationSchema.parse(invalidPayload);
} catch (err: any) {
  // Check if formatting methods exist on error instance
  const hasFlatten = typeof err.flatten === "function";
  const hasFormat = typeof err.format === "function";
  const hasPrettify = typeof err.prettifyError === "function";

  console.log("Error Methods Available:", { hasFlatten, hasFormat, hasPrettify });

  if (hasFlatten) {
    const flattened = err.flatten();
    console.log("Flattened Field Errors:", flattened.fieldErrors);
  }

  if (hasFormat) {
    const formattedTree = err.format();
    console.log("Formatted Tree Root Errors:", formattedTree._errors);
    console.log("Formatted Tree Profile Email Errors:", formattedTree.profile?.email?._errors);
  }

  if (hasPrettify) {
    console.log("--- Prettified CLI Output ---");
    console.log(err.prettifyError());
  }
}
/* Expected Output:
Error Methods Available: { hasFlatten: true, hasFormat: true, hasPrettify: true }
Flattened Field Errors: { username: [ 'String must contain at least 5 character(s)' ] }
Formatted Tree Root Errors: []
Formatted Tree Profile Email Errors: [ 'Invalid email' ]
--- Prettified CLI Output ---
[Validation Failed] ...
*/
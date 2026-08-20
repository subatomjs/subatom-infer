// tests/edge-cases-and-coercion.test.ts
import { infer } from "subatom-infer";

const UserSchema = infer.object({
  id: infer.uuid(),
  username: infer.string().min(3),
});

// Case A: Non-object input (null / primitive instead of object)
const resultNull = UserSchema.safeParse(null);
console.log("Case Null:", resultNull);
/* Expected Output:
{
  success: false,
  error: {
    issues: [
      { path: [], message: "Expected object, received null" }
    ]
  }
}
*/

// Case B: Missing required keys completely
const resultMissing = UserSchema.safeParse({});
console.log("Case Missing:", resultMissing);
/* Expected Output:
{
  success: false,
  error: {
    issues: [
      { path: ["id"], message: "Required" },
      { path: ["username"], message: "Required" }
    ]
  }
}
*/

// Case C: Extra unexpected properties (stripping vs pass-through check)
const resultExtra = UserSchema.safeParse({
  id: "123e4567-e89b-12d3-a456-426614174000",
  username: "alex",
  unrecognizedKey: "should be stripped or allowed depending on config",
});
console.log("Case Extra:", resultExtra);
/* Expected Output (Standard strip mode):
{
  success: true,
  data: {
    id: "123e4567-e89b-12d3-a456-426614174000",
    username: "alex"
  }
}
*/
// tests/primitives-and-strings.test.ts
import { infer } from "subatom-infer";

// 1. Schema Definition
const UserProfileSchema = infer.object({
  id: infer.uuid(),
  username: infer.string().min(3),
  email: infer.string(),
  displayName: infer.string().min(1).optional(),
});


// 2. Test Cases

// Case A: Valid Input (Happy Path)
const validData = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  username: "alex",
  email: "alex@example.com",
};
const resultA = UserProfileSchema.safeParse(validData);
console.log("Case A:", resultA);
/* Expected Output:
{
  success: true,
  data: {
    id: "123e4567-e89b-12d3-a456-426614174000",
    username: "alex",
    email: "alex@example.com"
  }
}
*/

// Case B: Invalid UUID format
const invalidUuidData = {
  id: "not-a-valid-uuid",
  username: "alex",
  email: "alex@example.com",
};
const resultB = UserProfileSchema.safeParse(invalidUuidData);
console.log("Case B:", resultB);
/* Expected Output:
{
  success: false,
  error: {
    issues: [
      { path: ["id"], message: "Invalid UUID string" }
    ]
  }
}
*/

// Case C: String min length constraint violation
const tooShortUsername = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  username: "al",
  email: "alex@example.com",
};
const resultC = UserProfileSchema.safeParse(tooShortUsername);
console.log("Case C:", resultC);
/* Expected Output:
{
  success: false,
  error: {
    issues: [
      { path: ["username"], message: "String must contain at least 3 character(s)" }
    ]
  }
}
*/

// Case D: Type mismatch (number instead of string)
const wrongType = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  username: 12345,
  email: "alex@example.com",
};
const resultD = UserProfileSchema.safeParse(wrongType);
console.log("Case D:", resultD);
/* Expected Output:
{
  success: false,
  error: {
    issues: [
      { path: ["username"], message: "Expected string, received number" }
    ]
  }
}
*/
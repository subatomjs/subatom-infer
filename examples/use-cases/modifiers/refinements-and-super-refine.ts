// tests/refinements-and-super-refine.test.ts
import { infer } from "subatom-infer";

// 1. SuperRefine Schema (Cross-field validation)
const PasswordCheck = infer.object({
  password: infer.string().min(8),
  confirm: infer.string(),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirm) {
    ctx.addIssue({ code: "custom", message: "Passwords must match" });
  }
});

// Case 1: Passwords Match (Happy Path)
const validPasswords = {
  password: "securepassword123",
  confirm: "securepassword123",
};
const res1 = PasswordCheck.safeParse(validPasswords);
console.log("Password Match Success:", res1.success);

// Case 2: Passwords Mismatch (Custom Issue Added)
const mismatchedPasswords = {
  password: "securepassword123",
  confirm: "differentpassword",
};
const res2 = PasswordCheck.safeParse(mismatchedPasswords);
console.log("Password Mismatch Caught:", res2.success === false);
console.log("Custom Error Message:", (res2 as any).issues?.[0]?.message);
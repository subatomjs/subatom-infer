/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */


import { infer } from "subatom-infer";

const User = infer.object({
  id: infer.string().uuid(),
  username: infer.string().min(3),
});

// Quick executable script to run these manual test cases:
const testCases = [
  {
    name: "Valid Standard",
    input: { id: "123e4567-e89b-12d3-a456-426614174000", username: "alex" },
  },
  {
    name: "Min Boundary (3)",
    input: { id: "123e4567-e89b-12d3-a456-426614174000", username: "bob" },
  },
  {
    name: "Below Min (2)",
    input: { id: "123e4567-e89b-12d3-a456-426614174000", username: "al" },
  },
  {
    name: "Invalid UUID Chars",
    input: { id: "123g4567-e89b-12d3-a456-426614174000", username: "alex" },
  },
  { name: "Null Root", input: null },
  {
    name: "Array Input",
    input: [{ id: "123e4567-e89b-12d3-a456-426614174000", username: "alex" }],
  },
  {
    name: "Extra Unknown Keys",
    input: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      username: "alex",
      role: "admin",
    },
  },
];

for (const { name, input } of testCases) {
  const res = User.safeParse(input);
  console.log(`[${name}]: success = ${res.success}`);
}

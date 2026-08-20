// tests/string-formats-and-identifiers.test.ts
import { infer } from "subatom-infer";

const IdentifierSchema = infer.object({
  id: infer.string().uuid(),
  cuidVal: infer.string().cuid(),
  cuid2Val: infer.string().cuid2(),
  ulidVal: infer.string().ulid(),
  nanoidVal: infer.string().nanoid(),
  email: infer.string().email(),
  website: infer.string().url(),
  apiEndpoint: infer.string().httpUrl(),
  ipv4: infer.string().ipv4(),
  ipv6: infer.string().ipv6(),
  host: infer.string().hostname(),
});

// Case 1: Valid Identifiers and Formats
const validData = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  cuidVal: "cl9ebq0p0000008l0g9hk0p00",
  cuid2Val: "tz4a98xxat96iws9zmbrgj3a",
  ulidVal: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  nanoidVal: "V1StGXR8_Z5jdHi6B-myT",
  email: "developer@subatom.io",
  website: "https://subatom.io",
  apiEndpoint: "http://api.subatom.io/v1",
  ipv4: "192.168.1.1",
  ipv6: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
  host: "subatom.io",
};

const result1 = IdentifierSchema.safeParse(validData);
console.log("Identifiers Valid:", result1.success);
/* Expected Output:
Identifiers Valid: true
*/

// Case 2: Invalid Format Values
const invalidData = {
  ...validData,
  email: "invalid-email-address",
  apiEndpoint: "ftp://files.subatom.io", // Fails httpUrl check
  ipv4: "999.999.999.999",               // Invalid IPv4
};

const result2 = IdentifierSchema.safeParse(invalidData);
console.log("Format Failures count:", (result2 as any)?.issues?.length);
/* Expected Output:
Format Failures count: 3
*/
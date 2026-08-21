/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */



import { infer } from "subatom-infer";

const BaseUser = infer.object({
  id: infer.uuid(),
  name: infer.string(),
  role: infer.enum(["admin", "user"]),
});

const PickedName = BaseUser.pick({ name: true });
const OmittedId = BaseUser.omit({ id: true });
const PartialUser = BaseUser.partial();
const RequiredUser = PartialUser.required();
const UserKeysEnum = BaseUser.keyof();



// Case 1: Pick - only extracted fields are allowed/required
const pickResult = PickedName.safeParse({ name: "Alex" });
console.log("Pick Valid:", pickResult.success);
console.log("Pick Data:", (pickResult as any).data);
/* Expected Output:
Pick Valid: true
Pick Data: [Object: null prototype] { name: 'Alex' }
*/

// Case 2: Omit - target fields are excluded from schema
const omitResult = OmittedId.safeParse({ name: "Alex", role: "user" });
console.log("Omit Valid:", omitResult.success);
console.log("Omit Missing Id Valid:", (omitResult as any).data?.name === "Alex");
/* Expected Output:
Omit Valid: true
Omit Missing Id Valid: true
*/

// Case 3: Partial - all fields become optional
const partialResult = PartialUser.safeParse({});
console.log("Partial Empty Object Valid:", partialResult.success);
/* Expected Output:
Partial Empty Object Valid: true
*/

// Case 4: Required - restores strict presence after partial()
const requiredResult = RequiredUser.safeParse({ name: "Alex" }); // Missing id and role
console.log("Required Missing Fields Fails:", requiredResult.success === false);
console.log("Required Issue Count:", (requiredResult as any).issues?.length);
/* Expected Output:
Required Missing Fields Fails: true
Required Issue Count: 2
*/

// Case 5: keyof() - Validates keys against schema property names
const validKey = UserKeysEnum.safeParse("name");
const invalidKey = UserKeysEnum.safeParse("nonExistentProperty");
console.log("Keyof Valid Key:", validKey.success);
console.log("Keyof Invalid Key:", invalidKey.success === false);
/* Expected Output:
Keyof Valid Key: true
Keyof Invalid Key: true
*/
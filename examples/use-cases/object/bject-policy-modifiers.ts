// tests/object-policy-modifiers.test.ts
import { infer } from "subatom-infer";

const BaseUser = infer.object({
  id: infer.uuid(),
  name: infer.string(),
  role: infer.enum(["admin", "user"]),
});

const StrictUser = BaseUser.strict();
const LooseUser = BaseUser.passthrough();
const StrippedUser = BaseUser.strip();
const CatchallUser = BaseUser.catchall(infer.boolean());

const validBasePayload = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "Alex",
  role: "admin" as const,
};

// Case 1: Strict Mode - Rejects unrecognized keys
const strictWithExtra = StrictUser.safeParse({
  ...validBasePayload,
  extraField: "not allowed",
});
console.log("Strict Mode Failure:", strictWithExtra.success === false);
console.log("Strict Issue:", (strictWithExtra as any).issues?.[0]?.message);
/* Expected Output:
Strict Mode Failure: true
Strict Issue: Unrecognized key(s) in object: 'extraField'
*/

// Case 2: Passthrough Mode - Retains unrecognized keys
const looseWithExtra = LooseUser.safeParse({
  ...validBasePayload,
  retainedMeta: { trace: "abc-123" },
});
console.log("Passthrough Success:", looseWithExtra.success);
console.log("Passthrough Retained Key:", ((looseWithExtra as any).data as any)?.retainedMeta?.trace);
/* Expected Output:
Passthrough Success: true
Passthrough Retained Key: 'abc-123'
*/

// Case 3: Strip Mode (Default) - Drops unrecognized keys
const strippedWithExtra = StrippedUser.safeParse({
  ...validBasePayload,
  droppedKey: 12345,
});
console.log("Strip Success:", strippedWithExtra.success);
console.log("Dropped Key Present:", "droppedKey" in ((strippedWithExtra as any).data || {}));
/* Expected Output:
Strip Success: true
Dropped Key Present: false
*/

// Case 4: Catchall Mode - Validates additional keys against a specific schema (boolean)
const catchallValid = CatchallUser.safeParse({
  ...validBasePayload,
  isAdminFlag: true,
  isVerified: false,
});
console.log("Catchall Valid Success:", catchallValid.success);

const catchallInvalid = CatchallUser.safeParse({
  ...validBasePayload,
  invalidCatchallKey: "should be boolean",
});
console.log("Catchall Invalid Failure:", catchallInvalid.success === false);
console.log("Catchall Invalid Code:", (catchallInvalid as any).issues?.[0]?.code);
/* Expected Output:
Catchall Valid Success: true
Catchall Invalid Failure: true
Catchall Invalid Code: 'invalid_type'
*/
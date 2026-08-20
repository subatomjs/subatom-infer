// tests/unions-and-intersections.test.ts
import { infer } from "subatom-infer";

// 1. Discriminated Union (Tagged Union)
const EventSchema = infer.discriminatedUnion("type", [
  infer.object({ type: infer.literal("click"), x: infer.number(), y: infer.number() }),
  infer.object({ type: infer.literal("hover"), element: infer.string() }),
  infer.object({ type: infer.literal("scroll"), offset: infer.number().nonnegative() }),
] as [any, any, ...any[]]);
// 2. Standard Union & Intersection Schemas
const StrOrNum = infer.union([infer.string(), infer.number()]);

const HasId = infer.object({ id: infer.uuid() });
const HasTimestamps = infer.object({ createdAt: infer.number() });
const CombinedEntity = infer.intersection(HasId, HasTimestamps);



// Case 1: Discriminated Union - Match branch 1 (click)
const clickRes = EventSchema.safeParse({ type: "click", x: 100, y: 250 });
console.log("Discriminated Union Click:", clickRes.success);
/* Expected Output:
Discriminated Union Click: true
*/

// Case 2: Discriminated Union - Invalid discriminant value
const invalidDiscriminant = EventSchema.safeParse({ type: "keydown", code: "Enter" });
console.log("Invalid Discriminant Rejected:", invalidDiscriminant.success === false);
console.log("Discriminant Issue Code:", (invalidDiscriminant as any).issues?.[0]?.code);
/* Expected Output:
Invalid Discriminant Rejected: true
Discriminant Issue Code: invalid_value
*/

// Case 3: Discriminated Union - Branch payload mismatch (missing 'element' in hover)
const badHover = EventSchema.safeParse({ type: "hover", target: "#btn" });
console.log("Branch Property Failure:", badHover.success === false);
console.log("Hover Missing Path:", (badHover as any).issues?.[0]?.path);
/* Expected Output:
Branch Property Failure: true
Hover Missing Path: [ 'element' ]
*/

// Case 4: Standard Union - string vs number vs boolean (rejected)
console.log("Union Valid String:", StrOrNum.safeParse("hello").success);
console.log("Union Valid Number:", StrOrNum.safeParse(42).success);
console.log("Union Invalid Boolean:", StrOrNum.safeParse(true).success === false);
/* Expected Output:
Union Valid String: true
Union Valid Number: true
Union Invalid Boolean: true
*/

// Case 5: Intersection - All properties required
const validIntersection = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  createdAt: Date.now(),
};
const partialIntersection = { id: "123e4567-e89b-12d3-a456-426614174000" }; // Missing createdAt

console.log("Intersection Success:", CombinedEntity.safeParse(validIntersection).success);
console.log("Intersection Incomplete Rejected:", CombinedEntity.safeParse(partialIntersection).success === false);
/* Expected Output:
Intersection Success: true
Intersection Incomplete Rejected: true
*/
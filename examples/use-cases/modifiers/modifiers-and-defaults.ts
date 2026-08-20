// tests/modifiers-and-defaults.test.ts
import { infer } from "subatom-infer";

// 1. Schema Definitions
const OptStr = infer.string().optional();
const NullableNum = infer.number().nullable();
const NullishDate = infer.date().nullish();
const DefaultPort = infer.number().default(3000);
const PrefaultVal = infer.string().prefault("anonymous");
const SafeValue = infer.number().catch(0);

// Case 1: Optional & Nullable Modifiers
console.log("Optional String valid with string:", OptStr.safeParse("text").success);
console.log("Optional String valid with undefined:", OptStr.safeParse(undefined).success);

console.log("Nullable Number valid with number:", NullableNum.safeParse(42).success);
console.log("Nullable Number valid with null:", NullableNum.safeParse(null).success);
console.log("Nullable Number fails with undefined:", NullableNum.safeParse(undefined).success === false);

console.log("Nullish Date valid with null:", NullishDate.safeParse(null).success);
console.log("Nullish Date valid with undefined:", NullishDate.safeParse(undefined).success);

// Case 2: Defaults and Prefaults
const defaultRes = DefaultPort.safeParse(undefined);
console.log("Default Value Applied:", defaultRes.success && defaultRes.data === 3000);

const prefaultRes = PrefaultVal.safeParse(undefined);
console.log("Prefault Value Applied:", prefaultRes.success && prefaultRes.data === "anonymous");

// Case 3: Catch fallback on invalid input
const catchRes = SafeValue.safeParse("not-a-number");
console.log("Catch Fallback Applied:", catchRes.success && catchRes.data === 0);
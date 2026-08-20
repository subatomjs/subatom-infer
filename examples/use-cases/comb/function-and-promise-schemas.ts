// tests/promise-schemas.test.ts
import { infer } from "subatom-infer";

// 1. Promise Schema Definition
const AsyncStrSchema = infer.promise(infer.string());

async function testPromiseResolution() {
  // Case 1: Promise Schema Validation (Resolves to valid string)
  const validPromise = Promise.resolve("data_fetched_successfully");
  const parsedPromise = AsyncStrSchema.safeParse(validPromise);

  console.log("Promise Input Recognized:", parsedPromise.success);

  if (parsedPromise.success) {
    const resolvedValue = await parsedPromise.data;
    console.log("Promise Resolved Value:", resolvedValue);
  }

  // Case 2: Promise Schema Validation (Resolves to invalid type)
  const invalidPromise = Promise.resolve(99999);
  const parsedInvalid = AsyncStrSchema.safeParse(invalidPromise);
  
  if (parsedInvalid.success) {
    try {
      await parsedInvalid.data;
    } catch (err: any) {
      console.log("Caught Error from Invalid Inner Type:", err instanceof Error);
      console.log("Promise Rejected on Invalid Inner Type:", true);
    }
  }
}

testPromiseResolution();
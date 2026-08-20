// tests/files-and-recursive-lazy.test.ts
import { infer } from "subatom-infer";

// 1. File Schema Definition
const UploadSchema = infer.file().max(5_000_000).mime("image/png");

// 2. Promise Schema Definition
const AsyncStrSchema = infer.promise(infer.string());


const NodeSchema: any = infer.lazy(() =>
  infer.object({
    value: infer.number(),
    next: NodeSchema.optional(),
  })
);

// Case 1: Recursive Data Structure (Linked List)
const validChain = {
  value: 1,
  next: {
    value: 2,
    next: {
      value: 3,
    },
  },
};

const resultChain = NodeSchema.safeParse(validChain);
console.log("Recursive Linked List Valid:", resultChain.success);
console.log("Third Node Value:", resultChain.data?.next?.next?.value);
/* Expected Output:
Recursive Linked List Valid: true
Third Node Value: 3
*/

// Case 2: Recursive Deep Failure
const invalidDeepChain = {
  value: 1,
  next: {
    value: 2,
    next: {
      value: "three",
    },
  },
};

const resultDeepFail = NodeSchema.safeParse(invalidDeepChain);
console.log("Deep Recursion Rejected:", resultDeepFail.success === false);
console.log("Deep Failure Path:", resultDeepFail.issues?.[0]?.path);
/* Expected Output:
Deep Recursion Rejected: true
Deep Failure Path: [ 'next', 'next', 'value' ]
*/

// Case 3: Promise Schema Validation
async function testPromiseResolution() {
  const validPromise = Promise.resolve("data_fetched_successfully");
  const parsedPromise = AsyncStrSchema.safeParse(validPromise);

  console.log("Promise Input Recognized:", parsedPromise.success);

  if (parsedPromise.success) {
    const resolvedValue = await parsedPromise.data;
    console.log("Promise Resolved Value:", resolvedValue);
  }
}

testPromiseResolution();

// Case 4: File Schema Validation
const mockValidFile = new File(["file-binary-contents"], "avatar.png", {
  type: "image/png",
});

const fileResult = UploadSchema.safeParse(mockValidFile);
console.log("File Upload Valid:", fileResult.success);
/* Expected Output:
File Upload Valid: true
*/
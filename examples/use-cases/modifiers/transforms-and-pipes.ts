/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */



import { infer } from "subatom-infer";

// 1. Transformation Pipeline
const StrToDate = infer.string().transform((val) => new Date(val));
const PipedValidation = infer.pipe(infer.string().min(2), infer.string().email());

// Case 1: Transform String to Date instance
const transformRes = StrToDate.safeParse("2026-06-01T00:00:00.000Z");
console.log("Transform Success:", transformRes.success);
console.log("Is Date Output:", (transformRes as any).data instanceof Date);
console.log("Output Year:", (transformRes as any).data?.getUTCFullYear());

// Case 2: Pipe Validation (Both min(2) and email format must pass)
const validPipe = PipedValidation.safeParse("io@subatom.io");
console.log("Pipe Valid Input:", validPipe.success);

const invalidPipeLength = PipedValidation.safeParse("a@b.com"); // Length < 2 before '@' or string min(2) total
console.log("Pipe Length Violation Caught:", invalidPipeLength.success === false);
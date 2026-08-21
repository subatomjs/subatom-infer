/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */


/// <reference types="node" />

import { infer } from "subatom-infer";

// 1. Branding & Bidirectional Codec Schemas
const UserIdSchema = infer.brand(infer.uuid(), "UserId");
const Base64Codec = infer.codec(
  infer.string().transform((str) => Buffer.from(str, "base64")),
  (buf: Buffer) => buf.toString("base64")
);

// Case 1: Nominal Branding Verification
const validUuid = "123e4567-e89b-12d3-a456-426614174000";
const brandRes = UserIdSchema.safeParse(validUuid);
console.log("Branded UUID Success:", brandRes.success);
console.log("Branded Output Value:", (brandRes as any).data);

// Case 2: Codec Transformation (Encoding/Decoding check if supported)
const encodedPayload = "c3ViYXRvbV9pbmZlcg=="; // base64 for 'subatom_infer'
const codecRes = Base64Codec.safeParse(encodedPayload);
console.log("Codec Decode Success:", codecRes.success);
console.log("Decoded Buffer Data:", (codecRes as any).data instanceof Buffer);
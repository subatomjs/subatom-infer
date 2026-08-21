/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */

export type IssueCode =
  | "invalid_type"
  | "invalid_value"
  | "invalid_format"
  | "too_small"
  | "too_big"
  | "unrecognized_keys"
  | "invalid_union"
  | "custom";

export interface BaseValidationIssue {
  code: IssueCode;
  path: readonly (string | number)[];
  message: string;
}

export interface InvalidTypeIssue extends BaseValidationIssue {
  code: "invalid_type";
  expected: string;
  received: string;
}

export interface InvalidValueIssue extends BaseValidationIssue {
  code: "invalid_value";
  expected?: unknown;
  received: unknown;
}

export interface InvalidFormatIssue extends BaseValidationIssue {
  code: "invalid_format";
  format: string;
}

export interface SizeBoundIssue extends BaseValidationIssue {
  code: "too_small" | "too_big";
  minimum?: number | bigint | undefined;
  maximum?: number | bigint | undefined;
  inclusive: boolean;
  origin: "string" | "number" | "bigint" | "array" | "set" | "map" | "file";
}

export interface UnrecognizedKeysIssue extends BaseValidationIssue {
  code: "unrecognized_keys";
  keys: readonly string[];
}

export interface InvalidUnionIssue extends BaseValidationIssue {
  code: "invalid_union";
  unionErrors: readonly import("./error.js").ValidationError[];
}

export interface CustomIssue extends BaseValidationIssue {
  code: "custom";
  params?: Record<string, unknown>;
}

export type ValidationIssue =
  | InvalidTypeIssue
  | InvalidValueIssue
  | InvalidFormatIssue
  | SizeBoundIssue
  | UnrecognizedKeysIssue
  | InvalidUnionIssue
  | CustomIssue;

export type IssueData =
  | Omit<InvalidTypeIssue, "path">
  | Omit<InvalidValueIssue, "path">
  | Omit<InvalidFormatIssue, "path">
  | Omit<SizeBoundIssue, "path">
  | Omit<UnrecognizedKeysIssue, "path">
  | Omit<InvalidUnionIssue, "path">
  | Omit<CustomIssue, "path">;
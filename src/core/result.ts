import { ValidationError } from "./error.js";
import type { ValidationIssue } from "./issue.js";

export type ParseResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly issues: readonly ValidationIssue[] };

export type SafeParseResult<T> =
  | { readonly success: true; readonly data: T; readonly error?: never }
  | { readonly success: false; readonly error: ValidationError; readonly data?: never };

export type SyncParseReturnType<T> = ParseResult<T>;
export type AsyncParseReturnType<T> = Promise<ParseResult<T>>;
export type DynamicParseReturnType<T> = SyncParseReturnType<T> | AsyncParseReturnType<T>;

export const makeSuccess = <T>(data: T): ParseResult<T> => ({
  success: true,
  data,
});

export const makeFailure = (issues: readonly ValidationIssue[]): ParseResult<never> => ({
  success: false,
  issues: Object.freeze(issues),
});

export const isPromise = <T>(value: unknown): value is Promise<T> => {
  return typeof value === "object" && value !== null && "then" in value && typeof (value as { then: unknown }).then === "function";
};
import type { ValidationIssue } from "./issue.js";
import { ValidationError } from "./error.js";

export interface ParseSuccess<T> {
  readonly success: true;
  readonly data: T;
}

export interface ParseFailure {
  readonly success: false;
  readonly error: ValidationError;
  readonly issues: readonly ValidationIssue[];
}

export type ParseResult<T> = ParseSuccess<T> | ParseFailure;
export type SafeParseResult<T> = ParseResult<T>;
export type DynamicParseReturnType<T> = ParseResult<T> | Promise<ParseResult<T>>;

export function makeSuccess<T>(data: T): ParseSuccess<T> {
  return { success: true, data };
}

export function makeFailure(issues: readonly ValidationIssue[]): ParseFailure {
  return {
    success: false,
    error: new ValidationError(issues),
    issues,
  };
}

export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Promise<T>).then === "function" &&
    typeof (value as Promise<T>).catch === "function"
  );
}
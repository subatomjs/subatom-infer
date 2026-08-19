export type IssuePathElement = string | number | symbol;

export interface BaseIssue {
  readonly path: readonly IssuePathElement[];
  readonly message: string;
}

export interface InvalidTypeIssue extends BaseIssue {
  readonly code: "invalid_type";
  readonly expected: string;
  readonly received: string;
}

export interface InvalidValueIssue extends BaseIssue {
  readonly code: "invalid_value";
  readonly expected?: unknown;
  readonly received: unknown;
}

export interface TooSmallIssue extends BaseIssue {
  readonly code: "too_small";
  readonly minimum: number | bigint;
  readonly inclusive: boolean;
  readonly origin: "string" | "number" | "bigint" | "array" | "set" | "map" | "date" | "file";
}

export interface TooBigIssue extends BaseIssue {
  readonly code: "too_big";
  readonly maximum: number | bigint;
  readonly inclusive: boolean;
  readonly origin: "string" | "number" | "bigint" | "array" | "set" | "map" | "date" | "file";
}

export interface InvalidFormatIssue extends BaseIssue {
  readonly code: "invalid_format";
  readonly format: string;
  readonly validation?: string;
}

export interface UnrecognizedKeysIssue extends BaseIssue {
  readonly code: "unrecognized_keys";
  readonly keys: readonly string[];
}

export interface InvalidUnionIssue extends BaseIssue {
  readonly code: "invalid_union";
  readonly unionErrors: readonly import("./error.js").ValidationError[];
}

export interface CustomIssue extends BaseIssue {
  readonly code: "custom";
  readonly params?: Readonly<Record<string, unknown>>;
}

export type ValidationIssue =
  | InvalidTypeIssue
  | InvalidValueIssue
  | TooSmallIssue
  | TooBigIssue
  | InvalidFormatIssue
  | UnrecognizedKeysIssue
  | InvalidUnionIssue
  | CustomIssue;
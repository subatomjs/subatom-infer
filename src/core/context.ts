import type { IssuePathElement, ValidationIssue } from "./issue.js";

export type { IssuePathElement };

export interface ParseContext {
  async: boolean;
  issues: ValidationIssue[];
  path: readonly IssuePathElement[];
}

export type IssuePayload = ValidationIssue extends infer T
  ? T extends ValidationIssue
    ? Omit<T, "path">
    : never
  : never;

export function createParseContext(
  async: boolean,
  path: readonly IssuePathElement[] = []
): ParseContext {
  return {
    async,
    issues: [],
    path: Object.freeze([...path]),
  };
}

export function nestContext(
  ctx: ParseContext,
  segment: IssuePathElement
): ParseContext {
  return {
    ...ctx,
    path: Object.freeze([...ctx.path, segment]),
  };
}

export function addIssue(ctx: ParseContext, issue: IssuePayload): void {
  ctx.issues.push({
    ...issue,
    path: ctx.path,
  } as ValidationIssue);
}
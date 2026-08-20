import type { IssueData, ValidationIssue } from "./issue.js";

export interface ParseContext {
  readonly async: boolean;
  readonly path: readonly (string | number)[];
  readonly issues: ValidationIssue[];
}

export function createParseContext(
  isAsync = false,
  path: readonly (string | number)[] = []
): ParseContext {
  return {
    async: isAsync,
    path,
    issues: [],
  };
}

export function nestContext(
  ctx: ParseContext,
  segment: string | number
): ParseContext {
  return {
    async: ctx.async,
    path: [...ctx.path, segment],
    issues: ctx.issues,
  };
}

export function addIssue(
  ctx: ParseContext,
  issueData: IssueData & { path?: readonly (string | number)[] }
): void {
  const fullIssue: ValidationIssue = {
    ...issueData,
    path: issueData.path ?? ctx.path,
  } as ValidationIssue;

  ctx.issues.push(fullIssue);
}
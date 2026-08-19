import type { ValidationIssue } from "./issue.js";

export interface FormattedError {
  _errors: string[];
  [key: string]: FormattedError | string[];
}

export class ValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    super(ValidationError.formatSummary(issues));
    this.name = "ValidationError";
    this.issues = Object.freeze([...issues]);
    Object.setPrototypeOf(this, new.target.prototype);
  }

  private static formatSummary(issues: readonly ValidationIssue[]): string {
    if (issues.length === 0) return "Validation failed with unknown error";
    return issues
      .map((issue) => {
const pathStr =
  issue.path.length > 0
    ? ` at "${issue.path.map((p) => (typeof p === "symbol" ? p.toString() : String(p))).join(".")}"`
    : "";
        return `[${issue.code}]${pathStr}: ${issue.message}`;
      })
      .join("; ");
  }

  flatten(): { formErrors: string[]; fieldErrors: Record<string, string[]> } {
    const formErrors: string[] = [];
    const fieldErrors: Record<string, string[]> = {};

    for (const issue of this.issues) {
      if (issue.path.length === 0) {
        formErrors.push(issue.message);
      } else {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = [];
        fieldErrors[key]!.push(issue.message);
      }
    }
    return { formErrors, fieldErrors };
  }

  format(): FormattedError {
    const result: FormattedError = { _errors: [] };

    const processIssue = (issue: ValidationIssue) => {
      let curr = result;
      for (const segment of issue.path) {
        const key = String(segment);
        if (!curr[key]) {
          curr[key] = { _errors: [] };
        }
        curr = curr[key] as FormattedError;
      }
      curr._errors.push(issue.message);
    };

    for (const issue of this.issues) {
      processIssue(issue);
    }
    return result;
  }

  treeifyError(): string {
    const lines: string[] = ["ValidationError:"];
    for (const issue of this.issues) {
      const pathStr = issue.path.length ? issue.path.join(" -> ") : "<root>";
      lines.push(`  ✖ [${issue.code}] (${pathStr}) ${issue.message}`);
    }
    return lines.join("\n");
  }

  prettifyError(): string {
    return this.treeifyError();
  }
}
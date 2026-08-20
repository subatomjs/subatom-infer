import type { ValidationIssue } from "./issue.js";

export interface FormattedError {
  _errors: string[];
  [key: string]: FormattedError | string[];
}

export class ValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    const formattedSummary = issues
      .map((i) => `[${i.path.join(".") || "<root>"}]: ${i.message}`)
      .join("; ");
    super(`Validation failed: ${formattedSummary}`);

    this.name = "ValidationError";
    this.issues = Object.freeze([...issues]);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  format(): FormattedError {
    const root: FormattedError = { _errors: [] };

    for (const issue of this.issues) {
      if (issue.path.length === 0) {
        root._errors.push(issue.message);
        continue;
      }

      let current: FormattedError = root;
      for (let i = 0; i < issue.path.length; i++) {
        const seg = String(issue.path[i]);
        if (i === issue.path.length - 1) {
          if (!current[seg]) {
            current[seg] = { _errors: [issue.message] };
          } else {
            (current[seg] as FormattedError)._errors.push(issue.message);
          }
        } else {
          if (!current[seg]) {
            current[seg] = { _errors: [] };
          }
          current = current[seg] as FormattedError;
        }
      }
    }

    return root;
  }

  flatten(): { formErrors: string[]; fieldErrors: Record<string, string[]> } {
    const formErrors: string[] = [];
    const fieldErrors: Record<string, string[]> = Object.create(null);

    for (const issue of this.issues) {
      if (issue.path.length === 0) {
        formErrors.push(issue.message);
      } else {
        const key = issue.path.join(".");
        if (!fieldErrors[key]) {
          fieldErrors[key] = [];
        }
        fieldErrors[key]!.push(issue.message);
      }
    }

    return { formErrors, fieldErrors };
  }

  prettifyError(): string {
    const lines = ["Validation Errors:"];
    for (const issue of this.issues) {
      const path = issue.path.length > 0 ? issue.path.join(".") : "<root>";
      lines.push(`  → [${path}] (${issue.code}): ${issue.message}`);
    }
    return lines.join("\n");
  }
}
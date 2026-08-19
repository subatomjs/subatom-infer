import { Schema } from "../../core/schema.js";
import { addIssue, type ParseContext } from "../../core/context.js";
import { makeFailure, makeSuccess, type DynamicParseReturnType } from "../../core/result.js";

export interface StringCheck {
  kind: string;
  validate: (val: string) => boolean;
  mutate?: (val: string) => string;
  message: string;
  metadata?: Record<string, unknown>;
}

export class StringSchema extends Schema<string, string> {
  readonly checks: readonly StringCheck[];

  constructor(checks: readonly StringCheck[] = []) {
    super();
    this.checks = Object.freeze([...checks]);
  }

  _parse(input: unknown, ctx: ParseContext): DynamicParseReturnType<string> {
    if (typeof input !== "string") {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "string",
        received: typeof input,
        message: `Expected string, received ${typeof input}`,
      });
      return makeFailure(ctx.issues);
    }

    let processed = input;
    for (const check of this.checks) {
      if (check.mutate) {
        processed = check.mutate(processed);
      }
      if (!check.validate(processed)) {
        if (check.kind === "min") {
          addIssue(ctx, {
            code: "too_small",
            minimum: check.metadata?.["min"] as number,
            inclusive: true,
            origin: "string",
            message: check.message,
          });
        } else if (check.kind === "max") {
          addIssue(ctx, {
            code: "too_big",
            maximum: check.metadata?.["max"] as number,
            inclusive: true,
            origin: "string",
            message: check.message,
          });
        } else {
          addIssue(ctx, {
            code: "invalid_format",
            format: check.kind,
            message: check.message,
          });
        }
      }
    }

    if (ctx.issues.length > 0) return makeFailure(ctx.issues);
    return makeSuccess(processed);
  }

  private addCheck(check: StringCheck): StringSchema {
    return new StringSchema([...this.checks, check]);
  }

  min(length: number, msg?: string) {
    return this.addCheck({ kind: "min", validate: (v) => v.length >= length, message: msg ?? `String must contain at least ${length} char(s)`, metadata: { min: length } });
  }

  max(length: number, msg?: string) {
    return this.addCheck({ kind: "max", validate: (v) => v.length <= length, message: msg ?? `String must contain at most ${length} char(s)`, metadata: { max: length } });
  }

  length(exact: number, msg?: string) {
    return this.addCheck({ kind: "length", validate: (v) => v.length === exact, message: msg ?? `String must contain exactly ${exact} char(s)` });
  }

  email(msg = "Invalid email address") {
    return this.addCheck({ kind: "email", validate: (v) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v), message: msg });
  }

  url(msg = "Invalid URL") {
    return this.addCheck({ kind: "url", validate: (v) => { try { new URL(v); return true; } catch { return false; } }, message: msg });
  }

  httpUrl(msg = "Invalid HTTP/HTTPS URL") {
    return this.addCheck({ kind: "httpUrl", validate: (v) => { try { const u = new URL(v); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; } }, message: msg });
  }

  uuid(msg = "Invalid UUID") {
    return this.addCheck({ kind: "uuid", validate: (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v), message: msg });
  }

  guid(msg = "Invalid GUID") {
    return this.uuid(msg);
  }

  cuid(msg = "Invalid CUID") {
    return this.addCheck({ kind: "cuid", validate: (v) => /^c[^\s-]{8,}$/i.test(v), message: msg });
  }

  cuid2(msg = "Invalid CUID2") {
    return this.addCheck({ kind: "cuid2", validate: (v) => /^[a-z][a-z0-9]*$/.test(v), message: msg });
  }

  ulid(msg = "Invalid ULID") {
    return this.addCheck({ kind: "ulid", validate: (v) => /^[0-9A-HJKMNP-TV-Z]{26}$/.test(v), message: msg });
  }

  nanoid(msg = "Invalid NanoID") {
    return this.addCheck({ kind: "nanoid", validate: (v) => /^[A-Za-z0-9_-]{21}$/.test(v), message: msg });
  }

  regex(regex: RegExp, msg = "Invalid pattern") {
    return this.addCheck({ kind: "regex", validate: (v) => regex.test(v), message: msg });
  }

  startsWith(prefix: string, msg?: string) {
    return this.addCheck({ kind: "startsWith", validate: (v) => v.startsWith(prefix), message: msg ?? `Must start with "${prefix}"` });
  }

  endsWith(suffix: string, msg?: string) {
    return this.addCheck({ kind: "endsWith", validate: (v) => v.endsWith(suffix), message: msg ?? `Must end with "${suffix}"` });
  }

  includes(substr: string, msg?: string) {
    return this.addCheck({ kind: "includes", validate: (v) => v.includes(substr), message: msg ?? `Must contain "${substr}"` });
  }

  datetime(msg = "Invalid ISO 8601 DateTime") {
    return this.addCheck({ kind: "datetime", validate: (v) => !isNaN(Date.parse(v)), message: msg });
  }

  date(msg = "Invalid ISO Date (YYYY-MM-DD)") {
    return this.addCheck({ kind: "date", validate: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)), message: msg });
  }

  time(msg = "Invalid ISO Time (HH:MM:SS)") {
    return this.addCheck({ kind: "time", validate: (v) => /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?$/.test(v), message: msg });
  }

  duration(msg = "Invalid ISO 8601 Duration") {
    return this.addCheck({ kind: "duration", validate: (v) => /^P(?!$)((\d+Y)?(\d+M)?(\d+W)?(\d+D)?)(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?$/.test(v), message: msg });
  }

  ipv4(msg = "Invalid IPv4 address") {
    return this.addCheck({ kind: "ipv4", validate: (v) => /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(v), message: msg });
  }

  ipv6(msg = "Invalid IPv6 address") {
    return this.addCheck({ kind: "ipv6", validate: (v) => /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(v), message: msg });
  }

  hostname(msg = "Invalid RFC 1123 Hostname") {
    return this.addCheck({ kind: "hostname", validate: (v) => /^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])(\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]))*$/.test(v), message: msg });
  }

  trim() {
    return this.addCheck({ kind: "trim", validate: () => true, mutate: (v) => v.trim(), message: "" });
  }

  toLowerCase() {
    return this.addCheck({ kind: "toLowerCase", validate: () => true, mutate: (v) => v.toLowerCase(), message: "" });
  }

  toUpperCase() {
    return this.addCheck({ kind: "toUpperCase", validate: () => true, mutate: (v) => v.toUpperCase(), message: "" });
  }

  normalize(form: "NFC" | "NFD" | "NFKC" | "NFKD" = "NFC") {
    return this.addCheck({ kind: "normalize", validate: () => true, mutate: (v) => v.normalize(form), message: "" });
  }
}
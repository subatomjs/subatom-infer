/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */


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

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CUID_REGEX = /^c[^\s-]{8,}$/i;
const CUID2_REGEX = /^[a-z][a-z0-9]*$/;
const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const NANOID_REGEX = /^[A-Za-z0-9_-]{21}$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?$/;
const ISO_DURATION_REGEX = /^P(?!$)((\d+Y)?(\d+M)?(\d+W)?(\d+D)?)(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?$/;
const IPV4_REGEX = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
const HOSTNAME_REGEX = /^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])(\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]))*$/;

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

  min(length: number, msg?: string): StringSchema {
    return this.addCheck({
      kind: "min",
      validate: (v) => v.length >= length,
      message: msg ?? `String must contain at least ${length} character(s)`,
      metadata: { min: length },
    });
  }

  max(length: number, msg?: string): StringSchema {
    return this.addCheck({
      kind: "max",
      validate: (v) => v.length <= length,
      message: msg ?? `String must contain at most ${length} character(s)`,
      metadata: { max: length },
    });
  }

  length(exact: number, msg?: string): StringSchema {
    return this.addCheck({
      kind: "length",
      validate: (v) => v.length === exact,
      message: msg ?? `String must contain exactly ${exact} character(s)`,
      metadata: { min: exact, max: exact },
    });
  }

  email(msg = "Invalid email address"): StringSchema {
    return this.addCheck({
      kind: "email",
      validate: (v) => EMAIL_REGEX.test(v),
      message: msg,
    });
  }

  url(msg = "Invalid URL"): StringSchema {
    return this.addCheck({
      kind: "url",
      validate: (v) => {
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      message: msg,
    });
  }

  httpUrl(msg = "Invalid HTTP/HTTPS URL"): StringSchema {
    return this.addCheck({
      kind: "httpUrl",
      validate: (v) => {
        try {
          const u = new URL(v);
          return u.protocol === "http:" || u.protocol === "https:";
        } catch {
          return false;
        }
      },
      message: msg,
    });
  }

  uuid(msg = "Invalid UUID"): StringSchema {
    return this.addCheck({
      kind: "uuid",
      validate: (v) => UUID_REGEX.test(v),
      message: msg,
    });
  }

  guid(msg = "Invalid GUID"): StringSchema {
    return this.uuid(msg);
  }

  cuid(msg = "Invalid CUID"): StringSchema {
    return this.addCheck({
      kind: "cuid",
      validate: (v) => CUID_REGEX.test(v),
      message: msg,
    });
  }

  cuid2(msg = "Invalid CUID2"): StringSchema {
    return this.addCheck({
      kind: "cuid2",
      validate: (v) => CUID2_REGEX.test(v),
      message: msg,
    });
  }

  ulid(msg = "Invalid ULID"): StringSchema {
    return this.addCheck({
      kind: "ulid",
      validate: (v) => ULID_REGEX.test(v),
      message: msg,
    });
  }

  nanoid(msg = "Invalid NanoID"): StringSchema {
    return this.addCheck({
      kind: "nanoid",
      validate: (v) => NANOID_REGEX.test(v),
      message: msg,
    });
  }

  regex(regexPattern: RegExp, msg = "Invalid pattern"): StringSchema {
    return this.addCheck({
      kind: "regex",
      validate: (v) => regexPattern.test(v),
      message: msg,
    });
  }

  startsWith(prefix: string, msg?: string): StringSchema {
    return this.addCheck({
      kind: "startsWith",
      validate: (v) => v.startsWith(prefix),
      message: msg ?? `Must start with "${prefix}"`,
    });
  }

  endsWith(suffix: string, msg?: string): StringSchema {
    return this.addCheck({
      kind: "endsWith",
      validate: (v) => v.endsWith(suffix),
      message: msg ?? `Must end with "${suffix}"`,
    });
  }

  includes(substr: string, msg?: string): StringSchema {
    return this.addCheck({
      kind: "includes",
      validate: (v) => v.includes(substr),
      message: msg ?? `Must contain "${substr}"`,
    });
  }

  datetime(msg = "Invalid ISO 8601 DateTime"): StringSchema {
    return this.addCheck({
      kind: "datetime",
      validate: (v) => !Number.isNaN(Date.parse(v)),
      message: msg,
    });
  }

  date(msg = "Invalid ISO Date (YYYY-MM-DD)"): StringSchema {
    return this.addCheck({
      kind: "date",
      validate: (v) => ISO_DATE_REGEX.test(v) && !Number.isNaN(Date.parse(v)),
      message: msg,
    });
  }

  time(msg = "Invalid ISO Time (HH:MM:SS)"): StringSchema {
    return this.addCheck({
      kind: "time",
      validate: (v) => ISO_TIME_REGEX.test(v),
      message: msg,
    });
  }

  duration(msg = "Invalid ISO 8601 Duration"): StringSchema {
    return this.addCheck({
      kind: "duration",
      validate: (v) => ISO_DURATION_REGEX.test(v),
      message: msg,
    });
  }

  ipv4(msg = "Invalid IPv4 address"): StringSchema {
    return this.addCheck({
      kind: "ipv4",
      validate: (v) => IPV4_REGEX.test(v),
      message: msg,
    });
  }

  ipv6(msg = "Invalid IPv6 address"): StringSchema {
    return this.addCheck({
      kind: "ipv6",
      validate: (v) => IPV6_REGEX.test(v),
      message: msg,
    });
  }

  hostname(msg = "Invalid RFC 1123 Hostname"): StringSchema {
    return this.addCheck({
      kind: "hostname",
      validate: (v) => HOSTNAME_REGEX.test(v),
      message: msg,
    });
  }

  trim(): StringSchema {
    return this.addCheck({
      kind: "trim",
      validate: () => true,
      mutate: (v) => v.trim(),
      message: "",
    });
  }

  toLowerCase(): StringSchema {
    return this.addCheck({
      kind: "toLowerCase",
      validate: () => true,
      mutate: (v) => v.toLowerCase(),
      message: "",
    });
  }

  toUpperCase(): StringSchema {
    return this.addCheck({
      kind: "toUpperCase",
      validate: () => true,
      mutate: (v) => v.toUpperCase(),
      message: "",
    });
  }

  normalize(form: "NFC" | "NFD" | "NFKC" | "NFKD" = "NFC"): StringSchema {
    return this.addCheck({
      kind: "normalize",
      validate: () => true,
      mutate: (v) => v.normalize(form),
      message: "",
    });
  }
}
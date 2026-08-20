import { describe, it, expect, expectTypeOf } from "vitest";
import {
  StringSchema,
  type StringCheck,
} from "../../../src/schemas/primitives/string.js";
import { ValidationError } from "../../../src/core/error.js";

describe("StringSchema (src/schemas/primitives/string.ts)", () => {
  const baseSchema = new StringSchema();

  describe("Constructor & Static Typing", () => {
    it("initializes with an empty checks array by default and freezes it", () => {
      expect(baseSchema.checks).toEqual([]);
      expect(Object.isFrozen(baseSchema.checks)).toBe(true);
    });

    it("freezes custom checks array when provided directly", () => {
      const customCheck: StringCheck = {
        kind: "min",
        validate: (v) => v.length >= 1,
        message: "Too short",
        metadata: { min: 1 },
      };
      const schema = new StringSchema([customCheck]);
      expect(schema.checks).toHaveLength(1);
      expect(schema.checks[0]).toBe(customCheck);
      expect(Object.isFrozen(schema.checks)).toBe(true);
    });

    it("verifies static TypeScript output and input types", () => {
      expectTypeOf(baseSchema._output).toEqualTypeOf<string>();
      expectTypeOf(baseSchema._input).toEqualTypeOf<string>();
    });
  });

  describe("Basic Type Validation", () => {
    it("parses valid strings successfully", () => {
      expect(baseSchema.parse("hello")).toBe("hello");
      expect(baseSchema.parse("")).toBe("");
    });

    it("fails when input is not a string primitive", () => {
      const nonStrings: unknown[] = [
        123,
        true,
        false,
        null,
        undefined,
        {},
        [],
        Symbol("str"),
        10n,
      ];

      for (const input of nonStrings) {
        const safe = baseSchema.safeParse(input);
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.error).toBeInstanceOf(ValidationError);
          const issue = safe.issues[0];
          expect(issue?.code).toBe("invalid_type");
          if (issue?.code === "invalid_type") {
            expect(issue.expected).toBe("string");
            expect(issue.received).toBe(typeof input);
            expect(issue.message).toBe(
              `Expected string, received ${typeof input}`
            );
          }
        }
      }
    });
  });

  describe("Length Validations (min, max, length)", () => {
    describe("min()", () => {
      it("passes when string length is >= min", () => {
        const schema = baseSchema.min(3);
        expect(schema.parse("abc")).toBe("abc");
        expect(schema.parse("abcd")).toBe("abcd");
      });

      it("fails with default error message when string length < min", () => {
        const schema = baseSchema.min(3);
        const safe = schema.safeParse("ab");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.issues[0];
          expect(issue?.code).toBe("too_small");
          if (issue?.code === "too_small") {
            expect(issue.minimum).toBe(3);
            expect(issue.inclusive).toBe(true);
            expect(issue.origin).toBe("string");
            expect(issue.message).toBe(
              "String must contain at least 3 character(s)"
            );
          }
        }
      });

      it("fails with custom error message when provided", () => {
        const schema = baseSchema.min(3, "At least 3 characters needed");
        const safe = schema.safeParse("a");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("At least 3 characters needed");
        }
      });
    });

    describe("max()", () => {
      it("passes when string length is <= max", () => {
        const schema = baseSchema.max(5);
        expect(schema.parse("abcde")).toBe("abcde");
        expect(schema.parse("abc")).toBe("abc");
      });

      it("fails with default error message when string length > max", () => {
        const schema = baseSchema.max(5);
        const safe = schema.safeParse("abcdef");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.issues[0];
          expect(issue?.code).toBe("too_big");
          if (issue?.code === "too_big") {
            expect(issue.maximum).toBe(5);
            expect(issue.inclusive).toBe(true);
            expect(issue.origin).toBe("string");
            expect(issue.message).toBe(
              "String must contain at most 5 character(s)"
            );
          }
        }
      });

      it("fails with custom error message when provided", () => {
        const schema = baseSchema.max(5, "At most 5 characters allowed");
        const safe = schema.safeParse("abcdef");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("At most 5 characters allowed");
        }
      });
    });

    describe("length()", () => {
      it("passes when string length matches exact requirement", () => {
        const schema = baseSchema.length(4);
        expect(schema.parse("abcd")).toBe("abcd");
      });

      it("fails with default error message when length is different", () => {
        const schema = baseSchema.length(4);
        const safe = schema.safeParse("abc");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          const issue = safe.issues[0];
          expect(issue?.code).toBe("invalid_format");
          if (issue?.code === "invalid_format") {
            expect(issue.format).toBe("length");
            expect(issue.message).toBe(
              "String must contain exactly 4 character(s)"
            );
          }
        }
      });

      it("fails with custom error message when provided", () => {
        const schema = baseSchema.length(4, "Exact 4 chars required");
        const safe = schema.safeParse("abcde");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Exact 4 chars required");
        }
      });
    });
  });

  describe("Format Validations", () => {
    describe("email()", () => {
      it("validates standard email addresses", () => {
        const schema = baseSchema.email();
        expect(schema.parse("user@example.com")).toBe("user@example.com");
        expect(schema.parse("first.last+tag@sub.domain.co")).toBe(
          "first.last+tag@sub.domain.co"
        );
      });

      it("fails on invalid email formats with default and custom message", () => {
        const schema = baseSchema.email();
        const safe = schema.safeParse("not-an-email");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Invalid email address");
        }

        const customSchema = baseSchema.email("Custom invalid email");
        const safeCustom = customSchema.safeParse("user@");
        expect(safeCustom.success).toBe(false);
        if (!safeCustom.success) {
          expect(safeCustom.issues[0]?.message).toBe("Custom invalid email");
        }
      });
    });

    describe("url()", () => {
      it("validates valid URLs across different protocols", () => {
        const schema = baseSchema.url();
        expect(schema.parse("https://example.com")).toBe("https://example.com");
        expect(schema.parse("ftp://files.example.org/dir")).toBe(
          "ftp://files.example.org/dir"
        );
      });

      it("fails on malformed URLs with default and custom message", () => {
        const schema = baseSchema.url();
        const safe = schema.safeParse("not a url");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Invalid URL");
        }

        const customSchema = baseSchema.url("Custom invalid URL");
        const safeCustom = customSchema.safeParse("http://");
        expect(safeCustom.success).toBe(false);
        if (!safeCustom.success) {
          expect(safeCustom.issues[0]?.message).toBe("Custom invalid URL");
        }
      });
    });

    describe("httpUrl()", () => {
      it("validates HTTP and HTTPS URLs strictly", () => {
        const schema = baseSchema.httpUrl();
        expect(schema.parse("http://example.com")).toBe("http://example.com");
        expect(schema.parse("https://example.com/path?q=1")).toBe(
          "https://example.com/path?q=1"
        );
      });

      it("fails on non-HTTP/HTTPS URLs and invalid URLs", () => {
        const schema = baseSchema.httpUrl();
        const safeFtp = schema.safeParse("ftp://example.com");
        expect(safeFtp.success).toBe(false);
        if (!safeFtp.success) {
          expect(safeFtp.issues[0]?.message).toBe("Invalid HTTP/HTTPS URL");
        }

        const safeInvalid = schema.safeParse("invalid-url");
        expect(safeInvalid.success).toBe(false);
        if (!safeInvalid.success) {
          expect(safeInvalid.issues[0]?.message).toBe("Invalid HTTP/HTTPS URL");
        }

        const customSchema = baseSchema.httpUrl("Must be web URL");
        const safeCustom = customSchema.safeParse("ws://example.com");
        expect(safeCustom.success).toBe(false);
        if (!safeCustom.success) {
          expect(safeCustom.issues[0]?.message).toBe("Must be web URL");
        }
      });
    });

    describe("uuid() & guid()", () => {
      const validUuid = "123e4567-e89b-12d3-a456-426614174000";

      it("validates standard UUIDs (v1 to v5)", () => {
        const schema = baseSchema.uuid();
        expect(schema.parse(validUuid)).toBe(validUuid);
      });

      it("fails on invalid UUID with default and custom message", () => {
        const schema = baseSchema.uuid();
        const safe = schema.safeParse("123e4567-e89b-62d3-a456-426614174000");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Invalid UUID");
        }

        const customSchema = baseSchema.uuid("Custom invalid UUID");
        const safeCustom = customSchema.safeParse("invalid-uuid");
        expect(safeCustom.success).toBe(false);
        if (!safeCustom.success) {
          expect(safeCustom.issues[0]?.message).toBe("Custom invalid UUID");
        }
      });

      it("guid() delegates to uuid check with custom message", () => {
        const schema = baseSchema.guid("Invalid GUID error");
        expect(schema.parse(validUuid)).toBe(validUuid);

        const safe = schema.safeParse("invalid-guid");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Invalid GUID error");
        }
      });
    });

    describe("cuid() & cuid2()", () => {
      it("cuid() validates standard CUIDs", () => {
        const schema = baseSchema.cuid();
        const validCuid = "cjh0qofyx0000r39yoe6ko13d";
        expect(schema.parse(validCuid)).toBe(validCuid);

        const safe = schema.safeParse("invalid-cuid");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Invalid CUID");
        }

        const custom = baseSchema.cuid("Custom CUID error");
        expect(custom.safeParse("bad").success).toBe(false);
      });

      it("cuid2() validates CUID2 formats", () => {
        const schema = baseSchema.cuid2();
        const validCuid2 = "a1b2c3d4e5";
        expect(schema.parse(validCuid2)).toBe(validCuid2);

        const safe = schema.safeParse("1abc");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Invalid CUID2");
        }

        const custom = baseSchema.cuid2("Custom CUID2 error");
        expect(custom.safeParse("INVALID").success).toBe(false);
      });
    });

    describe("ulid()", () => {
      it("validates ULID 26-character Crockford base32 strings", () => {
        const schema = baseSchema.ulid();
        const validUlid = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
        expect(schema.parse(validUlid)).toBe(validUlid);

        const safe = schema.safeParse("01ARZ3NDEKTSV4RRFFQ69G5FA");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Invalid ULID");
        }

        const custom = baseSchema.ulid("Custom ULID error");
        expect(custom.safeParse("bad-ulid").success).toBe(false);
      });
    });

    describe("nanoid()", () => {
      it("validates standard 21-character NanoIDs", () => {
        const schema = baseSchema.nanoid();
        const validNanoid = "V1StGXR8_Z5jdHi6B-myT";
        expect(schema.parse(validNanoid)).toBe(validNanoid);

        const safe = schema.safeParse("short-nano");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Invalid NanoID");
        }

        const custom = baseSchema.nanoid("Custom NanoID error");
        expect(custom.safeParse("bad").success).toBe(false);
      });
    });

    describe("regex()", () => {
      it("validates matching RegExp patterns", () => {
        const schema = baseSchema.regex(/^[0-9]+$/);
        expect(schema.parse("12345")).toBe("12345");

        const safe = schema.safeParse("123a45");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Invalid pattern");
        }

        const custom = baseSchema.regex(
          /^[A-Z]+$/,
          "Must be uppercase letters only"
        );
        const safeCustom = custom.safeParse("abc");
        expect(safeCustom.success).toBe(false);
        if (!safeCustom.success) {
          expect(safeCustom.issues[0]?.message).toBe(
            "Must be uppercase letters only"
          );
        }
      });
    });

    describe("startsWith(), endsWith(), includes()", () => {
      it("startsWith() checks prefix with default and custom message", () => {
        const schema = baseSchema.startsWith("pre_");
        expect(schema.parse("pre_fix")).toBe("pre_fix");

        const safe = schema.safeParse("post_fix");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe('Must start with "pre_"');
        }

        const custom = baseSchema.startsWith("a", "Must start with a");
        expect(custom.safeParse("b").success).toBe(false);
      });

      it("endsWith() checks suffix with default and custom message", () => {
        const schema = baseSchema.endsWith("_end");
        expect(schema.parse("the_end")).toBe("the_end");

        const safe = schema.safeParse("the_start");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe('Must end with "_end"');
        }

        const custom = baseSchema.endsWith("z", "Must end with z");
        expect(custom.safeParse("y").success).toBe(false);
      });

      it("includes() checks substring with default and custom message", () => {
        const schema = baseSchema.includes("target");
        expect(schema.parse("find the target here")).toBe(
          "find the target here"
        );

        const safe = schema.safeParse("missing");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe('Must contain "target"');
        }

        const custom = baseSchema.includes("mid", "Must contain mid");
        expect(custom.safeParse("edge").success).toBe(false);
      });
    });

    describe("datetime(), date(), time(), duration()", () => {
      it("datetime() validates ISO 8601 date-time strings", () => {
        const schema = baseSchema.datetime();
        expect(schema.parse("2026-08-20T12:00:00.000Z")).toBe(
          "2026-08-20T12:00:00.000Z"
        );

        const safe = schema.safeParse("invalid-datetime");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Invalid ISO 8601 DateTime");
        }

        const custom = baseSchema.datetime("Custom datetime error");
        expect(custom.safeParse("bad").success).toBe(false);
      });

      it("date() validates YYYY-MM-DD ISO date strings", () => {
        const schema = baseSchema.date();
        expect(schema.parse("2026-08-20")).toBe("2026-08-20");

        const safeFormat = schema.safeParse("2026/08/20");
        expect(safeFormat.success).toBe(false);
        if (!safeFormat.success) {
          expect(safeFormat.issues[0]?.message).toBe(
            "Invalid ISO Date (YYYY-MM-DD)"
          );
        }

        const safeInvalidDate = schema.safeParse("2026-99-99");
        expect(safeInvalidDate.success).toBe(false);

        const custom = baseSchema.date("Custom date error");
        expect(custom.safeParse("bad").success).toBe(false);
      });

      it("time() validates HH:MM:SS format", () => {
        const schema = baseSchema.time();
        expect(schema.parse("14:30:00")).toBe("14:30:00");
        expect(schema.parse("23:59:59.999")).toBe("23:59:59.999");

        const safe = schema.safeParse("25:00:00");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Invalid ISO Time (HH:MM:SS)");
        }

        const custom = baseSchema.time("Custom time error");
        expect(custom.safeParse("bad").success).toBe(false);
      });

      it("duration() validates ISO 8601 duration strings", () => {
        const schema = baseSchema.duration();
        expect(schema.parse("P1Y2M3DT4H5M6S")).toBe("P1Y2M3DT4H5M6S");
        expect(schema.parse("PT1H")).toBe("PT1H");

        const safe = schema.safeParse("P");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Invalid ISO 8601 Duration");
        }

        const custom = baseSchema.duration("Custom duration error");
        expect(custom.safeParse("bad").success).toBe(false);
      });
    });

    describe("ipv4(), ipv6(), hostname()", () => {
      it("ipv4() validates valid IPv4 addresses", () => {
        const schema = baseSchema.ipv4();
        expect(schema.parse("192.168.1.1")).toBe("192.168.1.1");
        expect(schema.parse("255.255.255.255")).toBe("255.255.255.255");

        const safe = schema.safeParse("256.0.0.1");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Invalid IPv4 address");
        }

        const custom = baseSchema.ipv4("Custom IPv4 error");
        expect(custom.safeParse("bad").success).toBe(false);
      });

      it("ipv6() validates valid IPv6 addresses", () => {
        const schema = baseSchema.ipv6();
        const validIpv6 = "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
        expect(schema.parse(validIpv6)).toBe(validIpv6);

        const safe = schema.safeParse("1234:5678");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Invalid IPv6 address");
        }

        const custom = baseSchema.ipv6("Custom IPv6 error");
        expect(custom.safeParse("bad").success).toBe(false);
      });

      it("hostname() validates RFC 1123 hostnames", () => {
        const schema = baseSchema.hostname();
        expect(schema.parse("example.com")).toBe("example.com");
        expect(schema.parse("sub.domain-name.org")).toBe("sub.domain-name.org");

        const safe = schema.safeParse("-invalid.com");
        expect(safe.success).toBe(false);
        if (!safe.success) {
          expect(safe.issues[0]?.message).toBe("Invalid RFC 1123 Hostname");
        }

        const custom = baseSchema.hostname("Custom hostname error");
        expect(custom.safeParse("bad..host").success).toBe(false);
      });
    });
  });

  describe("String Mutators (trim, toLowerCase, toUpperCase, normalize)", () => {
    it("trim() mutates string by removing surrounding whitespace", () => {
      const schema = baseSchema.trim();
      expect(schema.parse("  hello world  ")).toBe("hello world");
    });

    it("toLowerCase() mutates string to lowercase", () => {
      const schema = baseSchema.toLowerCase();
      expect(schema.parse("HELLO World")).toBe("hello world");
    });

    it("toUpperCase() mutates string to uppercase", () => {
      const schema = baseSchema.toUpperCase();
      expect(schema.parse("hello world")).toBe("HELLO WORLD");
    });

    it("normalize() applies Unicode normalization forms (NFC default, NFD, NFKC, NFKD)", () => {
      const text = "\u00E9";
      const defaultSchema = baseSchema.normalize();
      expect(defaultSchema.parse(text)).toBe(text.normalize("NFC"));

      const nfdSchema = baseSchema.normalize("NFD");
      expect(nfdSchema.parse(text)).toBe(text.normalize("NFD"));

      const nfkcSchema = baseSchema.normalize("NFKC");
      expect(nfkcSchema.parse(text)).toBe(text.normalize("NFKC"));

      const nfkdSchema = baseSchema.normalize("NFKD");
      expect(nfkdSchema.parse(text)).toBe(text.normalize("NFKD"));
    });
  });

  describe("Direct Check Branches & Fallbacks", () => {
    it("handles checks without explicit metadata limits defined", () => {
      const customBoundSchema = new StringSchema([
        { kind: "min", validate: () => false, message: "Limitless min failure" },
        { kind: "max", validate: () => false, message: "Limitless max failure" },
        { kind: "custom_kind", validate: () => false, message: "Custom format failure" },
      ]);

      const safe = customBoundSchema.safeParse("test");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues).toHaveLength(3);

        const issue0 = safe.issues[0];
        const issue1 = safe.issues[1];
        const issue2 = safe.issues[2];

        expect(issue0?.code).toBe("too_small");
        if (issue0?.code === "too_small") {
          expect(issue0.minimum).toBeUndefined();
        }

        expect(issue1?.code).toBe("too_big");
        if (issue1?.code === "too_big") {
          expect(issue1.maximum).toBeUndefined();
        }

        expect(issue2?.code).toBe("invalid_format");
        if (issue2?.code === "invalid_format") {
          expect(issue2.format).toBe("custom_kind");
          expect(issue2.message).toBe("Custom format failure");
        }
      }
    });
  });

  describe("Compound & Chained Transformations with Validations", () => {
    it("applies mutation before downstream validations", () => {
      const schema = baseSchema.trim().toLowerCase().min(5).email();
      expect(schema.parse("   USER@EXAMPLE.COM   ")).toBe("user@example.com");

      const safe = schema.safeParse("   A@B   ");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues[0]?.code).toBe("too_small");
      }
    });

    it("collects multiple validation issues when multiple checks fail", () => {
      const schema = baseSchema.min(5).startsWith("pre_");
      const safe = schema.safeParse("ab");
      expect(safe.success).toBe(false);
      if (!safe.success) {
        expect(safe.issues).toHaveLength(2);
        expect(safe.issues[0]?.code).toBe("too_small");
        expect(safe.issues[1]?.code).toBe("invalid_format");
      }
    });
  });
});
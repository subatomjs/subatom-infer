import { describe, it, expectTypeOf, assertType, expect } from "vitest";
import type { ValidationError } from "../../src/core/error.js";
import type {
  IssuePathElement,
  BaseIssue,
  InvalidTypeIssue,
  InvalidValueIssue,
  TooSmallIssue,
  TooBigIssue,
  InvalidFormatIssue,
  UnrecognizedKeysIssue,
  InvalidUnionIssue,
  CustomIssue,
  ValidationIssue,
} from "../../src/core/issue.js";

describe("Validation Issue Types & Discriminated Unions", () => {
  describe("IssuePathElement", () => {
    it("satisfies string, number, and symbol variations", () => {
      expectTypeOf<string>().toMatchTypeOf<IssuePathElement>();
      expectTypeOf<number>().toMatchTypeOf<IssuePathElement>();
      expectTypeOf<symbol>().toMatchTypeOf<IssuePathElement>();

      assertType<IssuePathElement>(true);
    });
  });

  describe("BaseIssue & Specific Issue Variants", () => {
    it("validates InvalidTypeIssue contract and discriminant", () => {
      const issue: InvalidTypeIssue = {
        code: "invalid_type",
        path: ["user", 0, "age"],
        message: "Expected number, received string",
        expected: "number",
        received: "string",
      };

      expectTypeOf(issue).toMatchTypeOf<BaseIssue>();
      expectTypeOf(issue.code).toEqualTypeOf<"invalid_type">();
      expectTypeOf(issue.path).toEqualTypeOf<readonly IssuePathElement[]>();
      expect(issue.code).toBe("invalid_type");
    });

    it("validates InvalidValueIssue with optional expected field", () => {
      const withExpected: InvalidValueIssue = {
        code: "invalid_value",
        path: ["status"],
        message: "Invalid status value",
        expected: "active",
        received: "deleted",
      };

      const withoutExpected: InvalidValueIssue = {
        code: "invalid_value",
        path: ["status"],
        message: "Invalid status value",
        received: "deleted",
      };

      expectTypeOf(withExpected).toMatchTypeOf<BaseIssue>();
      expectTypeOf(withoutExpected).toMatchTypeOf<BaseIssue>();
      expectTypeOf(withExpected.expected).toEqualTypeOf<unknown>();
      expectTypeOf(withExpected.received).toEqualTypeOf<unknown>();
    });

    it("validates TooSmallIssue origin types and numeric/bigint bounds", () => {
      const issueNumber: TooSmallIssue = {
        code: "too_small",
        path: ["items"],
        message: "Array is too small",
        minimum: 1,
        inclusive: true,
        origin: "array",
      };

      const issueBigInt: TooSmallIssue = {
        code: "too_small",
        path: ["count"],
        message: "Value is too small",
        minimum: 10n,
        inclusive: false,
        origin: "bigint",
      };

      expectTypeOf(issueNumber.origin).toEqualTypeOf<
        "string" | "number" | "bigint" | "array" | "set" | "map" | "date" | "file"
      >();
      expectTypeOf(issueBigInt.minimum).toEqualTypeOf<number | bigint>();
    });

    it("validates TooBigIssue origin types and numeric/bigint bounds", () => {
      const issue: TooBigIssue = {
        code: "too_big",
        path: ["fileSize"],
        message: "File exceeds upload limit",
        maximum: 1024 * 1024,
        inclusive: true,
        origin: "file",
      };

      expectTypeOf(issue).toMatchTypeOf<BaseIssue>();
      expectTypeOf(issue.maximum).toEqualTypeOf<number | bigint>();
      expectTypeOf(issue.origin).toEqualTypeOf<
        "string" | "number" | "bigint" | "array" | "set" | "map" | "date" | "file"
      >();
    });

    it("validates InvalidFormatIssue with optional validation metadata", () => {
      const issue: InvalidFormatIssue = {
        code: "invalid_format",
        path: ["email"],
        message: "Invalid email format",
        format: "email",
        validation: "rfc_5322",
      };

      const issueWithoutValidation: InvalidFormatIssue = {
        code: "invalid_format",
        path: ["uuid"],
        message: "Invalid UUID",
        format: "uuid",
      };

      expectTypeOf(issue).toMatchTypeOf<BaseIssue>();
      expectTypeOf(issueWithoutValidation.validation).toEqualTypeOf<string | undefined>();
    });

    it("validates UnrecognizedKeysIssue readonly array constraints", () => {
      const issue: UnrecognizedKeysIssue = {
        code: "unrecognized_keys",
        path: [],
        message: "Unrecognized keys in body",
        keys: ["extraField1", "extraField2"],
      };

      expectTypeOf(issue.keys).toEqualTypeOf<readonly string[]>();
      expect(issue.keys).toHaveLength(2);
    });

    it("validates InvalidUnionIssue nested error array", () => {
      const mockValidationError = {} as ValidationError;
      const issue: InvalidUnionIssue = {
        code: "invalid_union",
        path: ["unionField"],
        message: "No union variant matched",
        unionErrors: [mockValidationError],
      };

      expectTypeOf(issue.unionErrors).toEqualTypeOf<readonly ValidationError[]>();
    });

    it("validates CustomIssue optional generic params map", () => {
      const issue: CustomIssue = {
        code: "custom",
        path: ["password"],
        message: "Password does not meet entropy criteria",
        params: { entropyScore: 12, minRequired: 40 },
      };

      const minimalCustom: CustomIssue = {
        code: "custom",
        path: [],
        message: "Custom failure",
      };

      expectTypeOf(issue.params).toEqualTypeOf<Readonly<Record<string, unknown>> | undefined>();
      expectTypeOf(minimalCustom).toMatchTypeOf<CustomIssue>();
    });
  });

  describe("ValidationIssue Discriminated Union Exhaustiveness", () => {
    it("correctly narrows all 8 member variants via switch-case discriminant", () => {
      function processIssue(issue: ValidationIssue): string {
        switch (issue.code) {
          case "invalid_type":
            expectTypeOf(issue).toEqualTypeOf<InvalidTypeIssue>();
            return `type:${issue.expected}`;
          case "invalid_value":
            expectTypeOf(issue).toEqualTypeOf<InvalidValueIssue>();
            return `value:${String(issue.received)}`;
          case "too_small":
            expectTypeOf(issue).toEqualTypeOf<TooSmallIssue>();
            return `min:${issue.minimum.toString()}`;
          case "too_big":
            expectTypeOf(issue).toEqualTypeOf<TooBigIssue>();
            return `max:${issue.maximum.toString()}`;
          case "invalid_format":
            expectTypeOf(issue).toEqualTypeOf<InvalidFormatIssue>();
            return `format:${issue.format}`;
          case "unrecognized_keys":
            expectTypeOf(issue).toEqualTypeOf<UnrecognizedKeysIssue>();
            return `keys:${issue.keys.join(",")}`;
          case "invalid_union":
            expectTypeOf(issue).toEqualTypeOf<InvalidUnionIssue>();
            return `union:${issue.unionErrors.length}`;
          case "custom":
            expectTypeOf(issue).toEqualTypeOf<CustomIssue>();
            return `custom:${issue.message}`;
          default: {
            // Exhaustiveness check: issue will be type 'never' if all variants are handled
            const exhaustiveCheck: any = issue;
            throw new Error(`Unhandled issue variant: ${JSON.stringify(exhaustiveCheck)}`);
          }
        }
      }

      const dummyTypeIssue: ValidationIssue = {
        code: "invalid_type",
        path: ["test"],
        message: "Type error",
        expected: "string",
        received: "number",
      };

      expect(processIssue(dummyTypeIssue)).toBe("type:string");
    });
  });
});
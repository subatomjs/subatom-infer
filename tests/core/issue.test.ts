/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */

import { describe, it, expectTypeOf, expect } from "vitest";
import { ValidationError } from "../../src/core/error.js";
import type {
  IssueCode,
  BaseValidationIssue,
  InvalidTypeIssue,
  InvalidValueIssue,
  InvalidFormatIssue,
  SizeBoundIssue,
  UnrecognizedKeysIssue,
  InvalidUnionIssue,
  CustomIssue,
  ValidationIssue,
  IssueData,
} from "../../src/core/issue.js";

describe("Validation Issue Types & Discriminated Unions", () => {
  describe("IssueCode", () => {
    it("matches all 8 standard issue codes", () => {
      expectTypeOf<
        | "invalid_type"
        | "invalid_value"
        | "invalid_format"
        | "too_small"
        | "too_big"
        | "unrecognized_keys"
        | "invalid_union"
        | "custom"
      >().toEqualTypeOf<IssueCode>();
    });
  });

  describe("BaseValidationIssue & Specific Issue Variants", () => {
    it("validates BaseValidationIssue path element constraints", () => {
      expectTypeOf<readonly (string | number)[]>().toEqualTypeOf<BaseValidationIssue["path"]>();
    });

    it("validates InvalidTypeIssue contract and discriminant", () => {
      const issue: InvalidTypeIssue = {
        code: "invalid_type",
        path: ["user", 0, "age"],
        message: "Expected number, received string",
        expected: "number",
        received: "string",
      };

      expectTypeOf(issue).toMatchTypeOf<BaseValidationIssue>();
      expectTypeOf(issue.code).toEqualTypeOf<"invalid_type">();
      expectTypeOf(issue.path).toEqualTypeOf<readonly (string | number)[]>();
      expect(issue.code).toBe("invalid_type");
      expect(issue.expected).toBe("number");
      expect(issue.received).toBe("string");
    });

    it("validates InvalidValueIssue with and without optional expected field", () => {
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

      expectTypeOf(withExpected).toMatchTypeOf<BaseValidationIssue>();
      expectTypeOf(withoutExpected).toMatchTypeOf<BaseValidationIssue>();
      expectTypeOf(withExpected.expected).toEqualTypeOf<unknown>();
      expectTypeOf(withExpected.received).toEqualTypeOf<unknown>();
      expect(withExpected.expected).toBe("active");
      expect(withoutExpected.expected).toBeUndefined();
    });

    it("validates SizeBoundIssue too_small bounds and origin union", () => {
      const issueNumber: SizeBoundIssue = {
        code: "too_small",
        path: ["items"],
        message: "Array is too small",
        minimum: 1,
        inclusive: true,
        origin: "array",
      };

      const issueBigInt: SizeBoundIssue = {
        code: "too_small",
        path: ["count"],
        message: "Value is too small",
        minimum: 10n,
        inclusive: false,
        origin: "bigint",
      };

      expectTypeOf(issueNumber.origin).toEqualTypeOf<
        "string" | "number" | "bigint" | "array" | "set" | "map" | "file"
      >();
      expectTypeOf(issueBigInt.minimum).toEqualTypeOf<number | bigint | undefined>();
      expect(issueNumber.code).toBe("too_small");
      expect(issueNumber.minimum).toBe(1);
      expect(issueBigInt.minimum).toBe(10n);
    });

    it("validates SizeBoundIssue too_big bounds and origin union", () => {
      const issue: SizeBoundIssue = {
        code: "too_big",
        path: ["fileSize"],
        message: "File exceeds upload limit",
        maximum: 1024 * 1024,
        inclusive: true,
        origin: "file",
      };

      expectTypeOf(issue).toMatchTypeOf<BaseValidationIssue>();
      expectTypeOf(issue.maximum).toEqualTypeOf<number | bigint | undefined>();
      expectTypeOf(issue.origin).toEqualTypeOf<
        "string" | "number" | "bigint" | "array" | "set" | "map" | "file"
      >();
      expect(issue.code).toBe("too_big");
      expect(issue.maximum).toBe(1048576);
    });

    it("validates InvalidFormatIssue format descriptor", () => {
      const issue: InvalidFormatIssue = {
        code: "invalid_format",
        path: ["email"],
        message: "Invalid email format",
        format: "email",
      };

      expectTypeOf(issue).toMatchTypeOf<BaseValidationIssue>();
      expectTypeOf(issue.format).toEqualTypeOf<string>();
      expect(issue.format).toBe("email");
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
      expect(issue.keys).toContain("extraField1");
    });

    it("validates InvalidUnionIssue nested error array", () => {
      const mockValidationError = new ValidationError([]);
      const issue: InvalidUnionIssue = {
        code: "invalid_union",
        path: ["unionField"],
        message: "No union variant matched",
        unionErrors: [mockValidationError],
      };

      expectTypeOf(issue.unionErrors).toEqualTypeOf<readonly ValidationError[]>();
      expect(issue.unionErrors).toHaveLength(1);
      expect(issue.unionErrors[0]).toBeInstanceOf(ValidationError);
    });

    it("validates CustomIssue optional generic params map", () => {
      const issueWithParams: CustomIssue = {
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

      expectTypeOf(issueWithParams.params).toEqualTypeOf<Record<string, unknown> | undefined>();
      expectTypeOf(minimalCustom).toMatchTypeOf<CustomIssue>();
      expect(issueWithParams.params?.entropyScore).toBe(12);
      expect(minimalCustom.params).toBeUndefined();
    });
  });

  describe("ValidationIssue Discriminated Union Exhaustiveness", () => {
    it("narrows all member variants cleanly via switch-case discriminant", () => {
      function processIssue(issue: ValidationIssue): string {
        switch (issue.code) {
          case "invalid_type":
            expectTypeOf(issue).toEqualTypeOf<InvalidTypeIssue>();
            return `type:${issue.expected}`;
          case "invalid_value":
            expectTypeOf(issue).toEqualTypeOf<InvalidValueIssue>();
            return `value:${String(issue.received)}`;
          case "too_small":
          case "too_big":
            expectTypeOf(issue).toEqualTypeOf<SizeBoundIssue>();
            return `${issue.code}:${String(issue.minimum ?? issue.maximum)}`;
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
            const exhaustiveCheck: never = issue;
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

      const dummySizeIssue: ValidationIssue = {
        code: "too_small",
        path: ["val"],
        message: "Too small",
        minimum: 5,
        inclusive: true,
        origin: "number",
      };

      expect(processIssue(dummyTypeIssue)).toBe("type:string");
      expect(processIssue(dummySizeIssue)).toBe("too_small:5");
    });
  });

  describe("IssueData Type", () => {
    it("excludes 'path' property while retaining other variant properties", () => {
      const issueData: IssueData = {
        code: "invalid_type",
        expected: "string",
        received: "number",
        message: "Expected string",
      };

      expectTypeOf(issueData).toMatchTypeOf<Omit<InvalidTypeIssue, "path">>();
      expect("path" in issueData).toBe(false);
      expect(issueData.code).toBe("invalid_type");
    });
  });
});
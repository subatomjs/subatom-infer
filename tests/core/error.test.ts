import { describe, it, expect } from "vitest";
import { ValidationError, type FormattedError } from "../../src/core/error.js";
import type { ValidationIssue } from "../../src/core/issue.js";

describe("ValidationError", () => {
  describe("Constructor & Prototype Chain", () => {
    it("correctly sets error properties and maintains instance of Error and ValidationError", () => {
      const issues: ValidationIssue[] = [
        {
          code: "invalid_type",
          path: ["user", "name"],
          message: "Expected string, received number",
          expected: "string",
          received: "number",
        },
      ];

      const err = new ValidationError(issues);

      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.name).toBe("ValidationError");
      expect(err.issues).toHaveLength(1);
      expect(err.issues).toEqual(issues);
      expect(Object.isFrozen(err.issues)).toBe(true);
    });

    it("freezes the internal issues array to prevent external mutations", () => {
      const mutableIssues: ValidationIssue[] = [
        {
          code: "custom",
          path: [],
          message: "Root error",
        },
      ];

      const err = new ValidationError(mutableIssues);

      expect(() => {
        (err.issues as ValidationIssue[]).push({
          code: "custom",
          path: [],
          message: "Mutated",
        });
      }).toThrowError(TypeError);

      mutableIssues.push({ code: "custom", path: [], message: "External mutation" });
      expect(err.issues).toHaveLength(1);
    });

    it("formats summary message when initialized with an empty issue array", () => {
      const err = new ValidationError([]);

      expect(err.message).toBe("Validation failed: ");
      expect(err.issues).toEqual([]);
    });

    it("formats summary message correctly for mixed root and nested issues", () => {
      const issues: ValidationIssue[] = [
        {
          code: "custom",
          path: [],
          message: "Global form error",
        },
        {
          code: "too_small",
          path: ["age"],
          message: "Must be at least 18",
          minimum: 18,
          inclusive: true,
          origin: "number",
        },
        {
          code: "invalid_format",
          path: ["profile", "contact", "email"],
          message: "Invalid email",
          format: "email",
        },
      ];

      const err = new ValidationError(issues);

      expect(err.message).toBe(
        "Validation failed: [<root>]: Global form error; [age]: Must be at least 18; [profile.contact.email]: Invalid email"
      );
    });
  });

  describe("flatten()", () => {
    it("partitions root issues into formErrors and joined dot-path issues into fieldErrors", () => {
      const issues: ValidationIssue[] = [
        {
          code: "custom",
          path: [],
          message: "Form submission expired",
        },
        {
          code: "invalid_type",
          path: [],
          message: "Payload cannot be empty",
          expected: "object",
          received: "undefined",
        },
        {
          code: "too_small",
          path: ["username"],
          message: "Too short",
          minimum: 3,
          inclusive: true,
          origin: "string",
        },
        {
          code: "invalid_format",
          path: ["username"],
          message: "Must be alphanumeric",
          format: "alphanumeric",
        },
        {
          code: "invalid_type",
          path: ["addresses", 0, "zipCode"],
          message: "Invalid zip code",
          expected: "string",
          received: "number",
        },
      ];

      const err = new ValidationError(issues);
      const flattened = err.flatten();

      expect(flattened).toEqual({
        formErrors: ["Form submission expired", "Payload cannot be empty"],
        fieldErrors: {
          username: ["Too short", "Must be alphanumeric"],
          "addresses.0.zipCode": ["Invalid zip code"],
        },
      });
    });

    it("returns empty containers when there are no issues", () => {
      const err = new ValidationError([]);
      const flattened = err.flatten();

      expect(flattened).toEqual({
        formErrors: [],
        fieldErrors: {},
      });
    });
  });

  describe("format()", () => {
    it("returns root _errors array when there are no issues", () => {
      const err = new ValidationError([]);
      const formatted = err.format();

      expect(formatted).toEqual({
        _errors: [],
      });
    });

    it("builds a deep nested error hierarchy matching issue paths and multiple issues per leaf", () => {
      const issues: ValidationIssue[] = [
        {
          code: "custom",
          path: [],
          message: "Top-level failure",
        },
        {
          code: "too_small",
          path: ["user", "age"],
          message: "Age must be >= 21",
          minimum: 21,
          inclusive: true,
          origin: "number",
        },
        {
          code: "invalid_type",
          path: ["user", "age"],
          message: "Must be integer",
          expected: "integer",
          received: "float",
        },
        {
          code: "invalid_format",
          path: ["user", "contacts", "emails", 0],
          message: "Invalid email structure",
          format: "email",
        },
      ];

      const err = new ValidationError(issues);
      const formatted: FormattedError = err.format();

      expect(formatted).toEqual({
        _errors: ["Top-level failure"],
        user: {
          _errors: [],
          age: {
            _errors: ["Age must be >= 21", "Must be integer"],
          },
          contacts: {
            _errors: [],
            emails: {
              _errors: [],
              "0": {
                _errors: ["Invalid email structure"],
              },
            },
          },
        },
      });
    });

    it("accurately handles multiple sibling fields at the same level sharing parent paths", () => {
      const issues: ValidationIssue[] = [
        {
          code: "invalid_type",
          path: ["user", "firstName"],
          message: "First name is required",
          expected: "string",
          received: "undefined",
        },
        {
          code: "invalid_type",
          path: ["user", "lastName"],
          message: "Last name is required",
          expected: "string",
          received: "undefined",
        },
      ];

      const err = new ValidationError(issues);
      const formatted = err.format();

      expect(formatted).toEqual({
        _errors: [],
        user: {
          _errors: [],
          firstName: {
            _errors: ["First name is required"],
          },
          lastName: {
            _errors: ["Last name is required"],
          },
        },
      });
    });
  });

  describe("prettifyError()", () => {
    it("renders formatted CLI string with root indicator and dot-separated paths", () => {
      const issues: ValidationIssue[] = [
        {
          code: "custom",
          path: [],
          message: "Root failure",
        },
        {
          code: "too_small",
          path: ["members", 0, "name"],
          message: "Name too short",
          minimum: 2,
          inclusive: true,
          origin: "string",
        },
      ];

      const err = new ValidationError(issues);
      const pretty = err.prettifyError();

      const expected = [
        "Validation Errors:",
        "  → [<root>] (custom): Root failure",
        "  → [members.0.name] (too_small): Name too short",
      ].join("\n");

      expect(pretty).toBe(expected);
    });

    it("outputs only the header when there are no issues", () => {
      const err = new ValidationError([]);
      expect(err.prettifyError()).toBe("Validation Errors:");
    });
  });
});
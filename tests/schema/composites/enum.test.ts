import { describe, it, expect, expectTypeOf } from "vitest";
import {
  EnumSchema,
  NativeEnumSchema,
} from "../../../src/schemas/composites/enum.js";
import { ValidationError } from "../../../src/core/error.js";

describe("EnumSchema", () => {
  const roles = ["admin", "editor", "viewer"] as const;
  const roleSchema = new EnumSchema(roles);

  describe("Constructor & Properties", () => {
    it("freezes options array and enum mapping object", () => {
      expect(roleSchema.options).toEqual(["admin", "editor", "viewer"]);
      expect(Object.isFrozen(roleSchema.options)).toBe(true);

      expect(roleSchema.enum).toEqual({
        admin: "admin",
        editor: "editor",
        viewer: "viewer",
      });
      expect(Object.isFrozen(roleSchema.enum)).toBe(true);
    });

    it("verifies static TypeScript output types", () => {
      expectTypeOf(roleSchema._output).toEqualTypeOf<"admin" | "editor" | "viewer">();
      expectTypeOf(roleSchema._input).toEqualTypeOf<"admin" | "editor" | "viewer">();
    });
  });

  describe("Validation & Parsing", () => {
    it("successfully parses valid enum members", () => {
      expect(roleSchema.parse("admin")).toBe("admin");
      expect(roleSchema.parse("editor")).toBe("editor");
      expect(roleSchema.parse("viewer")).toBe("viewer");
    });

    it("fails when input is not a string", () => {
      const nonStrings: unknown[] = [123, true, null, undefined, {}, []];

      for (const input of nonStrings) {
        const result = roleSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(ValidationError);
          const issue = result.error.issues[0];
          expect(issue?.code).toBe("invalid_value");
          if (issue?.code === "invalid_value") {
            expect(issue.expected).toBe("admin | editor | viewer");
            expect(issue.received).toBe(input);
            expect(issue.message).toBe(
              `Expected "admin" | "editor" | "viewer", received ${JSON.stringify(input)}`
            );
          }
        }
      }
    });

    it("fails when input is a string but not in options", () => {
      const result = roleSchema.safeParse("superadmin");
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        expect(issue?.code).toBe("invalid_value");
        if (issue?.code === "invalid_value") {
          expect(issue.expected).toBe("admin | editor | viewer");
          expect(issue.received).toBe("superadmin");
          expect(issue.message).toBe(
            'Expected "admin" | "editor" | "viewer", received "superadmin"'
          );
        }
      }
    });
  });

  describe("extract()", () => {
    it("creates a new EnumSchema with a valid subset of options", () => {
      const privilegedSchema = roleSchema.extract(["admin", "editor"] as const);

      expect(privilegedSchema).toBeInstanceOf(EnumSchema);
      expect(privilegedSchema.options).toEqual(["admin", "editor"]);
      expect(privilegedSchema.parse("admin")).toBe("admin");
      expect(privilegedSchema.parse("editor")).toBe("editor");
      expect(privilegedSchema.safeParse("viewer").success).toBe(false);
    });

    it("filters out values that are not present in original options", () => {
      const extracted = roleSchema.extract([
        "admin",
        "guest" as unknown as "admin",
      ]);

      expect(extracted.options).toEqual(["admin"]);
      expect(extracted.parse("admin")).toBe("admin");
      expect(extracted.safeParse("guest").success).toBe(false);
    });

    it("throws an error when extracting with zero valid matching options", () => {
      expect(() => {
        roleSchema.extract(["unknown_1" as "admin", "unknown_2" as "admin"]);
      }).toThrowError(
        "EnumSchema.extract requires at least one valid matching option."
      );
    });
  });

  describe("exclude()", () => {
    it("creates a new EnumSchema excluding specified options", () => {
      const nonAdminSchema = roleSchema.exclude(["admin"] as const);

      expect(nonAdminSchema).toBeInstanceOf(EnumSchema);
      expect(nonAdminSchema.options).toEqual(["editor", "viewer"]);
      expect(nonAdminSchema.parse("editor")).toBe("editor");
      expect(nonAdminSchema.parse("viewer")).toBe("viewer");
      expect(nonAdminSchema.safeParse("admin").success).toBe(false);
    });

    it("throws an error when exclude results in an empty options array", () => {
      expect(() => {
        roleSchema.exclude(["admin", "editor", "viewer"] as const);
      }).toThrowError(
        "EnumSchema.exclude cannot result in an empty options array."
      );
    });
  });
});

describe("NativeEnumSchema", () => {
  describe("TypeScript String Enum", () => {
    enum Status {
      Active = "ACTIVE",
      Inactive = "INACTIVE",
      Pending = "PENDING",
    }

    const statusSchema = new NativeEnumSchema(Status);

    it("populates enumValues correctly", () => {
      expect(statusSchema.enumValues.has("ACTIVE")).toBe(true);
      expect(statusSchema.enumValues.has("INACTIVE")).toBe(true);
      expect(statusSchema.enumValues.has("PENDING")).toBe(true);
      expect(statusSchema.enumValues.has("Active")).toBe(false);
    });

    it("parses valid enum values", () => {
      expect(statusSchema.parse(Status.Active)).toBe("ACTIVE");
      expect(statusSchema.parse("INACTIVE")).toBe("INACTIVE");
    });

    it("fails when parsing invalid values", () => {
      const result = statusSchema.safeParse("DELETED");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        const issue = result.error.issues[0];
        expect(issue?.code).toBe("invalid_value");
        if (issue?.code === "invalid_value") {
          expect(issue.received).toBe("DELETED");
          expect(issue.message).toBe('Invalid enum value: received "DELETED"');
        }
      }
    });
  });

  describe("TypeScript Numeric Enum", () => {
    enum Direction {
      North = 0,
      South = 1,
      East = 2,
      West = 3,
    }

    const directionSchema = new NativeEnumSchema(Direction);

    it("handles reverse numeric mappings by including enum values", () => {
      expect(directionSchema.enumValues.has(0)).toBe(true);
      expect(directionSchema.enumValues.has(1)).toBe(true);
      expect(directionSchema.enumValues.has(2)).toBe(true);
      expect(directionSchema.enumValues.has(3)).toBe(true);
    });

    it("parses valid numeric enum values", () => {
      expect(directionSchema.parse(Direction.North)).toBe(0);
      expect(directionSchema.parse(1)).toBe(1);
    });

    it("fails when parsing invalid numeric or non-enum values", () => {
      expect(directionSchema.safeParse(99).success).toBe(false);
      expect(directionSchema.safeParse("North").success).toBe(false);
      expect(directionSchema.safeParse(null).success).toBe(false);
    });
  });

  describe("Const Object Enum", () => {
    const LogLevel = {
      Debug: "DEBUG",
      Info: "INFO",
      Warn: "WARN",
      Error: "ERROR",
    } as const;

    const logLevelSchema = new NativeEnumSchema(LogLevel);

    it("parses valid const object values", () => {
      expect(logLevelSchema.parse(LogLevel.Debug)).toBe("DEBUG");
      expect(logLevelSchema.parse("WARN")).toBe("WARN");
    });

    it("fails with invalid value issue and formatted JSON message", () => {
      const result = logLevelSchema.safeParse({ level: "DEBUG" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        expect(issue?.code).toBe("invalid_value");
        if (issue?.code === "invalid_value") {
          expect(issue.message).toBe('Invalid enum value: received {"level":"DEBUG"}');
        }
      }
    });
  });
});
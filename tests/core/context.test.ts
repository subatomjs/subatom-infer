/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import type { IssueData, ValidationIssue } from "../../src/core/issue.js";
import {
  createParseContext,
  nestContext,
  addIssue,
  type ParseContext,
} from "../../src/core/context.js";

describe("ParseContext Module", () => {
  describe("createParseContext", () => {
    it("initializes context with default arguments (synchronous, empty path)", () => {
      const ctx = createParseContext();

      expect(ctx.async).toBe(false);
      expect(ctx.issues).toEqual([]);
      expect(ctx.path).toEqual([]);
    });

    it("initializes context correctly in asynchronous mode", () => {
      const ctx = createParseContext(true);

      expect(ctx.async).toBe(true);
      expect(ctx.issues).toEqual([]);
      expect(ctx.path).toEqual([]);
    });

    it("initializes context with a predefined custom path snapshot", () => {
      const initialPath = ["root", 0];
      const ctx = createParseContext(true, initialPath);

      expect(ctx.async).toBe(true);
      expect(ctx.path).toEqual(["root", 0]);
      expect(ctx.issues).toEqual([]);
    });
  });

  describe("nestContext", () => {
    it("creates a new child context with an appended string path segment", () => {
      const rootCtx = createParseContext(false);
      const childCtx = nestContext(rootCtx, "user");

      expect(childCtx.path).toEqual(["user"]);
      expect(childCtx.async).toBe(rootCtx.async);
      expect(childCtx.issues).toBe(rootCtx.issues);
    });

    it("creates deeply nested contexts with numeric index path segments", () => {
      const rootCtx = createParseContext(true);
      const level1 = nestContext(rootCtx, "items");
      const level2 = nestContext(level1, 0);
      const level3 = nestContext(level2, "name");

      expect(level3.path).toEqual(["items", 0, "name"]);
      expect(level3.async).toBe(true);
      expect(level3.issues).toBe(rootCtx.issues);
    });

    it("does not mutate the parent context path when nesting", () => {
      const parent = createParseContext(false);
      const child = nestContext(parent, "sub");

      expect(parent.path).toEqual([]);
      expect(child.path).toEqual(["sub"]);
      expect(parent.path).not.toBe(child.path);
    });
  });

  describe("addIssue", () => {
    it("appends an issue with fallback context path when issueData.path is omitted", () => {
      const ctx = createParseContext(false);
      const issueData: IssueData = {
        code: "invalid_type",
        expected: "string",
        received: "number",
        message: "Expected string, received number",
      };

      addIssue(ctx, issueData);

      expect(ctx.issues).toHaveLength(1);
      expect(ctx.issues[0]).toEqual({
        code: "invalid_type",
        expected: "string",
        received: "number",
        message: "Expected string, received number",
        path: [],
      });
    });

    it("attaches the current nested path snapshot to the created issue", () => {
      const rootCtx = createParseContext(false);
      const userCtx = nestContext(rootCtx, "user");
      const emailCtx = nestContext(userCtx, "email");

      const issueData: IssueData = {
        code: "custom",
        message: "Email is required",
      };

      addIssue(emailCtx, issueData);

      expect(rootCtx.issues).toHaveLength(1);
      expect(rootCtx.issues[0]).toEqual({
        code: "custom",
        message: "Email is required",
        path: ["user", "email"],
      });
    });

    it("uses the explicitly provided issueData.path over ctx.path when present", () => {
      const rootCtx = createParseContext(false);
      const nestedCtx = nestContext(rootCtx, "fallbackPath");

      const issueDataWithExplicitPath: IssueData & { path: readonly (string | number)[] } = {
        code: "custom",
        message: "Explicit override path",
        path: ["overridden", "custom", 1],
      };

      addIssue(nestedCtx, issueDataWithExplicitPath);

      expect(rootCtx.issues).toHaveLength(1);
      expect(rootCtx.issues[0]).toEqual({
        code: "custom",
        message: "Explicit override path",
        path: ["overridden", "custom", 1],
      });
    });

    it("shares and accumulates the same issues array across sibling and nested contexts", () => {
      const rootCtx = createParseContext(false);
      const fieldA = nestContext(rootCtx, "a");
      const fieldB = nestContext(rootCtx, "b");

      addIssue(fieldA, { code: "custom", message: "Error A" });
      addIssue(fieldB, { code: "custom", message: "Error B" });

      expect(rootCtx.issues).toHaveLength(2);
      expect(rootCtx.issues[0]?.path).toEqual(["a"]);
      expect(rootCtx.issues[1]?.path).toEqual(["b"]);
    });
  });

  describe("Type Level Invariants", () => {
    it("verifies ParseContext structure and issue types", () => {
      expectTypeOf<ParseContext>().toEqualTypeOf<{
        readonly async: boolean;
        readonly path: readonly (string | number)[];
        readonly issues: ValidationIssue[];
      }>();
    });
  });
});
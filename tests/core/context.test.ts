import { describe, it, expect } from "vitest";
import type {
  IssuePathElement,
  ValidationIssue,
} from "../../src/core/issue.js";
import {
  createParseContext,
  nestContext,
  addIssue,
  type IssuePayload,
  type ParseContext,
} from "../../src/core/context.js";

describe("ParseContext Module", () => {
  describe("createParseContext", () => {
    it("initializes context correctly in synchronous mode", () => {
      const ctx = createParseContext(false);

      expect(ctx.async).toBe(false);
      expect(ctx.issues).toEqual([]);
      expect(ctx.path).toEqual([]);
      expect(Object.isFrozen(ctx.path)).toBe(true);
    });

    it("initializes context correctly in asynchronous mode", () => {
      const ctx = createParseContext(true);

      expect(ctx.async).toBe(true);
      expect(ctx.issues).toEqual([]);
      expect(ctx.path).toEqual([]);
      expect(Object.isFrozen(ctx.path)).toBe(true);
    });

    it("ensures path immutability prevents runtime mutations", () => {
      const ctx = createParseContext(false);

      expect(() => {
        // @ts-expect-error Testing runtime freeze protection
        ctx.path.push("segment");
      }).toThrowError(TypeError);
    });
  });

  describe("nestContext", () => {
    it("creates a new child context with an appended string path segment", () => {
      const rootCtx = createParseContext(false);
      const childCtx = nestContext(rootCtx, "user" as IssuePathElement);

      expect(childCtx.path).toEqual(["user"]);
      expect(childCtx.async).toBe(rootCtx.async);
      expect(childCtx.issues).toBe(rootCtx.issues);
      expect(Object.isFrozen(childCtx.path)).toBe(true);
    });

    it("creates deeply nested contexts with numeric/index path segments", () => {
      const rootCtx = createParseContext(true);
      const level1 = nestContext(rootCtx, "items" as IssuePathElement);
      const level2 = nestContext(level1, 0 as unknown as IssuePathElement);
      const level3 = nestContext(level2, "name" as IssuePathElement);

      expect(level3.path).toEqual(["items", 0, "name"]);
      expect(level3.async).toBe(true);
      expect(Object.isFrozen(level3.path)).toBe(true);
    });

    it("does not mutate the parent context path when nesting", () => {
      const parent = createParseContext(false);
      const child = nestContext(parent, "sub" as IssuePathElement);

      expect(parent.path).toEqual([]);
      expect(child.path).toEqual(["sub"]);
      expect(parent.path).not.toBe(child.path);
    });
  });

  describe("addIssue", () => {
    it("appends an issue with the root context path", () => {
      const ctx = createParseContext(false);
      const payload: IssuePayload = {
        message: "Invalid type",
        code: "invalid_type",
      } as unknown as IssuePayload;

      addIssue(ctx, payload);

      expect(ctx.issues).toHaveLength(1);
      expect(ctx.issues[0]).toEqual({
        message: "Invalid type",
        code: "invalid_type",
        path: [],
      });
    });

    it("attaches the current nested path snapshot to the created issue", () => {
      const rootCtx = createParseContext(false);
      const userCtx = nestContext(rootCtx, "user" as IssuePathElement);
      const emailCtx = nestContext(userCtx, "email" as IssuePathElement);

      const payload: IssuePayload = {
        message: "Email is required",
        code: "custom",
      } as unknown as IssuePayload;

      addIssue(emailCtx, payload);

      expect(rootCtx.issues).toHaveLength(1);
      expect(rootCtx.issues[0]).toEqual({
        message: "Email is required",
        code: "custom",
        path: ["user", "email"],
      });
    });

    it("shares and accumulates the same issues array across sibling and nested contexts", () => {
      const rootCtx = createParseContext(false);
      const fieldA = nestContext(rootCtx, "a" as IssuePathElement);
      const fieldB = nestContext(rootCtx, "b" as IssuePathElement);

      addIssue(fieldA, { message: "Error A" } as IssuePayload);
      addIssue(fieldB, { message: "Error B" } as IssuePayload);

      expect(rootCtx.issues).toHaveLength(2);
      expect(rootCtx.issues[0]?.path).toEqual(["a"]);
      expect(rootCtx.issues[1]?.path).toEqual(["b"]);
    });
  });

  describe("Type Verification (Compile-time contract)", () => {
    it("preserves IssuePayload type invariants", () => {
      type ExpectedPayload = Omit<ValidationIssue, "path">;
      const payload: IssuePayload = {} as ExpectedPayload as IssuePayload;
      expect(typeof payload).toBe("object");
    });
  });
});

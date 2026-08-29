import { Schema } from "../../core/schema.js";
import { addIssue, type ParseContext } from "../../core/context.js";
import {
  makeFailure,
  makeSuccess,
  type DynamicParseReturnType,
} from "../../core/result.js";

export interface UploadFileOptions {
  readonly filename: string;
  readonly encoding: string;
  readonly mimetype: string;
  readonly storageType: "memory" | "disk";
  readonly path?: string;
  readonly size?: number;

  readonly destroyed?: boolean;
  readonly bufferContent?: Buffer;

  readonly buffer?: () => Promise<Buffer>;
  readonly stream?: () => unknown;
  readonly destroy?: () => Promise<void>;
}

export interface FilesCheck {
  readonly kind: string;
  readonly validate: (files: readonly UploadFileOptions[]) => boolean;
  readonly message: string;
  readonly value?: unknown;
}

type FilesCountCheck = FilesCheck & {
  readonly count: number;
};

type FilesSizeCheck = FilesCheck & {
  readonly bytes: number;
};

type FilesMimeCheck = FilesCheck & {
  readonly mimeTypes: readonly string[];
};

export class FilesSchema extends Schema<
  readonly UploadFileOptions[],
  readonly UploadFileOptions[]
> {
  readonly checks: readonly FilesCheck[];

  constructor(checks: readonly FilesCheck[] = []) {
    super();
    this.checks = Object.freeze([...checks]);
  }

  _parse(
    input: unknown,
    ctx: ParseContext,
  ): DynamicParseReturnType<UploadFileOptions[]> {
    if (!Array.isArray(input)) {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "UploadedFile[]",
        received: getReceivedType(input),
        message: "Expected an array of uploaded files",
      });

      return makeFailure(ctx.issues);
    }

    const files: UploadFileOptions[] = [];

    for (let index = 0; index < input.length; index++) {
      const inputFile = input[index];

      if (!isUploadFile(inputFile)) {
        addIssue(ctx, {
          code: "invalid_type",
          expected: "UploadedFile",
          received: getReceivedType(inputFile),
          path: [...ctx.path, index],
          message: "Expected a valid uploaded file",
        });

        continue;
      }

      files.push(inputFile);
    }

    /*
     * Stop here if one or more files have an
     * invalid structure. This prevents additional
     * file checks from producing misleading errors.
     */
    if (ctx.issues.length > 0) {
      return makeFailure(ctx.issues);
    }

    for (const check of this.checks) {
      if (!check.validate(files)) {
        this.addCheckIssue(ctx, files, check);
      }
    }

    if (ctx.issues.length > 0) {
      return makeFailure(ctx.issues);
    }

    return makeSuccess(files);
  }

  private addCheckIssue(
    ctx: ParseContext,
    files: readonly UploadFileOptions[],
    check: FilesCheck,
  ): void {
    switch (check.kind) {
      case "min": {
        const countCheck = check as FilesCountCheck;

        addIssue(ctx, {
          code: "too_small",
          minimum: countCheck.count,
          inclusive: true,
          origin: "array",
          message: check.message,
        });

        return;
      }

      case "max": {
        const countCheck = check as FilesCountCheck;

        addIssue(ctx, {
          code: "too_big",
          maximum: countCheck.count,
          inclusive: true,
          origin: "array",
          message: check.message,
        });

        return;
      }

      case "length": {
        const countCheck = check as FilesCountCheck;

        addIssue(ctx, {
          code: "invalid_value",
          expected: countCheck.count,
          received: files.length,
          message: check.message,
        });

        return;
      }

      case "min_each": {
        const sizeCheck = check as FilesSizeCheck;

        const invalidIndexes = files
          .map((file, index) =>
            file.size !== undefined && file.size < sizeCheck.bytes ? index : -1,
          )
          .filter((index) => index !== -1);

        for (const index of invalidIndexes) {
          // const file = files[index];

          addIssue(ctx, {
            code: "too_small",
            minimum: sizeCheck.bytes,
            inclusive: true,
            origin: "file",
            path: [...ctx.path, index],
            message: check.message,
          });
        }

        return;
      }

      case "max_each": {
        const sizeCheck = check as FilesSizeCheck;

        const invalidIndexes = files
          .map((file, index) =>
            file.size !== undefined && file.size > sizeCheck.bytes ? index : -1,
          )
          .filter((index) => index !== -1);

        for (const index of invalidIndexes) {
          // const file = files[index];

          addIssue(ctx, {
            code: "too_big",
            maximum: sizeCheck.bytes,
            inclusive: true,
            origin: "file",
            // received: file?.size,
            path: [...ctx.path, index],
            message: check.message,
          });
        }

        return;
      }

      case "mime": {
        const mimeCheck = check as FilesMimeCheck;

        const invalidIndexes = files
          .map((file, index) =>
            mimeCheck.mimeTypes.some((expected) =>
              matchesMimeType(file.mimetype, expected),
            )
              ? -1
              : index,
          )
          .filter((index) => index !== -1);

        for (const index of invalidIndexes) {
          const file = files[index];

          addIssue(ctx, {
            code: "invalid_value",
            expected: mimeCheck.mimeTypes,
            received: file?.mimetype,
            path: [...ctx.path, index],
            message: check.message,
          });
        }

        return;
      }

      case "extension": {
        const invalidIndexes = files
          .map((file, index) =>
            hasAllowedExtension(file.filename, check.value as readonly string[])
              ? -1
              : index,
          )
          .filter((index) => index !== -1);

        for (const index of invalidIndexes) {
          const file = files[index];

          addIssue(ctx, {
            code: "invalid_value",
            expected: check.value,
            received: file?.filename,
            path: [...ctx.path, index],
            message: check.message,
          });
        }

        return;
      }

      case "storage": {
        const invalidIndexes = files
          .map((file, index) => (file.storageType === check.value ? -1 : index))
          .filter((index) => index !== -1);

        for (const index of invalidIndexes) {
          const file = files[index];

          addIssue(ctx, {
            code: "invalid_value",
            expected: check.value,
            received: file?.storageType,
            path: [...ctx.path, index],
            message: check.message,
          });
        }

        return;
      }

      default: {
        addIssue(ctx, {
          code: "invalid_value",
          received: files,
          message: check.message,
        });
      }
    }
  }

  private addCheck(check: FilesCheck): FilesSchema {
    return new FilesSchema([...this.checks, check]);
  }

  min(count: number, message?: string): FilesSchema {
    assertValidCount(count);

    return this.addCheck({
      kind: "min",
      count,
      validate: (files) => files.length >= count,
      message:
        message ?? `At least ${count} file${count === 1 ? "" : "s"} required`,
    } as FilesCountCheck);
  }

  max(count: number, message?: string): FilesSchema {
    assertValidCount(count);

    return this.addCheck({
      kind: "max",
      count,
      validate: (files) => files.length <= count,
      message:
        message ??
        `No more than ${count} file${count === 1 ? "" : "s"} allowed`,
    } as FilesCountCheck);
  }

  length(count: number, message?: string): FilesSchema {
    assertValidCount(count);

    return this.addCheck({
      kind: "length",
      count,
      validate: (files) => files.length === count,
      message:
        message ?? `Exactly ${count} file${count === 1 ? "" : "s"} required`,
    } as FilesCountCheck);
  }

  mime(mimeType: string | readonly string[], message?: string): FilesSchema {
    const mimeTypes = normalizeMimeTypes(mimeType);

    return this.addCheck({
      kind: "mime",
      mimeTypes,
      value: mimeTypes,
      validate: (files) =>
        files.every((file) =>
          mimeTypes.some((expected) =>
            matchesMimeType(file.mimetype, expected),
          ),
        ),
      message:
        message ?? `All files must match one of: ${mimeTypes.join(", ")}`,
    } as FilesMimeCheck);
  }

  extension(
    extension: string | readonly string[],
    message?: string,
  ): FilesSchema {
    const extensions = normalizeExtensions(extension);

    return this.addCheck({
      kind: "extension",
      value: extensions,
      validate: (files) =>
        files.every((file) => hasAllowedExtension(file.filename, extensions)),
      message:
        message ??
        `All files must have one of these extensions: ${extensions
          .map((value) => `.${value}`)
          .join(", ")}`,
    });
  }

  storage(storageType: "memory" | "disk", message?: string): FilesSchema {
    return this.addCheck({
      kind: "storage",
      value: storageType,
      validate: (files) =>
        files.every((file) => file.storageType === storageType),
      message: message ?? `All files must use "${storageType}" storage`,
    });
  }

  maxEach(bytes: number, message?: string): FilesSchema {
    assertValidByteLimit(bytes, "max");

    return this.addCheck({
      kind: "max_each",
      bytes,
      value: bytes,
      validate: (files) =>
        files.every((file) => file.size !== undefined && file.size <= bytes),
      message: message ?? `Each file must not exceed ${formatBytes(bytes)}`,
    } as FilesSizeCheck);
  }

  minEach(bytes: number, message?: string): FilesSchema {
    assertValidByteLimit(bytes, "min");

    return this.addCheck({
      kind: "min_each",
      bytes,
      value: bytes,
      validate: (files) =>
        files.every((file) => file.size !== undefined && file.size >= bytes),
      message: message ?? `Each file must be at least ${formatBytes(bytes)}`,
    } as FilesSizeCheck);
  }
}

function isUploadFile(input: unknown): input is UploadFileOptions {
  if (!isRecord(input)) {
    return false;
  }

  if (typeof input.filename !== "string" || input.filename.length === 0) {
    return false;
  }

  if (typeof input.encoding !== "string") {
    return false;
  }

  if (typeof input.mimetype !== "string" || input.mimetype.length === 0) {
    return false;
  }

  if (input.storageType !== "memory" && input.storageType !== "disk") {
    return false;
  }

  if (
    input.size !== undefined &&
    (typeof input.size !== "number" ||
      !Number.isFinite(input.size) ||
      !Number.isSafeInteger(input.size) ||
      input.size < 0)
  ) {
    return false;
  }

  if (
    input.path !== undefined &&
    (typeof input.path !== "string" || input.path.length === 0)
  ) {
    return false;
  }

  if (input.destroyed !== undefined && typeof input.destroyed !== "boolean") {
    return false;
  }

  if (input.bufferContent !== undefined && !isBuffer(input.bufferContent)) {
    return false;
  }

  if (input.buffer !== undefined && typeof input.buffer !== "function") {
    return false;
  }

  if (input.stream !== undefined && typeof input.stream !== "function") {
    return false;
  }

  if (input.destroy !== undefined && typeof input.destroy !== "function") {
    return false;
  }

  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBuffer(value: unknown): value is Buffer {
  return typeof Buffer !== "undefined" && Buffer.isBuffer(value);
}

function getReceivedType(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value;
}

function assertValidCount(count: number): void {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new TypeError("File count must be a non-negative safe integer");
  }
}

function assertValidByteLimit(bytes: number, operation: string): void {
  if (!Number.isSafeInteger(bytes) || bytes < 0) {
    throw new TypeError(
      `File ${operation} size must be a non-negative safe integer`,
    );
  }
}

function normalizeMimeTypes(
  value: string | readonly string[],
): readonly string[] {
  const values = Array.isArray(value) ? [...value] : [value];

  if (values.length === 0) {
    throw new TypeError("At least one MIME type must be provided");
  }

  return Object.freeze([
    ...new Set(
      values.map((mime) => {
        if (typeof mime !== "string" || mime.trim().length === 0) {
          throw new TypeError("MIME types must be non-empty strings");
        }

        return mime.trim().toLowerCase();
      }),
    ),
  ]);
}

function normalizeExtensions(
  value: string | readonly string[],
): readonly string[] {
  const values = Array.isArray(value) ? [...value] : [value];

  if (values.length === 0) {
    throw new TypeError("At least one file extension must be provided");
  }

  return Object.freeze([
    ...new Set(
      values.map((extension) => {
        if (typeof extension !== "string" || extension.trim().length === 0) {
          throw new TypeError("File extensions must be non-empty strings");
        }

        return extension.trim().replace(/^\./, "").toLowerCase();
      }),
    ),
  ]);
}

function matchesMimeType(actual: string, expected: string): boolean {
  const normalizedActual = actual.trim().toLowerCase();

  const normalizedExpected = expected.trim().toLowerCase();

  if (normalizedExpected === "*/*") {
    return true;
  }

  if (normalizedExpected.endsWith("/*")) {
    return normalizedActual.startsWith(normalizedExpected.slice(0, -1));
  }

  return normalizedActual === normalizedExpected;
}

function hasAllowedExtension(
  filename: string,
  allowed: readonly string[],
): boolean {
  const lastDot = filename.lastIndexOf(".");

  if (lastDot <= 0 || lastDot === filename.length - 1) {
    return false;
  }

  const extension = filename.slice(lastDot + 1).toLowerCase();

  return allowed.includes(extension);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} bytes`;
  }

  if (bytes < 1024 ** 2) {
    return `${bytes / 1024} KB`;
  }

  if (bytes < 1024 ** 3) {
    return `${bytes / 1024 ** 2} MB`;
  }

  return `${bytes / 1024 ** 3} GB`;
}

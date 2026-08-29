/// <reference types="node" />
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

export interface FileCheck {
  readonly kind: string;
  readonly validate: (file: UploadFileOptions) => boolean;
  readonly message: string;
  readonly value?: unknown;
}


// Single file validator 
export class FileSchema extends Schema<UploadFileOptions, UploadFileOptions> {
  readonly checks: readonly FileCheck[];

  constructor(checks: readonly FileCheck[] = []) {
    super();
    this.checks = Object.freeze([...checks]);
  }

  _parse(
    input: unknown,
    ctx: ParseContext,
  ): DynamicParseReturnType<UploadFileOptions> {
    if (!isUploadFile(input)) {
      addIssue(ctx, {
        code: "invalid_type",
        expected: "UploadedFile",
        received: getReceivedType(input),
        message: "Expected a valid uploaded file",
      });

      return makeFailure(ctx.issues);
    }

    const file = input;

    for (const check of this.checks) {
      if (!check.validate(file)) {
        addIssue(ctx, {
          code: getIssueCode(check.kind) as any,
          received: getReceivedValue(file, check),
          expected: check.value,
          message: check.message,
        });
      }
    }

    if (ctx.issues.length > 0) {
      return makeFailure(ctx.issues);
    }

    return makeSuccess(file);
  }

  private addCheck(check: FileCheck): FileSchema {
    return new FileSchema([...this.checks, check]);
  }

  min(bytes: number, message?: string): FileSchema {
    validateSize(bytes);

    return this.addCheck({
      kind: "min",
      value: bytes,
      validate: (file) => file.size !== undefined && file.size >= bytes,
      message: message ?? `File size must be at least ${formatBytes(bytes)}`,
    });
  }

  max(bytes: number, message?: string): FileSchema {
    validateSize(bytes);

    return this.addCheck({
      kind: "max",
      value: bytes,
      validate: (file) => file.size !== undefined && file.size <= bytes,
      message: message ?? `File size must not exceed ${formatBytes(bytes)}`,
    });
  }

  mime(mimeType: string | readonly string[], message?: string): FileSchema {
    const allowed = normalizeMimeTypes(mimeType);

    return this.addCheck({
      kind: "mime",
      value: allowed,
      validate: (file) =>
        allowed.some((expected) => matchesMimeType(file.mimetype, expected)),
      message:
        message ?? `File MIME type must be one of: ${allowed.join(", ")}`,
    });
  }

  extension(
    extension: string | readonly string[],
    message?: string,
  ): FileSchema {
    const allowed = normalizeExtensions(extension);

    return this.addCheck({
      kind: "extension",
      value: allowed,
      validate: (file) => {
        const lastDot = file.filename.lastIndexOf(".");

        if (lastDot <= 0) {
          return false;
        }

        const extension = file.filename.slice(lastDot + 1).toLowerCase();

        return allowed.includes(extension);
      },
      message:
        message ??
        `File extension must be one of: ${allowed
          .map((value) => `.${value}`)
          .join(", ")}`,
    });
  }

  storage(storageType: "memory" | "disk", message?: string): FileSchema {
    return this.addCheck({
      kind: "storage",
      value: storageType,
      validate: (file) => file.storageType === storageType,
      message: message ?? `File storage type must be "${storageType}"`,
    });
  }
}




function isUploadFile(value: unknown): value is UploadFileOptions {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const file = value as Record<string, unknown>;

  if (typeof file.filename !== "string" || file.filename.length === 0) {
    return false;
  }

  if (typeof file.encoding !== "string") {
    return false;
  }

  if (typeof file.mimetype !== "string" || file.mimetype.length === 0) {
    return false;
  }

  if (file.storageType !== "memory" && file.storageType !== "disk") {
    return false;
  }

  if (
    file.size !== undefined &&
    (typeof file.size !== "number" ||
      !Number.isFinite(file.size) ||
      file.size < 0)
  ) {
    return false;
  }

  if (file.path !== undefined && typeof file.path !== "string") {
    return false;
  }

  if (file.destroyed !== undefined && typeof file.destroyed !== "boolean") {
    return false;
  }

  if (file.bufferContent !== undefined && !isBuffer(file.bufferContent)) {
    return false;
  }

  if (file.buffer !== undefined && typeof file.buffer !== "function") {
    return false;
  }

  if (file.stream !== undefined && typeof file.stream !== "function") {
    return false;
  }

  if (file.destroy !== undefined && typeof file.destroy !== "function") {
    return false;
  }

  return true;
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

function getIssueCode(kind: string): string {
  switch (kind) {
    case "min":
      return "too_small";

    case "max":
      return "too_big";

    default:
      return "invalid_value";
  }
}

function getReceivedValue(file: UploadFileOptions, check: FileCheck): unknown {
  switch (check.kind) {
    case "min":
    case "max":
      return file.size;

    case "mime":
      return file.mimetype;

    case "extension":
      return file.filename;

    case "storage":
      return file.storageType;

    default:
      return file;
  }
}

function validateSize(bytes: number): void {
  if (!Number.isSafeInteger(bytes) || bytes < 0) {
    throw new TypeError("File size must be a non-negative safe integer");
  }
}

function normalizeMimeTypes(
  value: string | readonly string[],
): readonly string[] {
  const values = typeof value === "string" ? [value] : [...value];

  if (values.length === 0) {
    throw new TypeError("At least one MIME type is required");
  }

  return Object.freeze([
    ...new Set(
      values.map((mime) => {
        if (typeof mime !== "string" || mime.trim() === "") {
          throw new TypeError("MIME type must be a non-empty string");
        }

        return mime.trim().toLowerCase();
      }),
    ),
  ]);
}

function normalizeExtensions(
  value: string | readonly string[],
): readonly string[] {
  const values = typeof value === "string" ? [value] : [...value];

  if (values.length === 0) {
    throw new TypeError("At least one file extension is required");
  }

  return Object.freeze([
    ...new Set(
      values.map((extension) => {
        if (typeof extension !== "string" || extension.trim() === "") {
          throw new TypeError("File extension must be a non-empty string");
        }

        return extension.trim().replace(/^\./, "").toLowerCase();
      }),
    ),
  ]);
}

function matchesMimeType(actual: string, expected: string): boolean {
  const normalizedActual = actual.toLowerCase();

  const normalizedExpected = expected.toLowerCase();

  if (normalizedExpected === "*/*") {
    return true;
  }

  if (normalizedExpected.endsWith("/*")) {
    return normalizedActual.startsWith(normalizedExpected.slice(0, -1));
  }

  return normalizedActual === normalizedExpected;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} bytes`;
  }

  if (bytes < 1024 ** 2) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  if (bytes < 1024 ** 3) {
    return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  }

  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

/*!
 * subatom infer
 * Copyright(c) 2026 Kunal Chandra Das
 * MIT Licensed
 */


export function assertSuccess<T>(result: { success: boolean; data?: T; issues?: any[] }): T {
  if (!result.success || !result.data) {
    throw new Error(`Expected success, got failure: ${JSON.stringify(result.issues)}`);
  }
  return result.data;
}

export function assertFailure(result: { success: boolean; issues?: any[] }) {
  if (result.success || !result.issues) {
    throw new Error("Expected validation failure, but parse succeeded");
  }
  return result.issues;
}
/**
 * @summary
 * Checks error, caught in try/catch block and returns correct error representation of that
 */
export function getErrorMsg(error: any): string {
  return String((error && error.message) || error);
}

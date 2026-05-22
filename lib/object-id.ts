/** MongoDB ObjectId string validation (24 hex chars). */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

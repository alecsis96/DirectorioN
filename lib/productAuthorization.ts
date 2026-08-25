export function preservesProductBusinessId(currentBusinessId: string, requestedBusinessId: unknown): boolean {
  if (requestedBusinessId === undefined) return true;
  return String(requestedBusinessId || '').trim() === currentBusinessId;
}

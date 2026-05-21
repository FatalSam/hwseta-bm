export function getUserIdFromToken(token: string | null | undefined): string | null {
  if (!token?.trim()) return null;
  const raw = token.trim().toLowerCase().startsWith('bearer ') ? token.trim().slice(7) : token.trim();
  const parts = raw.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    const claim =
      payload.UserID ??
      payload.userID ??
      payload.userId ??
      payload.UserId ??
      payload.sub;
    return claim == null ? null : String(claim).trim() || null;
  } catch {
    return null;
  }
}

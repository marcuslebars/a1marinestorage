// A field no human fills in.
//
// The form carries a visually hidden `website` input. A person never sees it; a
// naive bot fills every field it finds. When it arrives non-empty we answer
// 200 {ok:true} and record NOTHING — telling a bot it failed just teaches the
// author to fix it, and a 400 would also mean a real customer with an
// autofill quirk saw an error.
export const HONEYPOT_FIELD = "website";

export function isHoneypotTripped(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const v = (body as Record<string, unknown>)[HONEYPOT_FIELD];
  return typeof v === "string" && v.trim().length > 0;
}

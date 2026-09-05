// One shape for a contact, whatever the customer typed.
//
// WHY THIS MATTERS BEYOND TIDINESS. Three forms feed three handlers, and every
// one of them stored whatever arrived: "  Dana  Reeve ", "DANA@Example.COM ",
// "(705) 555-1234". So the same person became several people — a lookup by
// email missed them, a second quote looked like a new lead, and the SMS channel
// could not tell whether it had a number it was allowed to text.
//
// The SMS part is the sharp edge. sms-twilio.ts only sends to `+1` followed by
// ten digits, so an un-normalised "(705) 555-1234" was silently unsendable. The
// customer's phone was fine; our storage of it was not.
import parsePhoneNumberFromString from "libphonenumber-js";

export interface NormalizedContact {
  name: string;
  email: string;
  /** E.164 (+17055551234) when parseable, else the trimmed original. */
  phone: string;
  /** False when the phone could not be parsed as a real Canadian number. */
  phoneValid: boolean;
}

/** Collapse runs of whitespace and trim. "  Dana   Reeve " → "Dana Reeve". */
export function normalizeName(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
}

/**
 * Trimmed and lowercased.
 *
 * The local part of an address is technically case-sensitive; in practice no
 * mail provider anyone uses treats it that way, and treating "Dana@x.com" and
 * "dana@x.com" as two customers is a real cost against a theoretical one.
 */
export function normalizeEmail(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

export interface NormalizedPhone {
  /** E.164 when valid, otherwise the trimmed input, so nothing is destroyed. */
  value: string;
  valid: boolean;
}

/**
 * Canadian by default, because the yard is in Tiny and every customer is local.
 *
 * An unparseable number is RETURNED UNCHANGED rather than dropped: it is still
 * the only way to reach that person, and a human reading the lead can dial
 * something we could not parse. `valid` is how callers decide whether to text
 * it — a wrong guess there reaches a stranger.
 */
export function normalizePhone(
  raw: unknown,
  country = "CA" as const
): NormalizedPhone {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) return { value: "", valid: false };
  try {
    const parsed = parsePhoneNumberFromString(trimmed, country);
    if (parsed?.isValid()) return { value: parsed.number, valid: true };
  } catch {
    /* Fall through: an unparseable number is kept, not discarded. */
  }
  return { value: trimmed, valid: false };
}

/** Normalise the three fields every form collects. */
export function normalizeContact(input: {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
}): NormalizedContact {
  const phone = normalizePhone(input.phone);
  return {
    name: normalizeName(input.name),
    email: normalizeEmail(input.email),
    phone: phone.value,
    phoneValid: phone.valid,
  };
}

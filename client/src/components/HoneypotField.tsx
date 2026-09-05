// The visually hidden field that catches naive bots.
//
// Phase 0 shipped the SERVER half of this — `isHoneypotTripped()` on
// /api/quote and /api/contact — but no form rendered the field, so the check
// was unreachable and the protection was zero. This is the other half.
//
// One component, so the field name can never drift from the server's
// HONEYPOT_FIELD. If those two strings stop matching, the honeypot silently
// stops working, which is the worst way for a security control to fail.

/** Must equal HONEYPOT_FIELD in server/security/honeypot.ts. */
export const HONEYPOT_FIELD = "website";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

/**
 * NOT `display:none` and NOT `hidden`.
 *
 * Some bots skip fields that are obviously hidden, and some screen readers do
 * odd things with them. This is positioned off-canvas instead: it is absent
 * from the visual page and from the tab order, `aria-hidden` keeps it out of
 * the accessibility tree, and `autoComplete="off"` stops a password manager
 * from filling it and getting a real customer discarded.
 */
export function HoneypotField({ value, onChange }: Props) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "-9999px",
        width: "1px",
        height: "1px",
        overflow: "hidden",
      }}
    >
      <label htmlFor={HONEYPOT_FIELD}>Website (leave this blank)</label>
      <input
        id={HONEYPOT_FIELD}
        name={HONEYPOT_FIELD}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

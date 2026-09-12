// The shell every customer email shares: logo, one column, one button.
//
// Inline styles only — Gmail strips <style> blocks, and a stylesheet that half
// applies looks worse than none. Table-based centring for Outlook. Brand values
// mirror the site's tokens rather than importing them, because a build-time
// import would not survive into an email client anyway.
import { BUSINESS } from "../../../shared/business";

const BRAND = "#DE3C37"; // oklch(0.6 0.2 27) — the storage red
const INK = "#1a1d21";
const MUTED = "#6b7280";
const LOGO = "https://a1marinestorage.ca/a1-marine-storage-logo.png";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function money(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

export interface LayoutOptions {
  heading: string;
  /** Paragraphs above the table. Plain text; escaped for you. */
  intro: string[];
  bodyHtml?: string;
  cta?: { label: string; url: string };
  /** Paragraphs below the button. */
  outro?: string[];
  /** Appended to the footer, e.g. an unsubscribe line. */
  footerHtml?: string;
}

export function renderLayout(o: LayoutOptions): string {
  const p = (t: string) =>
    `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${INK}">${escapeHtml(t)}</p>`;

  const button = o.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
         <tr><td style="border-radius:8px;background:${BRAND}">
           <a href="${o.cta.url}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none">${escapeHtml(o.cta.label)}</a>
         </td></tr>
       </table>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f6f8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px">
  <tr><td style="padding-bottom:24px">
    <img src="${LOGO}" alt="${escapeHtml(BUSINESS.name)}" width="180" style="display:block;border:0;max-width:180px;height:auto">
  </td></tr>
  <tr><td>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${INK};font-weight:700">${escapeHtml(o.heading)}</h1>
    ${o.intro.map(p).join("")}
    ${o.bodyHtml ?? ""}
    ${button}
    ${(o.outro ?? []).map(p).join("")}
  </td></tr>
  <tr><td style="padding-top:24px;border-top:1px solid #e5e7eb;margin-top:24px">
    <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:${MUTED}">
      ${escapeHtml(BUSINESS.name)}<br>
      ${escapeHtml(BUSINESS.address.street)}, ${escapeHtml(BUSINESS.address.city)}, ${escapeHtml(BUSINESS.address.regionName)}<br>
      <a href="${BUSINESS.phoneHref}" style="color:${BRAND};text-decoration:none">${escapeHtml(BUSINESS.phone)}</a>
      &nbsp;·&nbsp;
      <a href="${BUSINESS.emailHref}" style="color:${BRAND};text-decoration:none">${escapeHtml(BUSINESS.email)}</a>
    </p>
    ${o.footerHtml ?? ""}
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/**
 * The unsubscribe line, for emails we send on our OWN initiative.
 *
 * Not on transactional mail: a quote confirmation or a PDF the customer asked
 * for is not something to opt out of, and offering it there teaches people
 * that unsubscribing loses them the things they wanted.
 */
export function unsubscribeFooter(url: string): string {
  return `<p style="margin:12px 0 0;font-size:12px;color:${MUTED}">
    Don't want reminders like this?
    <a href="${url}" style="color:${MUTED};text-decoration:underline">Unsubscribe</a>.
    You'll still get emails about a quote or booking you asked for.
  </p>`;
}

/** The text part. Never optional — see the note in email-resend.ts. */
export function renderText(o: {
  heading: string;
  lines: string[];
  cta?: { label: string; url: string };
  unsubscribeUrl?: string;
}): string {
  const parts = [o.heading, "", ...o.lines];
  if (o.cta) parts.push("", `${o.cta.label}: ${o.cta.url}`);
  if (o.unsubscribeUrl) {
    parts.push("", `Unsubscribe from reminders: ${o.unsubscribeUrl}`);
  }
  parts.push(
    "",
    "—",
    BUSINESS.name,
    `${BUSINESS.address.street}, ${BUSINESS.address.city}, ${BUSINESS.address.regionName}`,
    `${BUSINESS.phone} · ${BUSINESS.email}`
  );
  return parts.join("\n");
}

/** A quote's line items as an HTML table, matching the on-screen breakdown. */
export function renderLineTable(
  lines: Array<{ label: string; amountCents: number }>,
  totals: { subtotalCents: number; savingsCents?: number }
): string {
  const row = (label: string, amount: string, bold = false, color = INK) =>
    `<tr>
       <td style="padding:8px 0;font-size:14px;color:${color};${bold ? "font-weight:700" : ""}">${escapeHtml(label)}</td>
       <td align="right" style="padding:8px 0;font-size:14px;color:${color};${bold ? "font-weight:700" : ""}">${amount}</td>
     </tr>`;

  const savings =
    totals.savingsCents && totals.savingsCents > 0
      ? row("Bundle savings", `−${money(totals.savingsCents)}`, false, BRAND)
      : "";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-top:1px solid #e5e7eb">
    ${lines.map(l => row(l.label, money(l.amountCents))).join("")}
    ${savings}
    <tr><td colspan="2" style="border-top:1px solid #e5e7eb;padding:0"></td></tr>
    ${row("Subtotal", money(totals.subtotalCents), true)}
    <tr><td colspan="2" style="padding:4px 0;font-size:12px;color:${MUTED}">Plus HST. Final pricing confirmed at drop-off.</td></tr>
  </table>`;
}

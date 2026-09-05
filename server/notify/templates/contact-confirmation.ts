// "We got your message" — the short one.
//
// A contact-form sender has no quote, no reference and no link to press, so
// this promises exactly one thing: a person will get back to them, and here is
// how to reach the yard in the meantime. Nothing else, because there is nothing
// else that is true yet.
import { BUSINESS } from "../../../shared/business";
import type { RenderedEmail } from "../types";
import { renderLayout, renderText } from "./layout";

export interface ContactConfirmationInput {
  name: string;
  /** Echoed back so they can see what reached us. */
  message?: string;
  serviceInterest?: string;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

export function renderContactConfirmationEmail(
  input: ContactConfirmationInput
): RenderedEmail {
  const heading = `Thanks, ${firstName(input.name)} — we've got your message`;

  const intro = [
    "Someone at the yard will get back to you within 1 business day.",
    input.serviceInterest ? `You asked about: ${input.serviceInterest}` : "",
  ].filter(Boolean);

  const outro = [
    `If it's urgent, call the yard on ${BUSINESS.phone} — that's faster than email.`,
  ];

  // Their own words, quoted back. Cheap reassurance that it arrived intact, and
  // it saves them wondering what they actually wrote.
  const quoted = input.message?.trim();

  return {
    subject: "We've got your message — A1 Marine Storage",
    html: renderLayout({
      heading,
      intro,
      bodyHtml: quoted
        ? `<blockquote style="margin:16px 0;padding:8px 16px;border-left:3px solid #e5e7eb;font-size:14px;color:#555;white-space:pre-wrap">${quoted
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</blockquote>`
        : undefined,
      outro,
    }),
    text: renderText({
      heading,
      lines: [
        ...intro,
        ...(quoted ? ["", `> ${quoted.replace(/\n/g, "\n> ")}`] : []),
        "",
        ...outro,
      ],
    }),
  };
}

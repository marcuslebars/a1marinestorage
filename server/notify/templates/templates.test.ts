// What the customer and the yard actually receive.
//
// Templates are pure, so these assert on the rendered strings — which is where
// a promise the code does not keep would show up.
import { describe, expect, it } from "vitest";

import { renderContactConfirmationEmail } from "./contact-confirmation";
import { renderOwnerAlertEmail } from "./owner-alert";
import {
  renderQuoteConfirmationEmail,
  renderQuoteConfirmationSms,
} from "./quote-confirmation";

// Engine-derived: a 24 ft bowrider on Winter Ready Plus (winter storage +
// outboard winterization at 5%), with a fall pickup and a spring delivery.
const QUOTE = {
  hullType: "bowrider",
  currency: "CAD",
  subtotalCents: 192925,
  aLaCarteSubtotalCents: 201500,
  bundleSavingsCents: 8575,
  bundle: {
    id: "winter_ready_plus",
    label: "Winter Ready Plus",
    discountPct: 5,
  },
  lineItems: [
    {
      serviceId: "winter_storage",
      label: "Winter storage, shrink wrap & spring removal",
      description:
        "Winter storage, shrink wrap & spring removal \u2014 24ft \u00d7 $60.00/ft",
      quantity: 1,
      unitPriceCents: 144000,
      amountCents: 144000,
      detail: { lengthFt: 24 },
    },
    {
      serviceId: "winterization_outboard",
      label: "Winterization \u2014 outboard",
      description: "Winterization \u2014 outboard",
      quantity: 1,
      unitPriceCents: 27500,
      amountCents: 27500,
      detail: {},
    },
    {
      serviceId: "transport_local",
      label: "Transport \u2014 local",
      description: "one way",
      quantity: 1,
      unitPriceCents: 15000,
      amountCents: 15000,
      detail: {},
    },
    {
      serviceId: "transport_local",
      label: "Transport \u2014 local",
      description: "one way",
      quantity: 1,
      unitPriceCents: 15000,
      amountCents: 15000,
      detail: {},
    },
  ],
} as never;

const EXTRAS = [
  { purpose: "pickup" as const, serviceId: "transport_local", index: 2 },
  { purpose: "delivery" as const, serviceId: "transport_local", index: 3 },
];

describe("the quote confirmation email", () => {
  it("greets by first name only", () => {
    const m = renderQuoteConfirmationEmail({
      name: "Jonathan Michael Reeve",
      quote: QUOTE,
      extras: EXTRAS,
    });
    expect(m.html).toContain("Jonathan");
    expect(m.html).not.toContain("Jonathan Michael Reeve");
  });

  it("tells the two transport trips apart, exactly as the screen does", () => {
    const m = renderQuoteConfirmationEmail({
      name: "Dana",
      quote: QUOTE,
      extras: EXTRAS,
    });
    expect(m.html).toContain("(fall pickup)");
    expect(m.html).toContain("(spring delivery)");
    expect(m.text).toContain("(fall pickup)");
  });

  it("promises a person, not a reservation, when there is no payable link", () => {
    const m = renderQuoteConfirmationEmail({
      name: "Dana",
      reference: "A1MS-Q-ABC123",
      quote: QUOTE,
      extras: EXTRAS,
    });
    expect(m.text).toContain("confirm availability within 1 business day");
    expect(m.text).toContain("Nothing is booked yet");
    // No deposit language without a deposit link — the copy cannot promise
    // something the code did not produce.
    expect(m.text).not.toMatch(/deposit/i);
    expect(m.text).not.toMatch(/reserve your spot/i);
  });

  it("offers the deposit, and says what it does and does not do, when a link exists", () => {
    const m = renderQuoteConfirmationEmail({
      name: "Dana",
      reference: "A1MS-Q-ABC123",
      quote: QUOTE,
      extras: EXTRAS,
      depositUrl: "https://quotes.a1marinestorage.ca/q/tok",
    });
    expect(m.html).toContain("https://quotes.a1marinestorage.ca/q/tok");
    expect(m.text).toContain("25% deposit");
    expect(m.text).toContain("Nothing is held until the deposit is paid");
  });

  it("carries the reference in the subject so a reply threads to the right quote", () => {
    const m = renderQuoteConfirmationEmail({
      name: "Dana",
      reference: "A1MS-Q-ABC123",
      quote: QUOTE,
      extras: EXTRAS,
    });
    expect(m.subject).toBe("Your A1 Marine Storage quote A1MS-Q-ABC123");
  });

  it("always ships a text part", () => {
    const m = renderQuoteConfirmationEmail({
      name: "Dana",
      quote: QUOTE,
      extras: [],
    });
    expect(m.text.length).toBeGreaterThan(50);
  });
});

describe("the confirmation SMS", () => {
  it("fits in one segment", () => {
    const s = renderQuoteConfirmationSms({
      reference: "A1MS-Q-ABC123",
      lengthFt: 24,
      hullType: "bowrider",
    });
    expect(s.length).toBeLessThanOrEqual(160);
    expect(s).toContain("A1MS-Q-ABC123");
    expect(s).toContain("STOP");
  });

  it("drops the boat description rather than the deposit link when space is tight", () => {
    const s = renderQuoteConfirmationSms({
      reference: "A1MS-Q-ABC123",
      lengthFt: 24,
      hullType: "a very long hull type name that pushes this over the limit",
      depositUrl: "https://quotes.a1marinestorage.ca/q/abcdefghijklmnop",
    });
    expect(s.length).toBeLessThanOrEqual(160);
    // The part that DOES something survives.
    expect(s).toContain("https://quotes.a1marinestorage.ca/q/abcdefghijklmnop");
  });

  it("points at the email when there is no link", () => {
    expect(
      renderQuoteConfirmationSms({ reference: "A1MS-Q-ABC123" })
    ).toContain("Details are in your email");
  });
});

describe("the owner alert", () => {
  it("leads with NEEDS A CALL when something disqualifies the lead", () => {
    const m = renderOwnerAlertEmail({
      reference: "A1MS-Q-ABC123",
      contact: {
        name: "Dana Reeve",
        email: "dana@example.com",
        phone: "705-555-0134",
      },
      quote: QUOTE,
      extras: EXTRAS,
      eligibility: {
        autoQuoteEligible: false,
        reasons: ["in_water", "over_40ft"],
      },
    });
    expect(m.subject).toContain("[CALL]");
    expect(m.html).toContain("NEEDS A CALL");
    expect(m.text).toContain("needs a haul-out plan");
    expect(m.text).toContain("outside the auto-quote range");
  });

  it("says auto-quoted when a deposit link came back", () => {
    const m = renderOwnerAlertEmail({
      contact: {
        name: "Dana Reeve",
        email: "dana@example.com",
        phone: "705-555-0134",
      },
      quote: QUOTE,
      extras: EXTRAS,
      eligibility: { autoQuoteEligible: true, reasons: [] },
      depositUrl: "https://quotes.a1marinestorage.ca/q/tok",
    });
    expect(m.subject).toContain("[auto]");
    expect(m.html).toContain("deposit link sent");
  });

  it("carries the contact details the yard needs to act", () => {
    const m = renderOwnerAlertEmail({
      contact: {
        name: "Dana Reeve",
        email: "dana@example.com",
        phone: "705-555-0134",
        marina: "Bay Marina",
      },
      quote: QUOTE,
      extras: EXTRAS,
      eligibility: { autoQuoteEligible: true, reasons: [] },
    });
    expect(m.text).toContain("705-555-0134");
    expect(m.text).toContain("dana@example.com");
    expect(m.text).toContain("Bay Marina");
  });

  it("keeps a FALSE transport leg visible — 'no delivery' is a real answer", () => {
    const m = renderOwnerAlertEmail({
      contact: { name: "Dana", email: "d@example.com", phone: "705-555-0134" },
      quote: QUOTE,
      extras: EXTRAS,
      eligibility: { autoQuoteEligible: true, reasons: [] },
      logistics: { pickup: true, delivery: false },
    });
    expect(m.text).toContain("Fall pickup: yes");
    expect(m.text).toContain("Spring delivery: no");
  });
});

describe("the contact confirmation", () => {
  it("promises only a reply, because that is all that happens", () => {
    const m = renderContactConfirmationEmail({ name: "Dana Reeve" });
    expect(m.text).toContain("within 1 business day");
    expect(m.text).not.toMatch(/quote|deposit|reserve/i);
  });

  it("quotes the message back, escaped", () => {
    const m = renderContactConfirmationEmail({
      name: "Dana",
      message: "Do you take <script>alert(1)</script> boats?",
    });
    expect(m.html).toContain("&lt;script&gt;");
    expect(m.html).not.toContain("<script>alert(1)</script>");
  });
});

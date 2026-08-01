# A1 Marine Storage — Pricing Page Copy (v1.1.0 rates)

Replacement copy for `client/src/pages/Pricing.tsx`. Structured top-to-bottom as the page should flow. All prices CAD; HST extra.

---

## Hero

**Straightforward storage pricing. No surprises in spring.**

Every price below is the real number — calculated per foot, the same math our instant quote tool uses. Build your exact quote in under a minute, or read on for the full breakdown.

[Get My Instant Quote] ← primary CTA, links to calculator

---

## Outdoor Winter Storage — $50/ft

Secure seasonal storage at our Tiny, ON yard, October through April — minutes from Georgian Bay. Your boat is professionally positioned on its trailer or stand with planned spring access, monitored throughout the winter.

| Boat length | Season rate |
|---|---|
| Up to 20 ft | from $750 |
| 21–26 ft | $1,050 – $1,300 |
| 27–32 ft | $1,350 – $1,600 |
| 33 ft+ | Confirmed at quote |

*Minimum $750. Boats over 32 ft priced individually — use the quote tool or call.*

---

## Shrink Wrapping — $25/ft

Professional-grade shrink wrap with a full support frame, taut welded seams, and proper venting to prevent moisture and mildew. Protects your gelcoat, upholstery, and electronics from snow load, ice, and UV.

| Boat length | Rate |
|---|---|
| Up to 20 ft | from $375 |
| 21–26 ft | $525 – $650 |
| 27–32 ft | $675 – $800 |
| 33 ft+ | Confirmed at quote |

*Minimum $375. Pontoon +$8/ft, tritoon +$10/ft for additional framing and material.*

---

## Winterization — flat rate by engine type

Complete freeze protection: engine fogged, fuel stabilized, cooling systems drained and protected with marine antifreeze, batteries prepped for storage. Done right in fall means started easy in spring.

| Engine type | Price | Each additional engine |
|---|---|---|
| Outboard | $275 | +$206 |
| Sterndrive | $400 | +$300 |
| Inboard | $445 | +$334 |

---

## Spring Commissioning — $265

Full spring start-up so your boat is ready for launch day: de-winterization, battery reconnect and test, fluid and belt checks, systems verification, and an engine run to operating temperature. From winter storage to Georgian Bay without lifting a finger.

---

## Fall Detail — $24/ft

End-of-season exterior wash and detail before wrapping: hull and topsides cleaned, scum line and waterline staining removed, surfaces protected so contaminants don't bake in over winter. Boats stored clean launch clean.

---

## Winter Ceramic Coating Upgrade — $85/ft

Turn storage season into an upgrade. While your boat is in our yard, our A1 Marine Care coating specialists apply a professional ceramic coating — deep gloss, UV protection, and a hull that sheds grime all summer. Winter is the ideal install window: controlled conditions, full cure before launch, zero boating days lost.

---

## Bundle & Save — Winter Ready Packages

Book your winter services together and save on the whole package:

| Package | Includes | Savings |
|---|---|---|
| **Winter Ready** | Storage + Shrink Wrap | 8% |
| **Winter Ready Plus** | Storage + Shrink Wrap + Winterization | 10% |
| **Full Care** | Storage + Wrap + Winterization + Fall Detail + Spring Commissioning | 12% |

*Example: a 24 ft sterndrive with storage, wrap, and winterization is $2,200 à la carte — $1,980 with Winter Ready Plus.*

**Full Care is the whole year, handled:** your boat leaves the water in fall and returns in spring detailed, protected, and running — one booking, one discount, zero hassle.

---

## Fine print (footer strip or small section)

- All prices in CAD. HST applies.
- Per-foot rates use overall boat length including swim platform and bow pulpit.
- Storage season runs October–April; early drop-off and late pickup by arrangement.
- Full payment at booking secures your slot — yard capacity is limited and fills before freeze-up.

[Get My Instant Quote] ← repeat CTA at page bottom

---

## Implementation notes (not page copy)

1. **Bracket ranges vs flat prices:** The tables above show *ranges* (true per-foot math at bracket endpoints) rather than the single anchored bracket prices in Jobber, because the site's calculator quotes exact length — showing "21–26 ft: $1,200" flat would contradict the calculator when a 26-footer gets quoted $1,300. The ranges are honest and drive people to the calculator. If you'd rather show anchored flat prices matching Jobber exactly, swap them in — but then the calculator should also bracket-price, which is an engine change.
2. **Removed from this page:** Indoor Storage, Battery Storage, Trailer Storage, and Spring Wrap Removal — currently advertised with no engine price. Either price them before launch and add sections, or make sure they're deleted from `Pricing.tsx` AND `SiteFooter.tsx` when this copy goes in.
3. **"Monitored" claim** in the storage blurb: keep only if defensible (cameras/regular presence).
4. The winterization scope line is generic across engine types here for brevity; the per-type detail lives in the Jobber descriptions and can be an accordion/expandable on the page if you want it.
5. Wrap removal in spring: this copy deliberately does not say removal is included. If you price Spring Wrap Removal as a service, it slots naturally after Spring Commissioning.

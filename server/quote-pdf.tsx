/**
 * The branded quote PDF.
 *
 * A PURE FUNCTION of (quote model, brand). It reads no globals, does no pricing,
 * and knows nothing about Express — everything it prints was decided before it
 * was called. That is what lets the PDF and the on-screen panel agree: they
 * render the same model, and this file cannot introduce a number of its own.
 *
 * Branding is a PARAMETER rather than hardcoded, so EmpireVu's hosted quote page
 * can reuse this for other tenants (see the reuse note in the branch summary).
 *
 * Server-side only. @react-pdf/renderer is heavy and has no business in the
 * client bundle; the browser gets a download, not a rendering engine.
 */
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import React from "react";

import { engineLabel, money, type QuoteModel } from "../shared/quote-model";

export interface PdfBrand {
  businessName: string;
  addressLines: string[];
  phone: string;
  website: string;
  /**
   * Logo image BYTES, not a path.
   *
   * react-pdf resolves a bare string src by fetching it, which fails silently on
   * a server filesystem path — the document still renders, just with no logo,
   * which is exactly the kind of defect that ships unnoticed. Handing it the
   * bytes removes the ambiguity.
   */
  logo?: { data: Buffer; format: "png" | "jpg" };
  primaryColor: string;
  darkColor: string;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111111",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logo: { height: 34, width: 120, objectFit: "contain" },
  wordmark: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  headerRight: { textAlign: "right" },
  docTitle: { fontSize: 17, fontFamily: "Helvetica-Bold", marginTop: 18 },
  muted: { color: "#666666" },
  rule: {
    borderBottomWidth: 1,
    borderBottomColor: "#E4E4E4",
    marginVertical: 12,
  },

  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: "#666666",
    marginBottom: 6,
  },

  factGrid: { flexDirection: "row", flexWrap: "wrap" },
  fact: { width: "25%", marginBottom: 6 },
  factLabel: { fontSize: 7.5, color: "#666666", marginBottom: 1 },
  factValue: { fontSize: 10 },

  lineRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  lineMain: { flex: 1, paddingRight: 12 },
  lineLabel: { fontSize: 10 },
  lineDesc: { fontSize: 8, color: "#666666", marginTop: 1.5 },
  lineAmount: { width: 78, textAlign: "right" },

  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingVertical: 2.5,
  },
  totalLabel: { width: 150, textAlign: "right", paddingRight: 12 },
  totalValue: { width: 78, textAlign: "right" },
  bold: { fontFamily: "Helvetica-Bold" },

  depositBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F7F7F7",
    borderRadius: 4,
  },
  depositRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  notice: {
    marginTop: 10,
    padding: 9,
    borderLeftWidth: 3,
    borderLeftColor: "#C8A22A",
    backgroundColor: "#FFFBEB",
    fontSize: 9,
  },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    borderTopWidth: 1,
    borderTopColor: "#E4E4E4",
    paddingTop: 8,
    fontSize: 7.5,
    color: "#666666",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function LineRow({
  label,
  description,
  amount,
}: {
  label: string;
  description?: string;
  amount: string;
}) {
  return (
    <View style={styles.lineRow} wrap={false}>
      <View style={styles.lineMain}>
        <Text style={styles.lineLabel}>{label}</Text>
        {description && description !== label ? (
          <Text style={styles.lineDesc}>{description}</Text>
        ) : null}
      </View>
      <Text style={styles.lineAmount}>{amount}</Text>
    </View>
  );
}

function TotalRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  const s = bold ? [styles.bold] : [];
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, ...s]}>{label}</Text>
      <Text style={[styles.totalValue, ...s]}>{value}</Text>
    </View>
  );
}

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export function QuoteDocument({
  model,
  brand,
}: {
  model: QuoteModel;
  brand: PdfBrand;
}) {
  const bundled = model.lines.filter(l => !l.outsideBundle);
  const extras = model.lines.filter(l => l.outsideBundle);
  const log = model.logistics;
  const depositPct = Math.round(model.depositRateBps / 100);
  const taxPct = Math.round(model.taxRateBps / 100);

  return (
    <Document
      title={`Winter Storage Quote ${model.reference}`}
      author={brand.businessName}
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow} fixed>
          {brand.logo ? (
            <Image style={styles.logo} src={brand.logo} />
          ) : (
            <Text style={[styles.wordmark, { color: brand.primaryColor }]}>
              {brand.businessName}
            </Text>
          )}
          <View style={styles.headerRight}>
            <Text style={styles.muted}>Quote reference</Text>
            <Text style={styles.bold}>{model.reference}</Text>
            <Text style={[styles.muted, { marginTop: 3 }]}>
              {longDate(model.issuedAt)}
            </Text>
          </View>
        </View>

        <Text style={[styles.docTitle, { color: brand.darkColor }]}>
          Winter Storage Quote
        </Text>
        <View style={styles.rule} />

        <Text style={styles.sectionTitle}>Your boat</Text>
        <View style={styles.factGrid}>
          <Fact label="Length" value={`${model.boat.lengthFt} ft`} />
          <Fact
            label="Engine"
            value={engineLabel(model.boat.engineType, model.boat.engineCount)}
          />
          {model.boat.hullType ? (
            <Fact label="Hull" value={model.boat.hullType} />
          ) : null}
          {model.packageLabel ? (
            <Fact label="Package" value={model.packageLabel} />
          ) : null}
        </View>

        <View style={styles.rule} />

        <Text style={styles.sectionTitle}>
          {model.packageLabel ? `${model.packageLabel} package` : "Services"}
        </Text>
        {bundled.map((l, i) => (
          <LineRow
            key={`b${i}`}
            label={l.label}
            description={l.description}
            amount={money(l.amountCents)}
          />
        ))}

        {model.bundleSavingsCents > 0 ? (
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: brand.primaryColor }]}>
              Package saving
            </Text>
            <Text style={[styles.totalValue, { color: brand.primaryColor }]}>
              −{money(model.bundleSavingsCents)}
            </Text>
          </View>
        ) : null}

        {extras.length > 0 ? (
          <View style={{ marginTop: 14 }}>
            <Text style={styles.sectionTitle}>
              Transport, trailer &amp; add-ons
            </Text>
            {/* Stated plainly, the same way the on-screen panel does: these sit
                outside the package discount, and a customer should not have to
                infer that from the arithmetic. */}
            <Text style={[styles.muted, { fontSize: 8, marginBottom: 4 }]}>
              Not included in the package discount.
            </Text>
            {extras.map((l, i) => (
              <LineRow
                key={`x${i}`}
                label={l.label}
                description={l.description}
                amount={money(l.amountCents)}
              />
            ))}
          </View>
        ) : null}

        {log ? (
          <View style={{ marginTop: 14 }} wrap={false}>
            <Text style={styles.sectionTitle}>
              Getting your boat to us — and back
            </Text>
            <View style={styles.factGrid}>
              <Fact label="Boat is" value={log.locationLabel} />
              {log.townLabel ? (
                <Fact label="From" value={log.townLabel} />
              ) : null}
              {log.bandLabel ? (
                <Fact
                  label="Transport band"
                  value={
                    log.bandRange
                      ? `${log.bandLabel} · ${log.bandRange}`
                      : log.bandLabel
                  }
                />
              ) : null}
              {log.distanceKm != null ? (
                <Fact
                  label="Distance"
                  value={`${log.distanceKm} km${log.estimated ? " (est.)" : ""}`}
                />
              ) : null}
            </View>
            <Text style={[styles.muted, { fontSize: 8 }]}>
              Distance measured one-way from our yard. Final band confirmed at
              booking.
            </Text>

            {log.customTransportQuote ? (
              <Text style={styles.notice}>
                You&apos;re beyond our furthest standard band, so transport
                isn&apos;t priced here — we&apos;ll confirm a custom rate with
                your quote.
              </Text>
            ) : null}
            {log.inWaterNotice ? (
              <Text style={styles.notice}>
                In-water pickups need a haul-out plan — we&apos;ll confirm
                logistics with your quote.
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* The dates the customer asked for. Shown as REQUESTED, not booked —
            nothing is held until we confirm, and a PDF that reads like a
            confirmed slot would be the exact promise this codebase avoids. */}
        {model.preferredDropoff || model.preferredLaunch ? (
          <View style={{ marginTop: 14 }} wrap={false}>
            <Text style={styles.sectionTitle}>Dates you asked for</Text>
            <View style={styles.factGrid}>
              {model.preferredDropoff ? (
                <Fact label="Fall drop-off" value={model.preferredDropoff} />
              ) : null}
              {model.preferredLaunch ? (
                <Fact label="Spring launch" value={model.preferredLaunch} />
              ) : null}
            </View>
            <Text style={[styles.muted, { fontSize: 8 }]}>
              Requested, not reserved — we&apos;ll confirm availability when we
              get back to you.
            </Text>
          </View>
        ) : null}

        <View style={styles.rule} />

        <TotalRow label="Subtotal" value={money(model.subtotalCents)} />
        <TotalRow label={`HST (${taxPct}%)`} value={money(model.taxCents)} />
        <TotalRow label="Total" value={money(model.totalCents)} bold />

        <View style={styles.depositBox} wrap={false}>
          <View style={styles.depositRow}>
            <Text style={styles.bold}>
              {depositPct}% deposit reserves your spot
            </Text>
            <Text
              style={[styles.bold, { fontSize: 14, color: brand.primaryColor }]}
            >
              {money(model.depositCents)}
            </Text>
          </View>
          <Text style={[styles.muted, { marginTop: 4, fontSize: 8.5 }]}>
            The balance is due later — nothing else is needed today.
          </Text>
        </View>

        <View style={{ marginTop: 14 }} wrap={false}>
          <Text style={styles.sectionTitle}>Good to know</Text>
          <Text style={{ fontSize: 8.5, color: "#444444", lineHeight: 1.5 }}>
            Estimate valid 30 days; final pricing confirmed after an on-site
            check. Prices in CAD and include HST where shown.
          </Text>
          <Text
            style={{
              fontSize: 8.5,
              color: "#444444",
              lineHeight: 1.5,
              marginTop: 6,
            }}
          >
            To book:{" "}
            {model.resumeUrl
              ? `continue online at ${model.resumeUrl}, or call `
              : "call "}
            {brand.phone}.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            {brand.businessName} · {brand.addressLines.join(", ")}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              totalPages > 1
                ? `${brand.website} · ${pageNumber}/${totalPages}`
                : brand.website
            }
          />
        </View>
      </Page>
    </Document>
  );
}

/** Render the quote to a PDF buffer. Pure: same model in, same bytes out. */
export function renderQuotePdf(
  model: QuoteModel,
  brand: PdfBrand
): Promise<Buffer> {
  return renderToBuffer(<QuoteDocument model={model} brand={brand} />);
}

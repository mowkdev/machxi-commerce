import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// ────────────────────────────────────────────────────────────────────────────
// Data types expected by the PDF component
// ────────────────────────────────────────────────────────────────────────────

export interface InvoiceLineItem {
  title: string;
  variantTitle: string | null;
  sku: string;
  quantity: number;
  unitPrice: number; // minor-units (cents)
  discountPerUnit: number;
  finalUnitPrice: number;
  taxRate: number; // e.g. 21 for 21%
  taxAmount: number; // minor-units
  lineTotal: number; // finalUnitPrice * quantity
}

export interface InvoiceShippingLine {
  name: string;
  amount: number; // minor-units
  taxRate: number;
  taxAmount: number;
}

export interface InvoiceSellerInfo {
  companyName: string;
  addressStreet: string | null;
  addressCity: string | null;
  addressZip: string | null;
  addressCountry: string | null;
  taxId: string | null;
  vatNumber: string | null;
}

export interface InvoiceBankInfo {
  bankName: string | null;
  iban: string | null;
  bic: string | null;
  accountHolder: string | null;
}

export interface InvoiceBuyerInfo {
  name: string;
  street: string | null;
  city: string | null;
  zip: string | null;
  country: string | null;
  email: string | null;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: string;
  seller: InvoiceSellerInfo;
  buyer: InvoiceBuyerInfo;
  items: InvoiceLineItem[];
  shippingLines: InvoiceShippingLine[];
  currencyCode: string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  totalAmount: number;
  paymentMethod: string;
  bankInfo: InvoiceBankInfo | null; // only for manual_invoice
  footerText: string | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function formatMoney(minorUnits: number, currencyCode: string): string {
  const major = minorUnits / 100;
  return `${major.toFixed(2)} ${currencyCode}`;
}

function formatPercent(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingHorizontal: 40,
    paddingTop: 40,
    paddingBottom: 60,
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  invoiceTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  invoiceMeta: {
    fontSize: 9,
    color: "#555",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    color: "#333",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addressBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  addressCol: {
    width: "48%",
  },
  addressLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#888",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  addressText: {
    fontSize: 9,
    lineHeight: 1.5,
  },
  // Table
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  colDescription: { width: "35%" },
  colQty: { width: "8%", textAlign: "right" },
  colUnitPrice: { width: "14%", textAlign: "right" },
  colDiscount: { width: "11%", textAlign: "right" },
  colTaxRate: { width: "10%", textAlign: "right" },
  colTaxAmt: { width: "11%", textAlign: "right" },
  colTotal: { width: "11%", textAlign: "right" },
  thText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: "#555",
  },
  // Totals
  totalsContainer: {
    alignItems: "flex-end",
    marginTop: 8,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 220,
    paddingVertical: 2,
  },
  totalsLabel: {
    width: 120,
    textAlign: "right",
    paddingRight: 12,
    color: "#555",
  },
  totalsValue: {
    width: 100,
    textAlign: "right",
  },
  totalsFinal: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 220,
    paddingVertical: 4,
    borderTopWidth: 1.5,
    borderTopColor: "#333",
    marginTop: 2,
  },
  totalsFinalLabel: {
    width: 120,
    textAlign: "right",
    paddingRight: 12,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  totalsFinalValue: {
    width: 100,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  // Bank info
  bankBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
  },
  bankTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  bankRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  bankLabel: {
    width: 100,
    fontFamily: "Helvetica-Bold",
    color: "#555",
  },
  bankValue: {
    flex: 1,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
  },
});

// ────────────────────────────────────────────────────────────────────────────
// Components
// ────────────────────────────────────────────────────────────────────────────

function AddressBlock({
  label,
  lines,
}: {
  label: string;
  lines: string[];
}) {
  return (
    <View style={s.addressCol}>
      <Text style={s.addressLabel}>{label}</Text>
      {lines.map((line, i) => (
        <Text key={i} style={s.addressText}>
          {line}
        </Text>
      ))}
    </View>
  );
}

function TableHeader() {
  return (
    <View style={s.tableHeader}>
      <Text style={[s.thText, s.colDescription]}>Description</Text>
      <Text style={[s.thText, s.colQty]}>Qty</Text>
      <Text style={[s.thText, s.colUnitPrice]}>Unit Price</Text>
      <Text style={[s.thText, s.colDiscount]}>Discount</Text>
      <Text style={[s.thText, s.colTaxRate]}>Tax %</Text>
      <Text style={[s.thText, s.colTaxAmt]}>Tax</Text>
      <Text style={[s.thText, s.colTotal]}>Total</Text>
    </View>
  );
}

function ItemRow({
  item,
  currency,
}: {
  item: InvoiceLineItem;
  currency: string;
}) {
  const desc = item.variantTitle
    ? `${item.title} — ${item.variantTitle}`
    : item.title;
  return (
    <View style={s.tableRow}>
      <Text style={s.colDescription}>{desc}</Text>
      <Text style={s.colQty}>{item.quantity}</Text>
      <Text style={s.colUnitPrice}>
        {formatMoney(item.unitPrice, currency)}
      </Text>
      <Text style={s.colDiscount}>
        {item.discountPerUnit > 0
          ? `-${formatMoney(item.discountPerUnit, currency)}`
          : "—"}
      </Text>
      <Text style={s.colTaxRate}>{formatPercent(item.taxRate)}</Text>
      <Text style={s.colTaxAmt}>{formatMoney(item.taxAmount, currency)}</Text>
      <Text style={s.colTotal}>{formatMoney(item.lineTotal, currency)}</Text>
    </View>
  );
}

function ShippingRow({
  line,
  currency,
}: {
  line: InvoiceShippingLine;
  currency: string;
}) {
  return (
    <View style={s.tableRow}>
      <Text style={s.colDescription}>Shipping: {line.name}</Text>
      <Text style={s.colQty}>1</Text>
      <Text style={s.colUnitPrice}>{formatMoney(line.amount, currency)}</Text>
      <Text style={s.colDiscount}>—</Text>
      <Text style={s.colTaxRate}>{formatPercent(line.taxRate)}</Text>
      <Text style={s.colTaxAmt}>{formatMoney(line.taxAmount, currency)}</Text>
      <Text style={s.colTotal}>{formatMoney(line.amount, currency)}</Text>
    </View>
  );
}

function BankDetails({ info }: { info: InvoiceBankInfo }) {
  const rows = [
    info.accountHolder && ["Account Holder", info.accountHolder],
    info.bankName && ["Bank", info.bankName],
    info.iban && ["IBAN", info.iban],
    info.bic && ["BIC/SWIFT", info.bic],
  ].filter(Boolean) as [string, string][];

  if (rows.length === 0) return null;

  return (
    <View style={s.bankBox}>
      <Text style={s.bankTitle}>Payment Details — Bank Transfer</Text>
      {rows.map(([label, value]) => (
        <View key={label} style={s.bankRow}>
          <Text style={s.bankLabel}>{label}:</Text>
          <Text style={s.bankValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main document
// ────────────────────────────────────────────────────────────────────────────

export function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  const { seller, buyer, currencyCode: cur } = data;

  const sellerLines = [
    seller.companyName,
    seller.addressStreet,
    [seller.addressZip, seller.addressCity].filter(Boolean).join(" "),
    seller.addressCountry,
    seller.taxId && `Tax ID: ${seller.taxId}`,
    seller.vatNumber && `VAT: ${seller.vatNumber}`,
  ].filter(Boolean) as string[];

  const buyerLines = [
    buyer.name,
    buyer.street,
    [buyer.zip, buyer.city].filter(Boolean).join(" "),
    buyer.country,
    buyer.email,
  ].filter(Boolean) as string[];

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.invoiceTitle}>INVOICE</Text>
            <Text style={s.invoiceMeta}>
              {data.invoiceNumber} • {data.invoiceDate}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11 }}>
              {seller.companyName}
            </Text>
            <Text style={s.invoiceMeta}>Payment: {data.paymentMethod}</Text>
          </View>
        </View>

        {/* Addresses */}
        <View style={s.addressBlock}>
          <AddressBlock label="From" lines={sellerLines} />
          <AddressBlock label="Bill To" lines={buyerLines} />
        </View>

        {/* Line items table */}
        <View style={s.table}>
          <TableHeader />
          {data.items.map((item, i) => (
            <ItemRow key={i} item={item} currency={cur} />
          ))}
          {data.shippingLines.map((line, i) => (
            <ShippingRow key={`ship-${i}`} line={line} currency={cur} />
          ))}
        </View>

        {/* Totals */}
        <View style={s.totalsContainer}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Subtotal</Text>
            <Text style={s.totalsValue}>
              {formatMoney(data.subtotal, cur)}
            </Text>
          </View>
          {data.discountTotal > 0 && (
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Discount</Text>
              <Text style={s.totalsValue}>
                -{formatMoney(data.discountTotal, cur)}
              </Text>
            </View>
          )}
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Shipping</Text>
            <Text style={s.totalsValue}>
              {formatMoney(data.shippingTotal, cur)}
            </Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Tax</Text>
            <Text style={s.totalsValue}>
              {formatMoney(data.taxTotal, cur)}
            </Text>
          </View>
          <View style={s.totalsFinal}>
            <Text style={s.totalsFinalLabel}>Total</Text>
            <Text style={s.totalsFinalValue}>
              {formatMoney(data.totalAmount, cur)}
            </Text>
          </View>
        </View>

        {/* Bank details — only for manual invoice payments */}
        {data.bankInfo && <BankDetails info={data.bankInfo} />}

        {/* Footer */}
        {data.footerText && <Text style={s.footer}>{data.footerText}</Text>}
      </Page>
    </Document>
  );
}

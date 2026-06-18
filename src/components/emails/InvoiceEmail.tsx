import type { CSSProperties } from "react";
import { formatCurrency } from "@/lib/siteSettings";

const BRAND = {
  companyName: "CRM Software",
  tagline: "Invoice details",
  address: "Accra, Ghana",
  email: "onboarding@resend.dev",
  currency: "GHS",
  accent: "#14213d",
  accentSoft: "#edf2ff",
  accentWarm: "#fca311",
  border: "#e5e7eb",
  text: "#111827",
  muted: "#6b7280",
} as const;

export type InvoiceEmailProps = {
  clientName: string;
  invoiceNumber: string;
  invoiceDate: string;
  paymentDueDate: string;
  serviceType: string;
  invoiceAmount: number | string;
  amountReceived: number | string;
  paymentMethod: string;
  paymentStatus: string;
  senderName: string;
};

function cleanAmount(value: number | string): number | null {
  const numeric = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function formatBalance(total: number | string, received: number | string): string {
  const totalValue = cleanAmount(total);
  const receivedValue = cleanAmount(received);

  if (totalValue === null || receivedValue === null) return "N/A";

  return formatCurrency(totalValue - receivedValue, BRAND.currency);
}

function isPaid(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return ["paid", "completed", "settled", "cleared"].includes(normalized);
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <tr>
      <td style={styles.infoLabelCell}>{label}</td>
      <td style={styles.infoValueCell}>{value}</td>
    </tr>
  );
}

export function InvoiceEmail({
  clientName,
  invoiceNumber,
  invoiceDate,
  paymentDueDate,
  serviceType,
  invoiceAmount,
  amountReceived,
  paymentMethod,
  paymentStatus,
  senderName,
}: InvoiceEmailProps) {
  const balanceDue = formatBalance(invoiceAmount, amountReceived);
  const amountDisplay = formatCurrency(invoiceAmount, BRAND.currency);
  const receivedDisplay = formatCurrency(amountReceived, BRAND.currency);
  const paid = isPaid(paymentStatus);

  return (
    <div style={styles.body}>
      <div style={styles.container}>
        <div style={styles.header}>
          <table style={styles.fullWidthTable} cellPadding={0} cellSpacing={0}>
            <tbody>
              <tr>
                <td>
                  <div style={styles.companyName}>{BRAND.companyName}</div>
                  <div style={styles.tagline}>{BRAND.tagline}</div>
                </td>
                <td style={styles.rightAlign}>
                  <div style={styles.headerMeta}>{BRAND.address}</div>
                  <div style={styles.headerMeta}>{BRAND.email}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={styles.headerRule} />

          <table style={styles.fullWidthTable} cellPadding={0} cellSpacing={0}>
            <tbody>
              <tr>
                <td>
                  <div style={styles.invoiceLabel}>Invoice</div>
                </td>
                <td style={styles.rightAlign}>
                  <div style={styles.invoiceNumber}>{invoiceNumber}</div>
                  <div style={styles.invoiceNumberCaption}>Invoice number</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={styles.card}>
          <table style={styles.fullWidthTable} cellPadding={0} cellSpacing={0}>
            <tbody>
              <tr>
                <td style={styles.summaryLeft}>
                  <div style={styles.summaryLabel}>Bill To</div>
                  <div style={styles.clientName}>{clientName}</div>
                </td>
                <td style={styles.summaryRight}>
                  <div style={styles.summaryLabel}>Invoice Date</div>
                  <div style={styles.summaryValue}>{invoiceDate}</div>
                  <div style={{ ...styles.summaryLabel, marginTop: 12 }}>
                    Due Date
                  </div>
                  <div style={styles.summaryValue}>{paymentDueDate}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={styles.lineItemHeader}>
            <table style={styles.fullWidthTable} cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td>
                    <div style={styles.tableHeading}>Description</div>
                  </td>
                  <td style={styles.rightAlign}>
                    <div style={styles.tableHeading}>Amount</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={styles.lineItem}>
            <table style={styles.fullWidthTable} cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td>
                    <div style={styles.lineItemText}>{serviceType}</div>
                  </td>
                  <td style={styles.rightAlign}>
                    <div style={styles.lineItemAmount}>
                      {amountDisplay}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={styles.sectionRule} />

          <table style={styles.fullWidthTable} cellPadding={0} cellSpacing={0}>
            <tbody>
              <Row
                label="Invoice Amount"
                value={amountDisplay}
              />
              <Row
                label="Amount Received"
                value={receivedDisplay}
              />
            </tbody>
          </table>

          <table style={styles.balanceBox} cellPadding={0} cellSpacing={0}>
            <tbody>
              <tr>
                <td>
                  <div style={styles.balanceLabel}>Balance Due</div>
                </td>
                <td style={styles.rightAlign}>
                  <div style={styles.balanceValue}>
                    {balanceDue}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={styles.paymentCard}>
            <div style={styles.sectionTitle}>Payment Details</div>
            <table
              style={{ ...styles.fullWidthTable, marginTop: 12 }}
              cellPadding={0}
              cellSpacing={0}
            >
              <tbody>
                <tr>
                  <td style={styles.paymentColumn}>
                    <div style={styles.paymentLabel}>Method</div>
                    <div style={styles.paymentValue}>{paymentMethod}</div>
                  </td>
                  <td style={styles.paymentColumnRight}>
                    <div style={styles.paymentLabel}>Status</div>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: paid ? "#dcfce7" : "#fef3c7",
                        color: paid ? "#166534" : "#92400e",
                      }}
                    >
                      {paymentStatus.toUpperCase()}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={styles.note}>
            If you have any questions, reply to this email and we will get back
            to you shortly.
          </div>
        </div>

        <div style={styles.footer}>
          <div style={styles.footerRule} />
          <table
            style={{ ...styles.fullWidthTable, marginTop: 14 }}
            cellPadding={0}
            cellSpacing={0}
          >
            <tbody>
              <tr>
                <td>
                  <div style={styles.footerText}>Sent by {senderName}</div>
                </td>
                <td style={styles.rightAlign}>
                  <div style={styles.footerText}>Thank you for your business</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  body: {
    backgroundColor: "#f3f4f6",
    fontFamily: "Arial, sans-serif",
    margin: 0,
    padding: "32px 0",
  },
  container: {
    margin: "0 auto",
    maxWidth: 640,
  },
  fullWidthTable: {
    width: "100%",
    borderCollapse: "collapse",
  },
  rightAlign: {
    textAlign: "right",
    verticalAlign: "top",
  },
  header: {
    backgroundColor: BRAND.accent,
    borderRadius: "12px 12px 0 0",
    padding: "28px 32px 20px",
  },
  companyName: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "0.02em",
    margin: 0,
  },
  tagline: {
    color: "#cbd5e1",
    fontSize: 12,
    margin: "4px 0 0",
  },
  headerMeta: {
    color: "#cbd5e1",
    fontSize: 11,
    lineHeight: 1.6,
    margin: 0,
  },
  headerRule: {
    backgroundColor: "rgba(255,255,255,0.14)",
    height: 1,
    margin: "18px 0",
  },
  invoiceLabel: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: 700,
    margin: 0,
  },
  invoiceNumber: {
    color: BRAND.accentWarm,
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
  },
  invoiceNumberCaption: {
    color: "#cbd5e1",
    fontSize: 10,
    margin: "2px 0 0",
  },
  card: {
    backgroundColor: "#ffffff",
    borderBottom: `1px solid ${BRAND.border}`,
    borderLeft: `1px solid ${BRAND.border}`,
    borderRight: `1px solid ${BRAND.border}`,
    borderRadius: "0 0 12px 12px",
    padding: "28px 32px 30px",
  },
  summaryLeft: {
    verticalAlign: "top",
    width: "60%",
  },
  summaryRight: {
    verticalAlign: "top",
    width: "40%",
    textAlign: "right",
  },
  summaryLabel: {
    color: BRAND.muted,
    fontSize: 10,
    letterSpacing: "0.08em",
    margin: 0,
    textTransform: "uppercase",
  },
  summaryValue: {
    color: BRAND.text,
    fontSize: 13,
    fontWeight: 700,
    margin: "4px 0 0",
  },
  clientName: {
    color: BRAND.accent,
    fontSize: 18,
    fontWeight: 700,
    margin: "8px 0 0",
  },
  lineItemHeader: {
    backgroundColor: BRAND.accentSoft,
    borderRadius: 8,
    marginTop: 18,
    padding: "10px 14px",
  },
  tableHeading: {
    color: BRAND.accent,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    margin: 0,
    textTransform: "uppercase",
  },
  lineItem: {
    padding: "14px 6px 0",
  },
  lineItemText: {
    color: BRAND.text,
    fontSize: 13,
    margin: 0,
  },
  lineItemAmount: {
    color: BRAND.text,
    fontSize: 13,
    fontWeight: 700,
    margin: 0,
  },
  sectionRule: {
    backgroundColor: BRAND.border,
    height: 1,
    margin: "18px 0",
  },
  infoLabelCell: {
    color: BRAND.muted,
    fontSize: 12,
    padding: "6px 12px 6px 0",
    width: "55%",
  },
  infoValueCell: {
    color: BRAND.accent,
    fontSize: 12,
    fontWeight: 700,
    padding: "6px 0",
    textAlign: "right",
    width: "45%",
  },
  balanceBox: {
    backgroundColor: BRAND.accent,
    borderRadius: 8,
    marginTop: 10,
    width: "100%",
  },
  balanceLabel: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 700,
    margin: "10px 0",
    paddingLeft: 14,
  },
  balanceValue: {
    color: BRAND.accentWarm,
    fontSize: 14,
    fontWeight: 700,
    margin: "10px 0",
    paddingRight: 14,
    textAlign: "right",
  },
  paymentCard: {
    backgroundColor: "#f8fafc",
    border: `1px solid ${BRAND.border}`,
    borderRadius: 10,
    marginTop: 24,
    padding: "18px 20px",
  },
  sectionTitle: {
    color: BRAND.accent,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    margin: 0,
    textTransform: "uppercase",
  },
  paymentColumn: {
    verticalAlign: "top",
    width: "50%",
  },
  paymentColumnRight: {
    verticalAlign: "top",
    width: "50%",
    textAlign: "right",
  },
  paymentLabel: {
    color: BRAND.muted,
    fontSize: 10,
    letterSpacing: "0.08em",
    margin: 0,
    textTransform: "uppercase",
  },
  paymentValue: {
    color: BRAND.text,
    fontSize: 13,
    fontWeight: 700,
    margin: "4px 0 0",
  },
  statusBadge: {
    borderRadius: 999,
    display: "inline-block",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    margin: "4px 0 0",
    padding: "4px 12px",
  },
  note: {
    color: BRAND.muted,
    fontSize: 12,
    lineHeight: 1.7,
    marginTop: 22,
  },
  footer: {
    marginTop: 14,
    padding: "0 6px",
  },
  footerRule: {
    backgroundColor: BRAND.border,
    height: 1,
  },
  footerText: {
    color: BRAND.muted,
    fontSize: 11,
    margin: 0,
  },
};

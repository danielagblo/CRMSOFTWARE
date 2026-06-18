import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import puppeteer from "puppeteer";
import { getRequestAuditContext, recordAuditLogForUser } from "@/lib/audit";
import { formatCurrency } from "@/lib/siteSettings";

// ── CONSTANTS – swap as needed ──────────────────────────────────
const COMPANY = {
  name: "Acme Studio",
  tagline: "Creative Solutions & Consulting",
  address: "14 Independence Ave, Accra, Ghana",
  email: "hello@acmestudio.co",
  phone: "+233 20 000 0000",
  tin: "C000XXXXXXX",
  currency: "GHS",
  accent: "#1A1A2E",
  gold: "#C9A84C",
};
// ───────────────────────────────────────────────────────────────

function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get("X-User-Id");
}

function parseJsonData(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function toText(value: unknown, fallback = "N/A"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function safeFilename(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leadId = request.nextUrl.searchParams.get("leadId");
    if (!leadId) {
      return NextResponse.json(
        { error: "leadId is required" },
        { status: 400 },
      );
    }

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, createdBy: userId },
      include: {
        assignedUser: { select: { name: true, email: true } },
        stageData: {
          where: { stage: "PAYMENT" },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead not found or access denied" },
        { status: 404 },
      );
    }

    const paymentData = lead.stageData[0]
      ? parseJsonData(lead.stageData[0].data)
      : {};
    const invoiceNumber = toText(
      paymentData.invoiceNumber,
      `INV-${lead.id.slice(-6).toUpperCase()}`,
    );
    const invoiceDate = toText(
      paymentData.invoiceDate,
      new Date().toISOString().split("T")[0],
    );
    const paymentDueDate = toText(paymentData.paymentDueDate, "Upon Receipt");
    const paymentMethod = toText(paymentData.paymentMethod, "N/A");
    const paymentStatus = toText(paymentData.paymentStatus, "Pending");
    const amountReceived =
      parseFloat(toText(paymentData.amountReceived, "0")) || 0;
    const invoiceAmount = lead.dealValue ?? 0;
    const amountDue = invoiceAmount - amountReceived;

    const isPaid = paymentStatus.toLowerCase() === "paid";
    const isOverdue = paymentStatus.toLowerCase() === "overdue";

    const statusBg = isPaid ? "#D1FAE5" : isOverdue ? "#FEE2E2" : "#FEF3C7";
    const statusFg = isPaid ? "#065F46" : isOverdue ? "#991B1B" : "#854D0E";

    // Watermark text/colour only when not paid
    const watermarkText = isOverdue ? "OVERDUE" : !isPaid ? "UNPAID" : "";
    const watermarkColor = isOverdue
      ? "rgba(239,68,68,0.07)"
      : "rgba(234,179,8,0.06)";

    const docHtml = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>
  /* ── Reset & page lock ───────────────────────────── */
  @page { size: A4 portrait; margin: 0; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    width: 210mm;
    height: 297mm;
    overflow: hidden;          /* nothing bleeds past one page */
    background: #fff;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #1F2937;
    font-size: 11.5px;
    line-height: 1.45;
  }

  /* ── Outer shell ─────────────────────────────────── */
  .page {
    width: 210mm;
    height: 297mm;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  /* ── Watermark ───────────────────────────────────── */
  .watermark {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 0;
  }
  .watermark span {
    font-size: 90px;
    font-weight: 900;
    letter-spacing: 12px;
    color: ${watermarkColor};
    transform: rotate(-35deg);
    text-transform: uppercase;
    white-space: nowrap;
  }

  /* ── Everything above watermark ─────────────────── */
  .content { position: relative; z-index: 1; display: flex; flex-direction: column; height: 100%; }

  /* ── Header band ─────────────────────────────────── */
  .header {
    background: ${COMPANY.accent};
    padding: 20px 28px 16px;
    flex-shrink: 0;
  }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .gold-bar { height: 3px; background: ${COMPANY.gold}; border-radius: 2px; margin-bottom: 16px; }
  .company-name {
    font-size: 17px; font-weight: 700; color: #fff;
    letter-spacing: 0.06em; text-transform: uppercase;
  }
  .company-sub { font-size: 9.5px; color: #A5B4FC; margin-top: 3px; }
  .company-contact { font-size: 9.5px; color: #94A3B8; text-align: right; line-height: 1.7; }

  .header-bottom { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 14px; }
  .invoice-ghost {
    font-size: 44px; font-weight: 900; color: rgba(255,255,255,0.06);
    letter-spacing: 0.14em; line-height: 1;
  }
  .invoice-ref { text-align: right; }
  .invoice-num { font-size: 17px; font-weight: 700; color: ${COMPANY.gold}; }
  .invoice-num-label { font-size: 8.5px; color: #94A3B8; letter-spacing: 0.08em; margin-top: 2px; }

  /* ── Gold stripe ─────────────────────────────────── */
  .gold-stripe { height: 3px; background: ${COMPANY.gold}; flex-shrink: 0; }

  /* ── Body ────────────────────────────────────────── */
  .body { padding: 18px 28px 0; flex: 1; display: flex; flex-direction: column; gap: 14px; overflow: hidden; }

  /* Bill-to / dates row */
  .meta-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .section-label {
    font-size: 8.5px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.1em; color: #6B7280; margin-bottom: 5px;
  }
  .client-name { font-size: 16px; font-weight: 700; color: ${COMPANY.accent}; }
  .client-sub { font-size: 10px; color: #6B7280; margin-top: 2px; }

  .dates { display: flex; gap: 28px; }
  .date-item { text-align: right; }
  .date-label { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.08em; color: #6B7280; margin-bottom: 2px; }
  .date-value { font-size: 11px; font-weight: 700; color: ${COMPANY.accent}; }

  /* Divider */
  .divider { border: none; border-top: 1px solid #E5E7EB; flex-shrink: 0; }

  /* Status bar */
  .status-bar {
    background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px;
    padding: 10px 16px; display: flex; gap: 32px; align-items: center;
  }
  .status-item { display: flex; flex-direction: column; gap: 2px; }
  .status-value { font-size: 11px; font-weight: 700; color: ${COMPANY.accent}; }
  .status-badge {
    display: inline-block; padding: 2px 10px; border-radius: 20px;
    font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
    background: ${statusBg}; color: ${statusFg};
  }

  /* Table */
  .items-table { width: 100%; border-collapse: collapse; border: 1px solid #E5E7EB; border-radius: 6px; overflow: hidden; }
  .items-table thead { background: #F0F4FF; }
  .items-table th {
    padding: 8px 14px; font-size: 9px; text-transform: uppercase;
    letter-spacing: 0.08em; color: ${COMPANY.accent}; font-weight: 700; text-align: left;
    border-bottom: 1px solid #E5E7EB;
  }
  .items-table th:last-child { text-align: right; }
  .items-table td { padding: 10px 14px; font-size: 11px; color: #374151; border-bottom: 1px solid #F3F4F6; }
  .items-table td:last-child { text-align: right; font-weight: 700; color: ${COMPANY.accent}; }
  .items-table tbody tr:last-child td { border-bottom: none; }
  .item-title { font-weight: 700; color: ${COMPANY.accent}; }
  .item-sub { font-size: 9.5px; color: #6B7280; margin-top: 1px; }

  /* Totals */
  .totals-wrap { display: flex; justify-content: flex-end; }
  .totals-box { width: 220px; }
  .total-line { display: flex; justify-content: space-between; padding: 5px 0; font-size: 11px; }
  .total-line + .total-line { border-top: 1px solid #F3F4F6; }
  .total-line .lbl { color: #6B7280; }
  .total-line .val { font-weight: 600; color: ${COMPANY.accent}; }
  .total-line.credit .val { color: #059669; }
  .total-line.balance {
    border-top: 2px solid ${COMPANY.accent} !important;
    margin-top: 4px; padding-top: 8px;
  }
  .total-line.balance .lbl { font-size: 12px; font-weight: 700; color: ${COMPANY.accent}; }
  .total-line.balance .val { font-size: 15px; font-weight: 700; color: ${COMPANY.gold}; }

  /* Payment note (only when unpaid) */
  .payment-note {
    background: #EFF6FF; border-left: 3px solid #3B82F6;
    border-radius: 4px; padding: 9px 14px; font-size: 10px;
    color: #1E40AF; line-height: 1.6;
  }
  .payment-note strong { font-weight: 700; }

  /* ── Footer ─────────────────────────────────────── */
  .footer {
    background: ${COMPANY.accent};
    padding: 0 28px 0;
    flex-shrink: 0;
    margin-top: auto;
  }
  .footer-inner {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 0 12px;
    border-top: 3px solid ${COMPANY.gold};
  }
  .footer-left { font-size: 9px; color: #94A3B8; line-height: 1.7; }
  .footer-right { font-size: 9px; color: #94A3B8; text-align: right; }
  .footer-company { font-size: 11px; font-weight: 700; color: #fff; margin-bottom: 2px; }
</style>
</head>
<body>
<div class="page">

  ${watermarkText ? `<div class="watermark"><span>${watermarkText}</span></div>` : ""}

  <div class="content">

    <!-- Header -->
    <div class="header">
      <div class="gold-bar"></div>
      <div class="header-top">
        <div>
          <div class="company-name">${COMPANY.name}</div>
          <div class="company-sub">${COMPANY.tagline}</div>
        </div>
        <div class="company-contact">
          ${COMPANY.address}<br/>
          ${COMPANY.email}<br/>
          ${COMPANY.phone}
        </div>
      </div>
      <div class="header-bottom">
        <div class="invoice-ghost">INVOICE</div>
        <div class="invoice-ref">
          <div class="invoice-num">${invoiceNumber}</div>
          <div class="invoice-num-label">Invoice Number</div>
        </div>
      </div>
    </div>

    <!-- Gold stripe -->
    <div class="gold-stripe"></div>

    <!-- Body -->
    <div class="body">

      <!-- Bill To + Dates -->
      <div class="meta-row">
        <div>
          <div class="section-label">Bill To</div>
          <div class="client-name">${toText(lead.clientName)}</div>
          <div class="client-sub">${toText(lead.email, "")}</div>
        </div>
        <div class="dates">
          <div class="date-item">
            <div class="date-label">Invoice Date</div>
            <div class="date-value">${invoiceDate}</div>
          </div>
          <div class="date-item">
            <div class="date-label">Due Date</div>
            <div class="date-value">${paymentDueDate}</div>
          </div>
        </div>
      </div>

      <hr class="divider"/>

      <!-- Status bar -->
      <div class="status-bar">
        <div class="status-item">
          <div class="section-label">Service</div>
          <div class="status-value">${toText(lead.serviceType, "Service Engagement")}</div>
        </div>
        <div class="status-item">
          <div class="section-label">Payment Method</div>
          <div class="status-value">${paymentMethod}</div>
        </div>
        <div class="status-item">
          <div class="section-label">Prepared By</div>
          <div class="status-value">${toText(lead.assignedUser?.name, "CRM Team")}</div>
        </div>
        <div class="status-item" style="margin-left:auto;">
          <div class="section-label">Status</div>
          <span class="status-badge">${paymentStatus}</span>
        </div>
      </div>

      <!-- Line items table -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width:55%">Description</th>
            <th style="width:20%">Category</th>
            <th style="width:25%">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="item-title">${toText(lead.serviceType, "Service Engagement")}</div>
              <div class="item-sub">${toText(lead.serviceCategory ?? "", "")}</div>
            </td>
            <td>${toText(lead.serviceCategory ?? "", "General")}</td>
            <td>${formatCurrency(invoiceAmount, COMPANY.currency)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Totals -->
      <div class="totals-wrap">
        <div class="totals-box">
          <div class="total-line">
            <span class="lbl">Invoice Amount</span>
            <span class="val">${formatCurrency(invoiceAmount, COMPANY.currency)}</span>
          </div>
          ${
            amountReceived > 0
              ? `
          <div class="total-line credit">
            <span class="lbl">Amount Received</span>
            <span class="val">- ${formatCurrency(amountReceived, COMPANY.currency)}</span>
          </div>`
              : ""
          }
          <div class="total-line balance">
            <span class="lbl">Balance Due</span>
            <span class="val">${formatCurrency(amountDue, COMPANY.currency)}</span>
          </div>
        </div>
      </div>

      ${
        !isPaid
          ? `
      <!-- Payment note -->
      <div class="payment-note">
        <strong>Payment Information —</strong>
        Accepted via Bank Transfer or Mobile Money (MTN, Vodafone, AirtelTigo).
        Please include <strong>${invoiceNumber}</strong> as your payment reference.
        Payment due by <strong>${paymentDueDate}</strong>.
      </div>`
          : ""
      }

    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-inner">
        <div>
          <div class="footer-company">${COMPANY.name}</div>
          <div class="footer-left">${COMPANY.address} · TIN: ${COMPANY.tin}</div>
        </div>
        <div class="footer-right">
          ${COMPANY.email}<br/>
          ${COMPANY.phone}
        </div>
      </div>
    </div>

  </div>
</div>
</body>
</html>`;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(docHtml, { waitUntil: "load" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
        pageRanges: "1", // hard cap: only page 1 ever renders
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `invoice-${safeFilename(lead.clientName)}-${timestamp}.pdf`;

      const auditContext = getRequestAuditContext(request);
      await recordAuditLogForUser(
        prisma,
        userId,
        {
          action: "DOWNLOAD",
          entityType: "Invoice",
          entityId: lead.id,
          description: `Downloaded invoice ${invoiceNumber} for ${lead.clientName}`,
          metadata: {
            invoiceNumber,
            invoiceAmount,
            paymentStatus,
          },
          ...auditContext,
        },
        "Failed to write invoice download audit log:",
      );

      return new NextResponse(Buffer.from(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to download invoice" },
      { status: 500 },
    );
  }
}

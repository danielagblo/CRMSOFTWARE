import { NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { InvoiceEmail } from "@/components/emails/InvoiceEmail";

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

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leadId, email } = await request.json();
    if (!leadId) {
      return NextResponse.json(
        { error: "leadId is required" },
        { status: 400 },
      );
    }

    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        createdBy: userId,
      },
      include: {
        assignedUser: {
          select: { name: true, email: true },
        },
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

    const clientEmail = email || lead.email;

    if (!clientEmail) {
      return NextResponse.json(
        {
          error:
            "Client email is missing. Add an email to this lead before issuing invoice.",
        },
        { status: 400 },
      );
    }

    if (email && email !== lead.email) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { email },
      });
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
    const paymentDueDate = toText(paymentData.paymentDueDate, "Not specified");
    const paymentMethod = toText(paymentData.paymentMethod);
    const paymentStatus = toText(paymentData.paymentStatus, "Pending");
    const amountReceived = toText(paymentData.amountReceived, "0");
    const invoiceAmount = lead.dealValue ?? 0;

    const subject = `Invoice ${invoiceNumber} - ${lead.clientName}`;
    const response = await sendMail({
      to: clientEmail,
      subject,
      react: createElement(InvoiceEmail, {
        clientName: lead.clientName,
        invoiceNumber,
        invoiceDate,
        paymentDueDate,
        serviceType: toText(lead.serviceType, "Service engagement"),
        invoiceAmount: invoiceAmount.toLocaleString(),
        amountReceived,
        paymentMethod,
        paymentStatus,
        senderName: lead.assignedUser?.name || "CRM Team",
      }),
    });

    if (response.error) {
      return NextResponse.json(
        { error: response.error.message || "Failed to send invoice" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      clientEmail: clientEmail,
      invoiceNumber,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to issue invoice" },
      { status: 500 },
    );
  }
}

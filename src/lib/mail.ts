import { Resend, type Attachment, type CreateEmailOptions } from "resend";
import type { ReactNode } from "react";

type SendMailOptions = {
  to: string | string[];
  subject: string;
  react?: ReactNode;
  html?: string;
  text?: string;
  attachments?: Attachment[];
  replyTo?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  from?: string;
};

let resendClient: Resend | null = null;

function getResendKey(): string {
  const key = process.env.RESEND_API_KEY || process.env.RESEND_KEY;

  if (!key) {
    throw new Error(
      "Resend is not configured. Set RESEND_API_KEY (or RESEND_KEY) in your environment.",
    );
  }

  return key;
}

function getDefaultFrom(): string {
  return process.env.RESEND_FROM || "onboarding@resend.dev";
}

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(getResendKey());
  }

  return resendClient;
}

export async function sendMail(options: SendMailOptions) {
  const { from, ...payload } = options;

  if (!payload.react && !payload.html && !payload.text) {
    throw new Error("Email content is required.");
  }

  const emailPayload = {
    from: from || getDefaultFrom(),
    ...payload,
  } as CreateEmailOptions;

  return getResendClient().emails.send(emailPayload);
}

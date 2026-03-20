import { getTwilioClient } from "./client";

const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886";
const WHATSAPP_MODE = process.env.WHATSAPP_MODE ?? "sandbox";

export async function sendWhatsAppTemplate(params: {
  to: string;
  templateName: string;
  templateVariables: Record<string, string>;
  buttonUrl?: string;
}): Promise<{ messageSid: string; status: string }> {
  // Format the phone number for WhatsApp
  const toWhatsApp = params.to.startsWith("whatsapp:")
    ? params.to
    : `whatsapp:${params.to}`;

  if (WHATSAPP_MODE === "sandbox") {
    return sendSandboxMessage(toWhatsApp, params);
  }

  return sendProductionTemplate(toWhatsApp, params);
}

async function sendSandboxMessage(
  to: string,
  params: {
    templateName: string;
    templateVariables: Record<string, string>;
    buttonUrl?: string;
  }
): Promise<{ messageSid: string; status: string }> {
  const client = getTwilioClient();

  // In sandbox mode, send a plain text message with template content
  const varValues = Object.values(params.templateVariables).join(", ");
  let body = `[${params.templateName}] ${varValues}`;
  if (params.buttonUrl) {
    body += `\n\nOpen: ${params.buttonUrl}`;
  }

  const message = await client.messages.create({
    from: WHATSAPP_FROM,
    to,
    body,
  });

  return { messageSid: message.sid, status: message.status };
}

async function sendProductionTemplate(
  to: string,
  params: {
    templateName: string;
    templateVariables: Record<string, string>;
    buttonUrl?: string;
  }
): Promise<{ messageSid: string; status: string }> {
  const client = getTwilioClient();

  // In production, use Twilio Content API with ContentSid
  // The ContentSid maps to pre-approved WhatsApp templates
  // For now, fall back to plain text until templates are approved
  const varValues = Object.values(params.templateVariables).join(", ");
  let body = `${varValues}`;
  if (params.buttonUrl) {
    body += `\n\n${params.buttonUrl}`;
  }

  const message = await client.messages.create({
    from: WHATSAPP_FROM,
    to,
    body,
  });

  return { messageSid: message.sid, status: message.status };
}

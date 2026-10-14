/** Brevo transactional email over HTTPS (Render Free compatible). */
function senderDetails(from) {
  const configuredAddress = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER;
  if (!configuredAddress) throw new Error("EMAIL_FROM_ADDRESS must be a verified Brevo sender address.");
  const match = typeof from === "string" && from.match(/^\s*"?([^"<>]+)"?\s*<[^<>]+>\s*$/);
  return {
    email: configuredAddress,
    name: (match?.[1]?.trim() || process.env.EMAIL_FROM_NAME || "NUnified Event Management"),
  };
}

export async function sendEmailViaBrevo({ from, to, subject, text, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY is missing from the backend environment.");
  if (!to || !subject || (!text && !html)) throw new Error("Email recipient, subject and content are required.");
  const recipients = (Array.isArray(to) ? to : String(to).split(","))
    .map(item => typeof item === "string" ? { email: item.trim() } : item)
    .filter(item => item.email);
  if (!recipients.length) throw new Error("Valid email recipient is required.");

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: senderDetails(from),
      to: recipients,
      subject,
      ...(text ? { textContent: text } : {}),
      ...(html ? { htmlContent: html } : {}),
    }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Brevo email delivery rejected (HTTP ${response.status}): ${body.message || body.code || "Unknown provider error"}`);
  }
  return { messageId: body.messageId || null, accepted: recipients.map(r => r.email), provider: "brevo" };
}

// Maintains the existing Nodemailer-style sendMail interface to preserve email templates.
export function createBrevoTransport() {
  return {
    sendMail: sendEmailViaBrevo,
    verify: async () => {
      if (!process.env.BREVO_API_KEY || !(process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER)) {
        throw new Error("BREVO_API_KEY and EMAIL_FROM_ADDRESS are required.");
      }
      return true; // Configuration check, not a remote delivery test.
    },
  };
}

const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const contactQuestionEmail = (
  sender: string,
  message: string
): { subject: string; html: string } => {

  if (!sender.trim() || !message.trim()) {
    throw new Error("sender and message must be non-empty strings");
  }

  const safeSender = escapeHtml(sender);
  const safeMessage = escapeHtml(message);
  
  const PREVIEW_LENGTH = 32;
  const preview = safeMessage.length > PREVIEW_LENGTH
      ? safeMessage.slice(0, PREVIEW_LENGTH).trimEnd() + "..."
      : safeMessage;
  const subject = `Question — ${safeSender.replace(/[\r\n]+/g, " ").trim()}: "${preview}..."`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${subject}</title>
</head>

<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="margin:0;padding:40px 16px;background:#f4f4f5;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
          style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08),0 8px 24px rgba(0,0,0,0.06);">

          <!-- Header bar -->
          <tr>
            <td style="background:#18181b;padding:28px 36px;">
              <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#71717a;">
                New Contact Question
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 28px;">

              <!-- Sender row -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="margin-bottom:28px;">
                <tr>
                  <td style="vertical-align:middle;">
                    <!-- Avatar -->
                    <table cellpadding="0" cellspacing="0" role="presentation"
                      style="display:inline-table;vertical-align:middle;margin-right:14px;">
                      <tr>
                        <td style="width:44px;height:44px;border-radius:50%;background:#18181b;text-align:center;vertical-align:middle;">
                          <span style="font-size:17px;font-weight:700;color:#ffffff;line-height:44px;display:block;">
                            ${safeSender.charAt(0).toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    </table>
                    <!-- Name & label -->
                    <table cellpadding="0" cellspacing="0" role="presentation"
                      style="display:inline-table;vertical-align:middle;">
                      <tr>
                        <td>
                          <p style="margin:0 0 2px;font-size:15px;font-weight:600;color:#18181b;">
                            ${safeSender}
                          </p>
                          <p style="margin:0;font-size:12px;color:#a1a1aa;">
                            Sent a question via contact form
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #f1f1f1;margin:0 0 28px;" />

              <!-- Message label -->
              <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#a1a1aa;">
                Message
              </p>

              <!-- Message bubble -->
              <div style="background:#fafafa;border-left:3px solid #18181b;border-radius:0 8px 8px 0;padding:18px 20px;margin-bottom:32px;">
                <p style="margin:0;font-size:15px;line-height:1.7;color:#3f3f46;white-space:pre-wrap;">
                  ${safeMessage}
                </p>
              </div>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="border-radius:8px;background:#18181b;">
                    <a href="mailto:${safeSender}"
                      style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">
                      Reply to ${safeSender}
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;border-top:1px solid #f1f1f1;padding:20px 36px;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
                This message was submitted through SPLETKA's website contact form.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>`;

  return { subject, html };
};
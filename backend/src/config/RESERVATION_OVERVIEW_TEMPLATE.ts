import { RESERVATION_CONFIRMATION_WINDOW_MINUTES } from "../services/reservations.service.js";
import type { Reservation } from "../types/reservation.js";
    
export const reservationConfirmationEmail = (
  reservation: Reservation,
  reservationId: string
): { subject: string; html: string } => {
  const APP_URL = process.env.APP_URL ?? "https://spletka.com";
  const link = `${APP_URL}/reservation/${reservationId}`;

  const addonRows = reservation.addons.length
    ? reservation.addons
        .map(
          (a) => `
          <tr>
            <td style="padding: 6px 0; color: #555; font-size: 14px;">+ ${a.name}</td>
            <td style="padding: 6px 0; color: #555; font-size: 14px; text-align: right;">${a.price}</td>
          </tr>`
        )
        .join("")
    : "";

  const subject = `Confirm Reservation — ${reservation.studioName}, ${reservation.timeslot.date}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${subject}</title>
</head>

<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.08);">

<!-- HEADER -->
<tr>
<td style="background:#18181b;padding:28px 36px;">
<p style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">
${reservation.studioName}
</p>

<p style="margin:6px 0 0;color:#a1a1aa;font-size:13px;letter-spacing:.05em;">
Reservation
</p>
</td>
</tr>

<!-- BODY -->
<tr>
<td style="padding:34px 36px;">

<!-- ITEM TITLE -->
<p style="margin:0 0 24px;color:#18181b;font-size:18px;font-weight:600;">
${reservation.articleName}
${reservation.categoryName ? `<span style="color:#71717a;font-weight:400;"> — ${reservation.categoryName}</span>` : ""}
</p>

<!-- DETAILS CARD -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #f0f0f0;border-radius:8px;padding:18px 20px;margin-bottom:24px;">

<tr>
<td style="padding:6px 0;color:#52525b;font-size:14px;">
📅 ${reservation.timeslot.date}
</td>
</tr>

<tr>
<td style="padding:6px 0;color:#52525b;font-size:14px;">
🕒 ${reservation.timeslot.start}${reservation.timeslot.end ? ` – ${reservation.timeslot.end}` : ""}
</td>
</tr>

<tr>
<td style="padding:6px 0;color:#52525b;font-size:14px;">
📍 ${reservation.address}, ${reservation.city}, ${reservation.country}
</td>
</tr>

<tr>
<td style="padding-top:10px;">
<hr style="border:none;border-top:1px solid #e4e4e7;margin:8px 0;">
</td>
</tr>

<tr>
<td style="padding-top:6px;color:#18181b;font-size:14px;font-weight:600;">
⏱ ${reservation.duration} min
</td>
</tr>

</table>

<!-- PRICE CARD -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #f0f0f0;border-radius:8px;padding:18px 20px;margin-bottom:28px;">

<tr>
<td style="padding:6px 0;color:#52525b;font-size:14px;">
Base
</td>

<td style="padding:6px 0;color:#52525b;font-size:14px;text-align:right;">
${reservation.price} ${reservation.currency}
</td>
</tr>

${addonRows}

${reservation.discount > 0 ? `
<tr>
<td style="padding:6px 0;color:#16a34a;font-size:14px;">
− Discount
</td>

<td style="padding:6px 0;color:#16a34a;font-size:14px;text-align:right;">
${reservation.discount}%
</td>
</tr>` : ""}

<tr>
<td colspan="2" style="padding:8px 0;">
<hr style="border:none;border-top:1px solid #e4e4e7;margin:0;">
</td>
</tr>

<tr>
<td style="padding:8px 0 0;color:#18181b;font-size:15px;font-weight:600;">
Duration
</td>

<td style="padding:8px 0 0;color:#18181b;font-size:15px;font-weight:600;text-align:right;">
${reservation.duration} min
</td>
</tr>

</table>

<p style="margin:26px 1 1;color:#a1a1aa;font-size:12px;text-align:center;line-height:1.6">
⏳ Expires in ${RESERVATION_CONFIRMATION_WINDOW_MINUTES} min
</p>

<!-- CTA -->
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">

<a href="${link}"
style="
display:inline-block;
background:#18181b;
color:#ffffff;
text-decoration:none;
font-size:15px;
font-weight:600;
padding:16px 40px;
border-radius:8px;
letter-spacing:.02em;
">
Confirm Reservation
</a>

</td>
</tr>
</table>

<!-- LINK -->
<p style="margin:26px 0 0;color:#a1a1aa;font-size:12px;text-align:center;line-height:1.6;">
${link}
</p>

</td>
</tr>

<!-- FOOTER -->
<tr>
<td style="background:#f4f4f5;padding:18px 36px;border-top:1px solid #e4e4e7;">

<p style="margin:0;color:#a1a1aa;font-size:12px;text-align:center;">
Automated Message - Do Not Respond
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>`;

  return { subject, html };
};
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface SendMailOptions {
  to:      string;
  subject: string;
  html:    string;
}

export const sendMail = async (options: SendMailOptions): Promise<void> => {
  const info = await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? 'SPLETKA'}" <${process.env.SMTP_FROM_ADDRESS}>`,
    to:      options.to,
    subject: options.subject,
    html:    options.html,
  });
  console.log(`Mail sent to ${options.to} — messageId: ${info.messageId}`);
};

export interface ReceiveMailOptions {
  sender:      string;
  subject: string;
  html:    string;
}


export const receiveMail = async(options: ReceiveMailOptions): Promise<void> => {
  const info = await transporter.sendMail({
    from: `"${'SPLETKA CONTACT'}" <${process.env.SMTP_FROM_ADDRESS}>`,
    to:      process.env.SMTP_RECEIVE_ADDRESS,
    subject: options.subject,
    html:    options.html,
  });
  console.log(`Mail sent from ${options.sender} — messageId: ${info.messageId}`);
}
import type { Request, Response, NextFunction } from "express";
import { receiveMail } from "../services/email.service.js";
import { contactQuestionEmail } from "../config/QUESTION_CONTACT_TEMPLATE.js";

export const sendQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, message } = req.body;

    if (!email || !message) {
      res.status(400).json({ status: "error", data: false, message: "Email and message are required" });
      return;
    }

    try {
      const { subject, html } = contactQuestionEmail(email, message);
      await receiveMail({ sender: email, subject, html });
    } catch (mailErr) {
      console.error("Failed to receive question:", mailErr);
      res.status(400).json({status: 'error', data: false, message: "Failed to send question"});
      return;
    }

    res.status(200).json({ status: "success", data: true });
  } catch (err) {
    next(err);
  }
};
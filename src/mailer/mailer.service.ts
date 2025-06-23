// mail/sendgrid.service.ts
import { Injectable } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);
  }

  private readonly transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_PASS,
    },
  });

  transporter2 = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  async sendResetEmail(to: string, token: string) {
    const link2 = `https://your‑app.com/reset-password?token=${token}`;
    const link = `http://localhost:3000/reset-password?token=${token}`;
    try {
      await sgMail.send({
        to,
        from: 'no‑reply@your‑app.com',
        subject: 'Reset your password',
        html: `<p>Click <a href="${link}">here</a> to reset your password. This link expires in 1 hour.</p>`,
      });
    } catch (err) {
      console.log(err);
    }
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    await this.transporter.sendMail({
      from: `"No Reply" <${process.env.GMAIL_EMAIL}>`,
      to,
      subject,
      html,
    });
  }
}

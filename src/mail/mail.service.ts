// mail/mail.service.ts
import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import * as hbs from 'handlebars';
import * as nodemailer from 'nodemailer';
import { join } from 'path';

@Injectable()
export class MailService {
  private readonly transporters = {
    gmail: nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_PASS,
      },
    }),
    sendgrid: nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 465,
      secure: true,
      auth: {
        user: 'apikey', // always 'apikey'
        pass: process.env.SENDGRID_API_KEY,
      },
    }),
    mailgun: nodemailer.createTransport({
      host: 'smtp.mailgun.org',
      port: 587,
      auth: {
        user: 'postmaster@' + process.env.MAILGUN_DOMAIN,
        pass: process.env.MAILGUN_PASS,
      },
    }),
  };

  private compileTemplate(templateName: string, context: any): string {
    const filePath = join(__dirname, 'templates', `${templateName}.hbs`);
    const source = readFileSync(filePath, 'utf8');
    const template = hbs.compile(source);
    return template(context);
  }

  async sendWith(
    provider: 'gmail' | 'sendgrid' | 'mailgun',
    to: string,
    subject: string,
    template: string,
    context: any,
  ) {
    const html = this.compileTemplate(template, context);

    const res = await this.transporters[provider].sendMail({
      to,
      from: `Discussday <noreply.${process.env.GMAIL_EMAIL}>`,
      subject,
      html,
    });
    console.log(res, 'restooo');
  }
}

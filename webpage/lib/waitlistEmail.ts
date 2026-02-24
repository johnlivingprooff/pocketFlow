import nodemailer from 'nodemailer';
import { adminEmail } from '@/lib/links';

type WaitlistWelcomeEmailInput = {
  email: string;
  fullname: string;
  betaWhatsappUrl: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function buildWelcomeEmail(input: WaitlistWelcomeEmailInput) {
  const firstName = input.fullname.trim().split(/\s+/)[0] || 'there';
  const subject = 'Welcome to pocketFlow beta access';

  const text = [
    `Hi ${firstName},`,
    '',
    'Thanks for joining the pocketFlow waitlist.',
    '',
    'pocketFlow is an offline-first personal finance app focused on trusted cash-flow tracking, receipts, budgets, and goal planning.',
    '',
    'To test early builds before production, join the beta-test WhatsApp group:',
    input.betaWhatsappUrl,
    '',
    'What you will get in the beta group:',
    '- Early release links',
    '- Testing guidance and feedback requests',
    '- Direct product updates from the team',
    '',
    `If you need help joining, reply to this email (${adminEmail}).`,
    '',
    'Best regards,',
    'The pocketFlow team',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <p>Hi ${firstName},</p>
      <p>Thanks for joining the <strong>pocketFlow</strong> waitlist.</p>
      <p>
        pocketFlow is an offline-first personal finance app focused on trusted cash-flow tracking,
        receipts, budgets, and goal planning.
      </p>
      <p>
        To test early builds before production, join the beta-test WhatsApp group:<br />
        <a href="${input.betaWhatsappUrl}" target="_blank" rel="noopener noreferrer">${input.betaWhatsappUrl}</a>
      </p>
      <p style="margin-bottom: 0.4rem;"><strong>What you will get in the beta group:</strong></p>
      <ul style="margin-top: 0.2rem;">
        <li>Early release links</li>
        <li>Testing guidance and feedback requests</li>
        <li>Direct product updates from the team</li>
      </ul>
      <p>
        If you need help joining, reply to this email (${adminEmail}).
      </p>
      <p>
        Best regards,<br />
        The pocketFlow team
      </p>
    </div>
  `;

  return { subject, text, html };
}

export async function sendWaitlistWelcomeEmail(input: WaitlistWelcomeEmailInput) {
  const host = requiredEnv('SMTP_HOST');
  const user = requiredEnv('SMTP_USER');
  const pass = requiredEnv('SMTP_PASS');
  const port = Number(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  const welcomeEmail = buildWelcomeEmail(input);

  await transporter.sendMail({
    from: process.env.WAITLIST_FROM_EMAIL?.trim() || `pocketFlow <${adminEmail}>`,
    to: input.email,
    replyTo: adminEmail,
    subject: welcomeEmail.subject,
    text: welcomeEmail.text,
    html: welcomeEmail.html,
  });
}

import nodemailer, { type Transporter } from 'nodemailer';

function envFlag(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).toLowerCase());
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export interface EmailConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromAddress: string;
  replyTo?: string;
}

export function getEmailConfig(): EmailConfig {
  const enabled = envFlag('EMAIL_ENABLED', false);
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE
    ? ['1', 'true', 'yes', 'on'].includes(String(process.env.SMTP_SECURE).toLowerCase())
    : port === 465;

  if (!enabled) {
    return {
      enabled,
      host,
      port,
      secure,
      user: '',
      pass: '',
      fromName: process.env.EMAIL_FROM_NAME || 'Instructor Adewale',
      fromAddress: process.env.EMAIL_FROM_ADDRESS || '',
      replyTo: process.env.EMAIL_REPLY_TO || undefined
    };
  }

  const user = requireEnv('SMTP_USER');
  const pass = requireEnv('SMTP_PASS');

  return {
    enabled,
    host,
    port,
    secure,
    user,
    pass,
    fromName: process.env.EMAIL_FROM_NAME || 'Instructor Adewale',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || user,
    replyTo: process.env.EMAIL_REPLY_TO || undefined
  };
}

let cachedTransport: Transporter | null = null;

export function getEmailTransport(): Transporter {
  if (cachedTransport) return cachedTransport;
  const config = getEmailConfig();

  cachedTransport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.enabled
      ? {
          user: config.user,
          pass: config.pass
        }
      : undefined
  });

  return cachedTransport;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ messageId?: string }> {
  const config = getEmailConfig();
  if (!config.enabled) {
    return {};
  }

  const transport = getEmailTransport();

  const info = await transport.sendMail({
    from: { name: config.fromName, address: config.fromAddress },
    to: params.to,
    replyTo: config.replyTo,
    subject: params.subject,
    html: params.html,
    text: params.text
  });

  return { messageId: info.messageId };
}

import nodemailer, { Transporter } from 'nodemailer';
import dns from 'dns';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Enforce IPv4 DNS resolution
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

interface SendDueReminderOptions {
  toEmail: string;
  friendName: string;
  lenderName: string;
  amount: number;
  description?: string | null;
  dueDate?: Date | string | null;
  claimToken: string;
  appUrl?: string;
}

interface SendLenderNoticeOptions {
  lenderEmail: string;
  lenderName: string;
  friendName: string;
  amount: number;
  description?: string | null;
}

interface SendDisputeNoticeOptions {
  toEmail: string;
  friendName: string;
  lenderName: string;
  amount: number;
  description?: string | null;
  claimToken: string;
  appUrl?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initTransporter();
  }

  public initTransporter() {
    const candidatePaths = [
      path.resolve(process.cwd(), 'server/.env'),
      path.resolve(process.cwd(), '.env'),
      path.resolve(__dirname, '../../.env'),
      path.resolve(__dirname, '../../../server/.env'),
    ];

    for (const envPath of candidatePaths) {
      if (fs.existsSync(envPath)) {
        try {
          const parsed = dotenv.parse(fs.readFileSync(envPath));
          for (const key in parsed) {
            if (parsed[key] && !process.env[key]) {
              process.env[key] = parsed[key];
            } else if (parsed[key] && (key.startsWith('SMTP_') || key === 'APP_URL')) {
              process.env[key] = parsed[key];
            }
          }
        } catch {
          // ignore
        }
      }
    }

    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.replace(/\s+/g, '').trim();
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 587;

    if (user && pass && user !== 'your-email@gmail.com' && !user.includes('example.com')) {
      const isGmail = host.includes('gmail.com') || user.endsWith('@gmail.com');
      this.transporter = nodemailer.createTransport(
        (isGmail
          ? {
              host: 'smtp.gmail.com',
              port: 465,
              secure: true,
              family: 4, // Force IPv4 to prevent cloud container IPv6 ENETUNREACH
              auth: { user, pass },
              connectionTimeout: 10000,
              greetingTimeout: 10000,
              socketTimeout: 15000,
            }
          : {
              host,
              port,
              secure: port === 465,
              family: 4, // Force IPv4
              auth: { user, pass },
              connectionTimeout: 10000,
              greetingTimeout: 10000,
              socketTimeout: 15000,
            }) as any
      );
      this.isConfigured = true;
      console.log(`[EmailService] Configured SMTP Transport via ${isGmail ? 'Gmail Service (Port 465 SSL IPv4)' : `${host}:${port}`} (${user})`);
    } else {
      this.isConfigured = false;
      this.transporter = null;
    }
  }

  private getAppUrl(appUrl?: string): string {
    return (
      appUrl ||
      process.env.APP_URL ||
      process.env.CLIENT_URL ||
      'http://localhost:5000'
    );
  }

  public getDiagnostics() {
    this.initTransporter();
    const candidatePaths = [
      path.resolve(process.cwd(), 'server/.env'),
      path.resolve(process.cwd(), '.env'),
      path.resolve(__dirname, '../../.env'),
    ];
    const checkedFiles: Record<string, boolean> = {};
    for (const p of candidatePaths) {
      checkedFiles[p] = fs.existsSync(p);
    }

    return {
      isConfigured: this.isConfigured || !!process.env.RESEND_API_KEY || !!process.env.BREVO_API_KEY,
      provider: process.env.RESEND_API_KEY ? 'resend (https)' : process.env.BREVO_API_KEY ? 'brevo (https)' : 'smtp',
      smtpUser: process.env.SMTP_USER ? `${process.env.SMTP_USER.slice(0, 3)}***@${process.env.SMTP_USER.split('@')[1] || ''}` : '(empty)',
      smtpPassLength: process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '').length : 0,
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: Number(process.env.SMTP_PORT) || 465,
      checkedFiles,
    };
  }

  private async sendViaHttpsApi(to: string, subject: string, html: string): Promise<{ mode: string; error?: string } | null> {
    const resendKey = process.env.RESEND_API_KEY?.trim();
    if (resendKey) {
      try {
        const from = process.env.RESEND_FROM || 'Finatle Reminders <onboarding@resend.dev>';
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: [to],
            subject,
            html,
          }),
        });
        if (res.ok) {
          console.log(`[EmailService] Dispatched email to ${to} via Resend HTTPS API`);
          return { mode: 'resend' };
        } else {
          const errData = await res.json().catch(() => ({})) as any;
          console.error('[EmailService] Resend API error:', errData);
          return { mode: 'failed', error: `Resend: ${errData?.message || JSON.stringify(errData)}` };
        }
      } catch (e: any) {
        console.error('[EmailService] Resend network error:', e);
        return { mode: 'failed', error: `Resend Network: ${e?.message || String(e)}` };
      }
    }

    const brevoKey = process.env.BREVO_API_KEY?.trim();
    if (brevoKey) {
      try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: {
              name: 'Finatle Reminders',
              email: process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || 'no-reply@finatle.app',
            },
            to: [{ email: to }],
            subject,
            htmlContent: html,
          }),
        });
        if (res.ok) {
          console.log(`[EmailService] Dispatched email to ${to} via Brevo HTTPS API`);
          return { mode: 'brevo' };
        }
      } catch (e) {
        console.error('[EmailService] Brevo network error:', e);
      }
    }

    return null;
  }

  /**
   * Send Overdue Payment Reminder to the Friend / Borrower
   */
  async sendDueReminder(opts: SendDueReminderOptions) {
    this.initTransporter();
    const { toEmail, friendName, lenderName, amount, description, dueDate, claimToken } = opts;
    const appBaseUrl = this.getAppUrl(opts.appUrl);
    const claimUrl = `${appBaseUrl}/api/finance/public/claim-paid?token=${claimToken}`;
    const formattedAmount = `₹${Math.round(amount).toLocaleString('en-IN')}`;
    const formattedDate = dueDate
      ? new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Recently';

    const subject = `Payment Reminder: ${formattedAmount} for ${description || 'Shared Expense'}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .logo { font-size: 20px; font-weight: 800; color: #059669; margin-bottom: 20px; }
    h2 { font-size: 20px; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
    p { font-size: 15px; line-height: 1.6; color: #475569; margin: 8px 0; }
    .amount-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0; }
    .amount-val { font-size: 28px; font-weight: 800; color: #065f46; }
    .amount-desc { font-size: 14px; color: #047857; margin-top: 4px; font-weight: 500; }
    .btn { display: inline-block; background-color: #059669; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 15px; margin-top: 14px; text-align: center; }
    .footer { font-size: 12px; color: #94a3b8; margin-top: 28px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Finatle</div>
    <h2>Hi ${friendName || 'there'},</h2>
    <p>This is a friendly reminder from <strong>${lenderName || 'your friend'}</strong> regarding the pending settlement due on <strong>${formattedDate}</strong>.</p>
    
    <div class="amount-box">
      <div class="amount-val">${formattedAmount}</div>
      <div class="amount-desc">${description || 'Shared Expense'}</div>
    </div>

    <p>If you have already paid or transferred this amount, please click below to notify ${lenderName} and stop these reminders:</p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${claimUrl}" class="btn" target="_blank">✓ I Have Paid This Amount</a>
    </div>

    <p style="font-size: 13px; color: #64748b;">Once you click, we will automatically acknowledge ${lenderName} and snooze further reminders.</p>

    <div class="footer">
      Sent securely via Finatle • Personal Finance & Shared Settlements
    </div>
  </div>
</body>
</html>
`;

    // 1. First attempt HTTPS API (Resend / Brevo) if configured
    const httpsRes = await this.sendViaHttpsApi(toEmail, subject, htmlContent);
    if (httpsRes?.mode && httpsRes.mode !== 'failed') {
      return { success: true, mode: httpsRes.mode };
    }

    // 2. Attempt SMTP Transporter
    let smtpError: string | null = httpsRes?.error || null;
    if (this.isConfigured && this.transporter) {
      try {
        const sender = process.env.SMTP_FROM || `"Finatle Reminders" <${process.env.SMTP_USER}>`;
        await this.transporter.sendMail({
          from: sender,
          to: toEmail,
          subject,
          html: htmlContent,
        });
        console.log(`[EmailService] Reminder sent to ${toEmail} for ${formattedAmount}`);
        return { success: true, mode: 'smtp' };
      } catch (err: any) {
        smtpError = (smtpError ? `${smtpError} | ` : '') + (err?.message || String(err));
        console.error(`[EmailService] Failed to send email via SMTP to ${toEmail}:`, err);
      }
    }

    // Terminal Preview Fallback
    console.log('\n======================================================');
    console.log('📧 [FINATLE AUTOMATED EMAIL REMINDER - TERMINAL PREVIEW]');
    console.log(`To: ${toEmail} (${friendName})`);
    console.log(`From: ${lenderName}`);
    console.log(`Subject: ${subject}`);
    console.log(`Amount: ${formattedAmount} • Due: ${formattedDate}`);
    if (smtpError) {
      console.log(`⚠️ SMTP Error: ${smtpError}`);
    }
    console.log(`🔗 Clickable "I Have Paid" Action Link:`);
    console.log(`👉 ${claimUrl}`);
    console.log('======================================================\n');

    return { success: true, mode: 'preview', smtpError: smtpError || (!this.isConfigured ? 'SMTP credentials not configured in server/.env' : undefined), claimUrl };
  }

  /**
   * Notify the Lender that their friend marked the payment as settled
   */
  async sendLenderClaimNotification(opts: SendLenderNoticeOptions) {
    const { lenderEmail, lenderName, friendName, amount, description } = opts;
    const formattedAmount = `₹${Math.round(amount).toLocaleString('en-IN')}`;
    const subject = `${friendName} marked ${formattedAmount} as paid in Finatle`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .card { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 28px; }
    .logo { font-size: 18px; font-weight: 800; color: #059669; margin-bottom: 16px; }
    h2 { font-size: 18px; color: #0f172a; margin-top: 0; }
    p { font-size: 14px; line-height: 1.5; color: #475569; }
    .highlight { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px; font-weight: 600; color: #166534; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Finatle</div>
    <h2>Hi ${lenderName},</h2>
    <p><strong>${friendName}</strong> has indicated that they paid the pending amount of <strong>${formattedAmount}</strong> for <em>${description || 'Shared Expense'}</em>.</p>
    <div class="highlight">
      Please check your account. If received, you can confirm and settle it in your Finatle dashboard. If not received, you can re-activate reminders with one tap.
    </div>
  </div>
</body>
</html>
`;

    // 1. Attempt HTTPS API
    const httpsSent = await this.sendViaHttpsApi(lenderEmail, subject, htmlContent);
    if (httpsSent) return { success: true, mode: httpsSent };

    // 2. Attempt SMTP
    if (this.isConfigured && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"Finatle" <${process.env.SMTP_USER}>`,
          to: lenderEmail,
          subject,
          html: htmlContent,
        });
        return { success: true, mode: 'smtp' };
      } catch (err) {
        console.error(`[EmailService] Failed to notify lender ${lenderEmail}:`, err);
      }
    }

    console.log(`\n🔔 [LENDER NOTICE] ${friendName} claims to have paid ${formattedAmount} to ${lenderEmail}.\n`);
    return { success: true };
  }

  /**
   * Re-acknowledgement / Dispute notice sent to friend if lender marks as "Not Received"
   */
  async sendPaymentDisputeNotice(opts: SendDisputeNoticeOptions) {
    const { toEmail, friendName, lenderName, amount, description, claimToken } = opts;
    const appBaseUrl = this.getAppUrl(opts.appUrl);
    const claimUrl = `${appBaseUrl}/api/finance/public/claim-paid?token=${claimToken}`;
    const formattedAmount = `₹${Math.round(amount).toLocaleString('en-IN')}`;

    const subject = `Update from ${lenderName}: Payment verification for ${formattedAmount}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .card { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #fed7aa; padding: 28px; }
    .logo { font-size: 18px; font-weight: 800; color: #ea580c; margin-bottom: 16px; }
    h2 { font-size: 18px; color: #0f172a; margin-top: 0; }
    p { font-size: 14px; line-height: 1.5; color: #475569; }
    .box { background: #fff7ed; border: 1px solid #ffedd5; padding: 14px; border-radius: 10px; margin: 16px 0; color: #9a3412; }
    .btn { display: inline-block; background-color: #ea580c; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Finatle</div>
    <h2>Hi ${friendName || 'there'},</h2>
    <p><strong>${lenderName}</strong> noted that the payment of <strong>${formattedAmount}</strong> for <em>${description || 'Shared expense'}</em> has not yet been received.</p>
    <div class="box">
      Please double-check your bank or payment app transfer to ensure it was successfully processed.
    </div>
    <p>Once you complete the transfer, click below to re-confirm:</p>
    <div style="text-align: center; margin: 20px 0;">
      <a href="${claimUrl}" class="btn" target="_blank">✓ I Have Transferred the Amount</a>
    </div>
  </div>
</body>
</html>
`;

    // 1. Attempt HTTPS API
    const httpsSent = await this.sendViaHttpsApi(toEmail, subject, htmlContent);
    if (httpsSent) return { success: true, mode: httpsSent };

    // 2. Attempt SMTP
    if (this.isConfigured && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"Finatle Reminders" <${process.env.SMTP_USER}>`,
          to: toEmail,
          subject,
          html: htmlContent,
        });
        return { success: true, mode: 'smtp' };
      } catch (err) {
        console.error(`[EmailService] Failed to send dispute notice to ${toEmail}:`, err);
      }
    }

    console.log(`\n⚠️ [PAYMENT NOT RECEIVED NOTICE] Sent to ${toEmail} from ${lenderName} for ${formattedAmount}.\n👉 Claim URL: ${claimUrl}\n`);
    return { success: true };
  }
}

export const emailService = new EmailService();

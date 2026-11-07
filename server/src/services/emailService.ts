import nodemailer, { Transporter } from 'nodemailer';
import { ENV } from '../config/env';

export class EmailService {
  private static transporter: Transporter | null = null;

  private static getTransporter(): Transporter {
    if (!this.transporter) {
      const port = Number(ENV.SMTP_PORT) || 465;
      const isSecure = port === 465;

      this.transporter = nodemailer.createTransport({
        host: ENV.SMTP_HOST || 'smtp.gmail.com',
        port,
        secure: isSecure,
        auth: {
          user: ENV.SMTP_USER,
          pass: ENV.SMTP_PASS,
        },
        pool: true, // Keep socket pool warm for fast dispatches
        maxConnections: 3,
        maxMessages: 100,
        family: 4, // Force IPv4 to eliminate 20s-30s IPv6 timeout on Render containers
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
      } as any);
    }
    return this.transporter;
  }

  /**
   * Send a branded OTP verification email for Sign Up or Forgot Password
   */
  static async sendOtpEmail(toEmail: string, otp: string, purpose: 'SIGNUP' | 'FORGOT_PASSWORD'): Promise<boolean> {
    const isSignUp = purpose === 'SIGNUP';
    const subject = isSignUp
      ? `🔐 ${otp} is your Finatle email verification code`
      : `🔐 ${otp} is your Finatle password reset code`;

    const title = isSignUp ? 'Verify Your Email Address' : 'Reset Your Password';
    const description = isSignUp
      ? 'Thank you for choosing Finatle! To complete your registration and activate your personal wealth dashboard, please enter the 6-digit verification code below:'
      : 'We received a request to reset the password for your Finatle account. Enter the 6-digit verification code below to set a new password:';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px 24px; text-align: center; }
    .logo-text { font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; margin: 0; }
    .logo-sub { font-size: 13px; color: #d1fae5; margin-top: 4px; font-weight: 500; }
    .content { padding: 32px 28px; }
    .title { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
    .desc { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .otp-box { background: #f0fdf4; border: 2px dashed #10b981; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; color: #065f46; letter-spacing: 8px; margin: 0; }
    .otp-expiry { font-size: 12px; color: #047857; margin-top: 8px; font-weight: 600; }
    .security-notice { font-size: 12px; color: #64748b; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 20px; }
    .footer { background: #f8fafc; padding: 16px 28px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo-text">Finatle</h1>
      <div class="logo-sub">Smart Personal Finance & Wealth Tracker</div>
    </div>
    <div class="content">
      <h2 class="title">${title}</h2>
      <p class="desc">${description}</p>
      
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="otp-expiry">⏳ Code valid for 10 minutes</div>
      </div>

      <div class="security-notice">
        <strong>Security Notice:</strong> If you did not initiate this request on Finatle, please ignore this email. Never share this code with anyone. Finatle support will never ask for your code.
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Finatle. All rights reserved.
    </div>
  </div>
</body>
</html>
    `;

    // 1. Prioritize Brevo HTTPS REST API (Port 443)
    // Cloud hosting providers like Render Free Tier strictly block outbound SMTP ports (25, 465, 587).
    // HTTPS (Port 443) bypasses firewall blocking with instant ~200ms delivery.
    if (ENV.BREVO_API_KEY) {
      try {
        const fromMatch = ENV.SMTP_FROM.match(/^(.*?)\s*<(.+?)>$/);
        const senderName = fromMatch ? fromMatch[1].trim() : 'Finatle Security';
        const senderEmail = fromMatch ? fromMatch[2].trim() : (ENV.SMTP_FROM || 'notify.projects@gmail.com');

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': ENV.BREVO_API_KEY,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: senderName, email: senderEmail },
            to: [{ email: toEmail }],
            subject,
            htmlContent: html,
            textContent: `${title}\n\nYour 6-digit verification code is: ${otp}\nValid for 10 minutes.\n\nIf you did not request this code, please ignore this email.`,
          }),
        });

        if (response.ok) {
          console.log(`[EmailService] OTP email successfully delivered via Brevo HTTPS API to ${toEmail}`);
          return true;
        }

        const errorBody = await response.text();
        console.error(`[EmailService] Brevo HTTPS API responded with status ${response.status}:`, errorBody);
      } catch (apiErr: any) {
        console.error('[EmailService] Brevo HTTPS API request failed:', apiErr?.message || apiErr);
      }
    }

    // 2. Fallback to standard SMTP (Local development or servers with open outbound SMTP ports)
    try {
      if (!ENV.SMTP_USER || !ENV.SMTP_PASS || ENV.SMTP_USER.includes('your-email') || ENV.SMTP_PASS.includes('your-16-character')) {
        console.warn('[EmailService] SMTP credentials not fully configured in .env. Cannot dispatch verification email.');
        return false;
      }

      const transporter = this.getTransporter();
      await transporter.sendMail({
        from: ENV.SMTP_FROM,
        to: toEmail,
        subject,
        html,
        text: `${title}\n\nYour 6-digit verification code is: ${otp}\nValid for 10 minutes.\n\nIf you did not request this code, please ignore this email.`,
      });

      console.log(`[EmailService] OTP email successfully delivered to ${toEmail}`);
      return true;
    } catch (err: any) {
      console.error(`[EmailService] Failed to send email via SMTP to ${toEmail}:`, err?.message || err);
      return false;
    }
  }
}

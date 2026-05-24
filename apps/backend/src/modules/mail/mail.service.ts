import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private transporter: nodemailer.Transporter | null = null

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('MAIL_HOST')
    const user = this.config.get<string>('MAIL_USER')
    const pass = this.config.get<string>('MAIL_PASSWORD')

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.config.get('MAIL_PORT') || 587),
        secure: this.config.get('MAIL_SECURE') === 'true',
        auth: { user, pass },
      })
      this.logger.log('Mail transporter configured')
    } else {
      this.logger.warn('MAIL_HOST / MAIL_USER / MAIL_PASSWORD not set — emails will be logged to console only')
    }
  }

  async sendResetPassword(opts: {
    toName: string
    toEmail: string
    tempPassword: string
    appName?: string
  }) {
    const { toName, toEmail, tempPassword, appName = 'KLC Bimbel' } = opts

    const from = this.config.get<string>('MAIL_FROM') || `"${appName}" <noreply@klcbimbel.com>`
    const subject = `[${appName}] Reset Password Akun Anda`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
        <h2 style="color: #1e40af; margin-bottom: 4px;">${appName}</h2>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin-bottom: 20px;" />
        <p style="color: #374151;">Halo <strong>${toName}</strong>,</p>
        <p style="color: #374151;">Password akun Anda telah direset oleh administrator. Berikut adalah password sementara Anda:</p>
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 16px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; font-size: 13px; color: #6b7280;">Password Sementara</p>
          <p style="margin: 8px 0 0; font-size: 22px; font-weight: bold; letter-spacing: 3px; color: #1e40af; font-family: monospace;">${tempPassword}</p>
        </div>
        <p style="color: #374151;">Segera masuk dan ubah password Anda melalui menu <strong>Profil Saya → Ubah Password</strong>.</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
          Email ini dikirim otomatis oleh sistem ${appName}. Jangan balas email ini.
        </p>
      </div>
    `

    if (this.transporter) {
      await this.transporter.sendMail({ from, to: toEmail, subject, html })
      this.logger.log(`Reset password email sent to ${toEmail}`)
    } else {
      // Dev fallback — log to console so dev can still test
      this.logger.warn(
        `[DEV] Email NOT sent (SMTP not configured). Would have sent to: ${toEmail} | Temp password: ${tempPassword}`,
      )
    }
  }
}

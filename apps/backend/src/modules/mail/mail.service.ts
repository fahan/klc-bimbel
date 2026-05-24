import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MailtrapClient } from 'mailtrap'

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private client: MailtrapClient | null = null
  private fromEmail: string
  private fromName: string

  constructor(private config: ConfigService) {
    const token = this.config.get<string>('MAILTRAP_TOKEN')
    this.fromEmail = this.config.get<string>('MAIL_FROM_EMAIL') || 'noreply@klcbimbel.com'
    this.fromName = this.config.get<string>('MAIL_FROM_NAME') || 'KLC Bimbel'

    if (token) {
      this.client = new MailtrapClient({ token })
      this.logger.log(`Mailtrap client configured (from: ${this.fromEmail})`)
    } else {
      this.logger.warn('MAILTRAP_TOKEN not set — emails will be logged to console only')
    }
  }

  async sendResetPassword(opts: {
    toName: string
    toEmail: string
    tempPassword: string
  }) {
    const { toName, toEmail, tempPassword } = opts
    const appName = this.fromName

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

    if (this.client) {
      await this.client.send({
        from: { name: this.fromName, email: this.fromEmail },
        to: [{ email: toEmail, name: toName }],
        subject: `[${appName}] Reset Password Akun Anda`,
        html,
      })
      this.logger.log(`Reset password email sent to ${toEmail}`)
    } else {
      this.logger.warn(
        `[DEV] Email NOT sent (MAILTRAP_TOKEN not set). Would have sent to: ${toEmail} | Temp password: ${tempPassword}`,
      )
    }
  }
}

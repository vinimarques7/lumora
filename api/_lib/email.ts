import { Resend } from 'resend'

const FROM_EMAIL = process.env.EMAIL_FROM ?? 'Lumora <onboarding@resend.dev>'

let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY)
  return resendClient
}

/**
 * Sends an email via Resend. If RESEND_API_KEY is not configured (e.g. local dev
 * without a key), logs the content to the console instead of throwing — this lets
 * developers test the full verify/reset flow without needing a real Resend account.
 */
async function sendEmail(to: string, subject: string, html: string) {
  const client = getResendClient()

  if (!client) {
    console.warn(
      `[email] RESEND_API_KEY não configurada — e-mail não enviado.\n` +
        `  Para: ${to}\n  Assunto: ${subject}\n  Conteúdo:\n${html}`,
    )
    return
  }

  const { error } = await client.emails.send({ from: FROM_EMAIL, to, subject, html })
  if (error) {
    console.error('[email] Falha ao enviar via Resend:', error)
    throw new Error('Falha ao enviar e-mail.')
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await sendEmail(
    to,
    'Redefinir senha — Lumora',
    `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Redefinir senha</h2>
      <p>Clique no link abaixo para escolher uma nova senha. Este link expira em 1 hora.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;">Redefinir senha</a></p>
      <p>Ou copie e cole este link no navegador:<br>${resetUrl}</p>
      <p style="color:#888;font-size:12px;">Se você não pediu essa redefinição, ignore este e-mail — sua senha continua a mesma.</p>
    </div>`,
  )
}

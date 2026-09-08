import { resolveMx } from 'node:dns/promises'

const THROWAWAY_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'yopmail.com',
  'trashmail.com',
  'sharklasers.com',
  'dispostable.com',
  'getnada.com',
  'maildrop.cc',
  'tmpmail.org',
  'mailnesia.com',
  'fakeinbox.com',
  'tmailinator.com',
  'mintemail.com',
])

/**
 * Checks whether the email's domain has valid MX records (i.e. it's configured
 * to receive mail). This is a free, local fallback used when ABSTRACT_API_KEY
 * is not configured. It catches typos and made-up domains, but does NOT confirm
 * the specific mailbox exists.
 */
async function domainHasMxRecord(email: string): Promise<boolean> {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false

  if (THROWAWAY_DOMAINS.has(domain)) return false

  try {
    const records = await resolveMx(domain)
    return records.length > 0
  } catch {
    return false
  }
}

interface AbstractApiResponse {
  deliverability?: 'DELIVERABLE' | 'UNDELIVERABLE' | 'RISKY' | 'UNKNOWN'
  is_valid_format?: { value: boolean }
  is_mx_found?: { value: boolean }
}

/**
 * Verifies whether an email address is likely to exist and receive mail.
 *
 * If ABSTRACT_API_KEY is configured, uses AbstractAPI's email validation service
 * (real-time SMTP-level deliverability check, no email sent, free tier ~100/mo).
 * Only rejects on a confirmed "UNDELIVERABLE" verdict or missing MX/format — RISKY
 * and UNKNOWN are accepted to avoid false positives blocking real users (e.g.
 * catch-all domains).
 *
 * Falls back to a plain MX record lookup when no API key is configured (e.g. local
 * dev), which only confirms the domain can receive mail, not the specific mailbox.
 */
export async function isEmailDeliverable(email: string): Promise<boolean> {
  const normalized = email.toLowerCase()
  const domain = normalized.split('@')[1]
  if (!domain) return false

  if (THROWAWAY_DOMAINS.has(domain)) return false

  const apiKey = process.env.ABSTRACT_API_KEY
  if (!apiKey) {
    console.warn('[email-verify] ABSTRACT_API_KEY não configurada — usando checagem de MX apenas.')
    return domainHasMxRecord(normalized)
  }

  try {
    const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${encodeURIComponent(normalized)}`
    const res = await fetch(url)
    if (!res.ok) {
      console.error('[email-verify] AbstractAPI respondeu com erro, caindo para checagem de MX.', res.status)
      return domainHasMxRecord(normalized)
    }

    const data = (await res.json()) as AbstractApiResponse

    if (data.is_valid_format?.value === false) return false
    if (data.is_mx_found?.value === false) return false
    if (data.deliverability === 'UNDELIVERABLE') return false

    return true
  } catch (e) {
    console.error('[email-verify] Falha ao consultar AbstractAPI, caindo para checagem de MX.', e)
    return domainHasMxRecord(normalized)
  }
}

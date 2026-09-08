import { hexToHslString } from './utils'
import type { SiteSettings } from './api'

const PROFILE_DESIGN_KEY = 'sc_profile_design'
export const BRAND_NAME = 'Lumora'
const LEGACY_BRAND_NAME = 'Study Center'
const DEFAULT_PRIMARY_HEX = '#6366f1'

export interface ProfileDesignPrefs {
  mode: 'default' | 'image'
  imageUrl: string
  overlay: string
}

const DEFAULT_PRIMARY = '239 84% 67%' // indigo-500 in HSL
const LIGHT = {
  foreground: '222.2 84% 4.9%',
  card: '0 0% 100%',
  cardForeground: '222.2 84% 4.9%',
  popover: '0 0% 100%',
  popoverForeground: '222.2 84% 4.9%',
  secondary: '210 40% 96.1%',
  secondaryForeground: '222.2 47.4% 11.2%',
  muted: '210 40% 96.1%',
  mutedForeground: '215.4 16.3% 46.9%',
  accent: '210 40% 96.1%',
  accentForeground: '222.2 47.4% 11.2%',
  border: '214.3 31.8% 91.4%',
  input: '214.3 31.8% 91.4%',
  primaryForeground: '210 40% 98%',
}

const DARK = {
  foreground: '210 40% 98%',
  card: '222.2 84% 7%',
  cardForeground: '210 40% 98%',
  popover: '222.2 84% 7%',
  popoverForeground: '210 40% 98%',
  secondary: '217.2 32.6% 17.5%',
  secondaryForeground: '210 40% 98%',
  muted: '217.2 32.6% 17.5%',
  mutedForeground: '215 20.2% 75%',
  accent: '217.2 32.6% 17.5%',
  accentForeground: '210 40% 98%',
  border: '217.2 32.6% 22%',
  input: '217.2 32.6% 22%',
  primaryForeground: '222.2 47.4% 11.2%',
}

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const srgb = [r, g, b].map((v) => v / 255)
  const [rl, gl, bl] = srgb.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
}

function setThemeTokens(tokens: typeof LIGHT) {
  const root = document.documentElement.style
  root.setProperty('--foreground', tokens.foreground)
  root.setProperty('--card', tokens.card)
  root.setProperty('--card-foreground', tokens.cardForeground)
  root.setProperty('--popover', tokens.popover)
  root.setProperty('--popover-foreground', tokens.popoverForeground)
  root.setProperty('--secondary', tokens.secondary)
  root.setProperty('--secondary-foreground', tokens.secondaryForeground)
  root.setProperty('--muted', tokens.muted)
  root.setProperty('--muted-foreground', tokens.mutedForeground)
  root.setProperty('--accent', tokens.accent)
  root.setProperty('--accent-foreground', tokens.accentForeground)
  root.setProperty('--border', tokens.border)
  root.setProperty('--input', tokens.input)
  root.setProperty('--primary-foreground', tokens.primaryForeground)
}

function setBackgroundImageMode(enabled: boolean, imageUrl?: string, overlay = '0.45') {
  const root = document.documentElement.style
  if (enabled && imageUrl && /^https?:\/\//i.test(imageUrl)) {
    root.setProperty('--site-bg-image', `url("${imageUrl}")`)
    root.setProperty('--site-bg-overlay-opacity', overlay)
    document.body.classList.add('has-bg-image')
  } else {
    root.removeProperty('--site-bg-image')
    root.removeProperty('--site-bg-overlay-opacity')
    document.body.classList.remove('has-bg-image')
  }
}

function buildBrandFavicon(hex: string) {
  const safeColor = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : DEFAULT_PRIMARY_HEX
  return encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="18" fill="${safeColor}"/><path d="M32 45V28" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path d="M32 28C32 20.5 38.2 14 46 14C46 21.8 39.8 28 32 28Z" fill="#ffffff" fill-opacity="0.96"/><path d="M32 28C32 20.5 25.8 14 18 14C18 21.8 24.2 28 32 28Z" fill="#ffffff" fill-opacity="0.72"/><path d="M19 43.5C22.3 38.6 26.9 36 32 36C37.1 36 41.7 38.6 45 43.5" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" opacity="0.92"/><path d="M23.5 48H40.5" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" opacity="0.62"/></svg>`,
  )
}

export function resolveBrandName(title?: string) {
  const normalized = title?.trim()
  if (!normalized || normalized === LEGACY_BRAND_NAME) return BRAND_NAME
  return normalized
}

export function syncBrandMetadata(title?: string) {
  document.title = resolveBrandName(title)
}

export function syncBrandFavicon(hex: string) {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) return
  link.href = `data:image/svg+xml,${buildBrandFavicon(hex)}`
}

/** Prefs are namespaced per user id so they don't leak between accounts sharing a device. */
function profileDesignKey(userId: string) {
  return `${PROFILE_DESIGN_KEY}_${userId}`
}

export function getProfileDesignPrefs(userId: string): ProfileDesignPrefs {
  const fallback: ProfileDesignPrefs = {
    mode: 'default',
    imageUrl: '',
    overlay: '0.45',
  }

  try {
    const raw = localStorage.getItem(profileDesignKey(userId))
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<ProfileDesignPrefs>

    const mode = parsed.mode === 'image' ? 'image' : 'default'
    const imageUrl = typeof parsed.imageUrl === 'string' ? parsed.imageUrl : ''
    const overlay = typeof parsed.overlay === 'string' ? parsed.overlay : '0.45'
    return { mode, imageUrl, overlay }
  } catch {
    return fallback
  }
}

export function saveProfileDesignPrefs(userId: string, prefs: ProfileDesignPrefs) {
  localStorage.setItem(profileDesignKey(userId), JSON.stringify(prefs))
}

/** Apply optional per-user visual override from Profile page. No-op when logged out. */
export function applyProfileDesignOverride(userId?: string | null) {
  if (!userId) return

  const prefs = getProfileDesignPrefs(userId)
  if (prefs.mode !== 'image' || !/^https?:\/\//i.test(prefs.imageUrl)) {
    return
  }

  setBackgroundImageMode(true, prefs.imageUrl, prefs.overlay)
  setThemeTokens(DARK)
}

/** Apply a user's hex theme color as --primary CSS variable. */
export function applyUserTheme(hex: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return
  const hsl = hexToHslString(hex)
  document.documentElement.style.setProperty('--primary', hsl)
  document.documentElement.style.setProperty('--ring', hsl)
  syncBrandFavicon(hex)
}

/** Apply admin's site background color as --background CSS variable. */
export function applySiteBgColor(hex: string) {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return
  const hsl = hexToHslString(hex)
  document.documentElement.style.setProperty('--background', hsl)

  // Keep legibility when admin selects a dark global background.
  const isDarkBg = relativeLuminance(hex) < 0.42
  setThemeTokens(isDarkBg ? DARK : LIGHT)
}

/** Apply full site appearance from admin settings (color is default; image optional). */
export function applySiteAppearance(settings: SiteSettings) {
  const bgColor = settings.bg_color && /^#[0-9a-fA-F]{6}$/.test(settings.bg_color)
    ? settings.bg_color
    : '#ffffff'

  applySiteBgColor(bgColor)

  const imageEnabled = settings.bg_image_enabled === 'true'
  const imageUrl = settings.bg_image_url?.trim() ?? ''
  const overlay = settings.bg_image_overlay?.trim() || '0.45'
  setBackgroundImageMode(imageEnabled, imageUrl, overlay)

  // Image backgrounds almost always need dark-on-light overlays + glass cards.
  if (imageEnabled && imageUrl) {
    setThemeTokens(DARK)
  }
}

export function resetTheme() {
  document.documentElement.style.setProperty('--primary', DEFAULT_PRIMARY)
  document.documentElement.style.setProperty('--ring', DEFAULT_PRIMARY)
  document.documentElement.style.removeProperty('--background')
  document.documentElement.style.removeProperty('--foreground')
  document.documentElement.style.removeProperty('--card')
  document.documentElement.style.removeProperty('--card-foreground')
  document.documentElement.style.removeProperty('--popover')
  document.documentElement.style.removeProperty('--popover-foreground')
  document.documentElement.style.removeProperty('--secondary')
  document.documentElement.style.removeProperty('--secondary-foreground')
  document.documentElement.style.removeProperty('--muted')
  document.documentElement.style.removeProperty('--muted-foreground')
  document.documentElement.style.removeProperty('--accent')
  document.documentElement.style.removeProperty('--accent-foreground')
  document.documentElement.style.removeProperty('--border')
  document.documentElement.style.removeProperty('--input')
  document.documentElement.style.removeProperty('--primary-foreground')
  document.documentElement.style.removeProperty('--site-bg-image')
  document.documentElement.style.removeProperty('--site-bg-overlay-opacity')
  document.body.classList.remove('has-bg-image')
  syncBrandMetadata(BRAND_NAME)
  syncBrandFavicon(DEFAULT_PRIMARY_HEX)
}

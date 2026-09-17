import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Convert #rrggbb hex to "H S% L%" string for CSS custom properties. */
export function hexToHslString(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural}`
}

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]] as [T, T]
  }
  return arr
}

/** Calculate quiz points based on time remaining (0-30s). */
export function calcQuizPoints(timeLeftMs: number, totalTimeMs: number): number {
  const ratio = Math.max(0, timeLeftMs / totalTimeMs)
  return Math.floor(900 * ratio + 100) // 100–1000 points
}

export function shouldPromptBeforeDiscard<T extends Record<string, unknown>>(
  current: T,
  initial: T,
): boolean {
  return Object.keys(current).some((key) => {
    const currentValue = current[key]
    const initialValue = initial[key]

    if (typeof currentValue === 'string' && typeof initialValue === 'string') {
      return currentValue.trim() !== initialValue.trim()
    }

    if (Array.isArray(currentValue) && Array.isArray(initialValue)) {
      return JSON.stringify(currentValue) !== JSON.stringify(initialValue)
    }

    return currentValue !== initialValue
  })
}

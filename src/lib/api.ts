const BASE = '/api'
const TOKEN_KEY = 'sc_access_token'

function getStoredToken(): string | null {
  if (typeof globalThis === 'undefined' || !('sessionStorage' in globalThis)) return null
  return globalThis.sessionStorage.getItem(TOKEN_KEY)
}

function setStoredToken(token: string): void {
  if (typeof globalThis === 'undefined' || !('sessionStorage' in globalThis)) return
  globalThis.sessionStorage.setItem(TOKEN_KEY, token)
}

function clearStoredToken(): void {
  if (typeof globalThis === 'undefined' || !('sessionStorage' in globalThis)) return
  globalThis.sessionStorage.removeItem(TOKEN_KEY)
}

async function refreshAccessToken(): Promise<string> {
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string }
    throw new ApiError(res.status, body.error ?? 'Sessão expirada')
  }

  const data = (await res.json()) as { accessToken: string }
  setStoredToken(data.accessToken)
  return data.accessToken
}

async function request<T>(
  path: string,
  init?: RequestInit & { token?: string },
): Promise<T> {
  const { token, ...rest } = init ?? {}
  const authToken = token ? getStoredToken() ?? token : undefined

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(rest.headers as Record<string, string> | undefined),
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  let res = await fetch(`${BASE}${path}`, { ...rest, headers })

  // If access token expired, refresh once and retry authenticated requests.
  if (res.status === 401 && authToken && path !== '/auth/refresh') {
    try {
      const freshToken = await refreshAccessToken()
      const retryHeaders: Record<string, string> = {
        ...headers,
        Authorization: `Bearer ${freshToken}`,
      }
      res = await fetch(`${BASE}${path}`, { ...rest, headers: retryHeaders })
    } catch {
      clearStoredToken()
    }
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string }
    throw new ApiError(res.status, body.error ?? 'Erro desconhecido')
  }

  return res.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (email: string, password: string, displayName: string, occupation?: string) =>
    request<{ accessToken: string; user: AppUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName, occupation }),
    }),

  login: (email: string, password: string) =>
    request<{ accessToken: string; user: AppUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    }),

  refresh: () =>
    request<{ accessToken: string; user: AppUser }>('/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    }),

  logout: (token: string) =>
    request('/auth/logout', { method: 'POST', token, credentials: 'include' }),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
}

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  me: (token: string) => request<{ user: AppUser }>('/users/me', { token }),

  updateMe: (token: string, body: { themeColor?: string; displayName?: string; occupation?: string; currentPassword?: string; newPassword?: string }) =>
    request<{ user: AppUser }>('/users/me', { method: 'PATCH', body: JSON.stringify(body), token }),

  list: (token: string) => request<{ users: AppUser[] }>('/users', { token }),

  setRole: (token: string, id: string, role: 'user' | 'admin') =>
    request<{ user: AppUser }>(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
      token,
    }),

  deleteMe: (token: string, username: string, password: string) =>
    request<{ message: string }>('/users/me', {
      method: 'DELETE',
      body: JSON.stringify({ username, password }),
      token,
      credentials: 'include',
    }),
}

// ─── Decks ────────────────────────────────────────────────────────────────────

export const decksApi = {
  list: (token: string) => request<{ decks: DeckWithCount[] }>('/decks', { token }),

  listPublic: () => request<{ decks: DeckWithCount[] }>('/decks/public'),

  get: (token: string, id: string) =>
    request<{ deck: Deck; cards: Card[] }>(`/decks/${id}`, { token }),

  getMulti: (token: string, ids: string[]) =>
    Promise.all(ids.map((id) => request<{ deck: Deck; cards: Card[] }>(`/decks/${id}`, { token }))),
  create: (token: string, body: { name: string; description?: string; isPublic?: boolean; category?: string | null; extraCategories?: string[]; deckDifficulty?: string }) =>
    request<{ deck: Deck }>('/decks', { method: 'POST', body: JSON.stringify(body), token }),

  update: (token: string, id: string, body: { name?: string; description?: string; isPublic?: boolean; pinEmoji?: string | null; pinLabel?: string | null; category?: string | null; extraCategories?: string[] | null; deckDifficulty?: string }) =>
    request<{ deck: Deck }>(`/decks/${id}`, { method: 'PATCH', body: JSON.stringify(body), token }),

  delete: (token: string, id: string) =>
    request(`/decks/${id}`, { method: 'DELETE', token }),

  getQuiz: (token: string, id: string, count = 10) =>
    request<{ questions: QuizQuestion[]; deckName: string }>(`/decks/${id}/quiz?count=${count}`, { token }),

  saveSession: (token: string, deckId: string, body: GameSessionPayload) =>
    request(`/decks/${deckId}/sessions`, { method: 'POST', body: JSON.stringify(body), token }),
}

// ─── Cards ────────────────────────────────────────────────────────────────────

export const cardsApi = {
  create: (token: string, body: NewCard) =>
    request<{ card: Card }>('/cards', { method: 'POST', body: JSON.stringify(body), token }),

  update: (token: string, id: string, body: Partial<NewCard>) =>
    request<{ card: Card }>(`/cards/${id}`, { method: 'PATCH', body: JSON.stringify(body), token }),

  delete: (token: string, id: string) =>
    request(`/cards/${id}`, { method: 'DELETE', token }),
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminApi = {
  getSettings: () => request<{ settings: SiteSettings }>('/admin/settings'),

  updateSettings: (token: string, settings: Partial<SiteSettings>) =>
    request('/admin/settings', { method: 'PUT', body: JSON.stringify(settings), token }),
}

// ─── Shared types (mirror of DB types) ───────────────────────────────────────

export interface AppUser {
  id: string
  email: string
  role: 'user' | 'admin'
  themeColor: string
  displayName: string | null
  occupation: string | null
  createdAt?: string
}

export interface Deck {
  id: string
  name: string
  description: string | null
  ownerId: string
  isPublic: boolean
  pinEmoji: string | null
  pinLabel: string | null
  category: string | null
  extraCategories: string[] | null
  deckDifficulty: 'easy' | 'medium' | 'hard'
  creatorName?: string | null
  creatorEmail?: string | null
  savedAt?: string
  createdAt: string
  updatedAt: string
}

export interface DeckWithCount extends Deck {
  cardCount: number
}

export interface Card {
  id: string
  deckId: string
  authorId: string
  question: string
  answer: string
  explanation: string | null
  analogy: string | null
  imageUrl: string | null
  difficulty: 'easy' | 'medium' | 'hard'
  position: number
  createdAt: string
  updatedAt: string
}

export type NewCard = {
  deckId: string
  question: string
  answer: string
  explanation?: string
  analogy?: string
  imageUrl?: string | null
  difficulty?: 'easy' | 'medium' | 'hard'
}

export interface SiteSettings {
  site_title?: string
  site_subtitle?: string
  bg_color?: string
  hero_text?: string
  bg_image_enabled?: string
  bg_image_url?: string
  bg_image_overlay?: string
}

export interface QuizQuestion {
  id: string
  question: string
  explanation: string | null
  analogy: string | null
  correctAnswer: string
  options: string[]
}

export interface GameSessionPayload {
  gameType: 'hold_and_answer' | 'quiz'
  score: number
  totalCards: number
  correctCards: number
}

// ─── Saved Decks ──────────────────────────────────────────────────────────────

export const savedDecksApi = {
  list: (token: string) =>
    request<{ decks: DeckWithCount[] }>('/decks/saved', { token }),

  save: (token: string, deckId: string) =>
    request<{ saved: boolean }>(`/decks/${deckId}/save`, { method: 'POST', token }),

  unsave: (token: string, deckId: string) =>
    request<{ saved: boolean }>(`/decks/${deckId}/save`, { method: 'DELETE', token }),
}

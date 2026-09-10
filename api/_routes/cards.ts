import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { put } from '@vercel/blob'
import { db } from '../_db/index.js'
import { cards, decks } from '../_db/schema.js'
import { requireAuth } from '../_middleware/auth.js'

export const cardsRouter = new Hono()

// ─── POST /api/cards ───────────────────────────────────────────────────────────

cardsRouter.post(
  '/',
  requireAuth,
  zValidator(
    'json',
    z.object({
      deckId: z.string().uuid(),
      question: z.string().min(1).max(2000),
      answer: z.string().min(1).max(2000),
      explanation: z.string().max(5000).optional(),
      analogy: z.string().max(2000).optional(),
      imageUrl: z.string().url().nullable().optional(),
      difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
      cardType: z.enum(['standard', 'true_false']).optional().default('standard'),
    }),
  ),
  async (c) => {
    const { sub, role } = c.get('user')
    const body = c.req.valid('json')

    const [deck] = await db.select().from(decks).where(eq(decks.id, body.deckId)).limit(1)
    if (!deck) return c.json({ error: 'Deck não encontrado.' }, 404)

    if (deck.ownerId !== sub && role !== 'admin') {
      return c.json({ error: 'Acesso não autorizado.' }, 403)
    }

    // Auto-assign position
    const existingCards = await db.select({ position: cards.position }).from(cards).where(eq(cards.deckId, body.deckId))
    const nextPosition = existingCards.length

    const [card] = await db
      .insert(cards)
      .values({ ...body, authorId: sub!, position: nextPosition })
      .returning()

    return c.json({ card }, 201)
  },
)

// ─── PATCH /api/cards/:id ─────────────────────────────────────────────────────

cardsRouter.patch(
  '/:id',
  requireAuth,
  zValidator(
    'json',
    z.object({
      question: z.string().min(1).max(2000).optional(),
      answer: z.string().min(1).max(2000).optional(),
      explanation: z.string().max(5000).optional(),
      analogy: z.string().max(2000).optional(),
      imageUrl: z.string().url().nullable().optional(),
      difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
      cardType: z.enum(['standard', 'true_false']).optional(),
    }),
  ),
  async (c) => {
    const { id } = c.req.param()
    const { sub, role } = c.get('user')
    const body = c.req.valid('json')

    const [card] = await db.select().from(cards).where(eq(cards.id, id)).limit(1)
    if (!card) return c.json({ error: 'Card não encontrado.' }, 404)

    const [deck] = await db.select().from(decks).where(eq(decks.id, card.deckId)).limit(1)
    const canEdit = deck?.ownerId === sub || card.authorId === sub || role === 'admin'
    if (!canEdit) return c.json({ error: 'Acesso não autorizado.' }, 403)

    const [updated] = await db
      .update(cards)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(cards.id, id))
      .returning()

    return c.json({ card: updated })
  },
)

// ─── DELETE /api/cards/:id ────────────────────────────────────────────────────

cardsRouter.delete('/:id', requireAuth, async (c) => {
  const { id } = c.req.param()
  const { sub, role } = c.get('user')

  const [card] = await db.select().from(cards).where(eq(cards.id, id)).limit(1)
  if (!card) return c.json({ error: 'Card não encontrado.' }, 404)

  const [deck] = await db.select().from(decks).where(eq(decks.id, card.deckId)).limit(1)
  const canDelete = deck?.ownerId === sub || card.authorId === sub || role === 'admin'
  if (!canDelete) return c.json({ error: 'Acesso não autorizado.' }, 403)

  await db.delete(cards).where(eq(cards.id, id))

  return c.json({ message: 'Card excluído com sucesso.' })
})

// ─── POST /api/cards/:id/image — upload de imagem ────────────────────────────

cardsRouter.post('/:id/image', requireAuth, async (c) => {
  const { id } = c.req.param()
  const { sub, role } = c.get('user')

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return c.json({ error: 'Upload de imagens não configurado.' }, 503)
  }

  const [card] = await db.select().from(cards).where(eq(cards.id, id)).limit(1)
  if (!card) return c.json({ error: 'Card não encontrado.' }, 404)

  const [deck] = await db.select().from(decks).where(eq(decks.id, card.deckId)).limit(1)
  const canEdit = deck?.ownerId === sub || card.authorId === sub || role === 'admin'
  if (!canEdit) return c.json({ error: 'Acesso não autorizado.' }, 403)

  const formData = await c.req.formData()
  const file = formData.get('image') as File | null

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'Arquivo de imagem ausente.' }, 400)
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Tipo de arquivo não permitido. Use JPEG, PNG, WEBP ou GIF.' }, 400)
  }

  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return c.json({ error: 'Arquivo muito grande. Máximo 5MB.' }, 400)
  }

  const blob = await put(`cards/${id}/${file.name}`, file, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })

  const [updated] = await db
    .update(cards)
    .set({ imageUrl: blob.url, updatedAt: new Date() })
    .where(eq(cards.id, id))
    .returning()

  return c.json({ card: updated, url: blob.url })
})

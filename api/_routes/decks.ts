import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '../_db/index.js'
import { decks, cards, savedDecks, users } from '../_db/schema.js'
import { requireAuth } from '../_middleware/auth.js'

export const decksRouter = new Hono()

// ─── GET /api/decks — list user decks + public decks ─────────────────────────

decksRouter.get('/', requireAuth, async (c) => {
  const { sub } = c.get('user')

  const rows = await db
    .select({
      id: decks.id,
      name: decks.name,
      description: decks.description,
      ownerId: decks.ownerId,
      isPublic: decks.isPublic,
      pinEmoji: decks.pinEmoji,
      pinLabel: decks.pinLabel,
      category: decks.category,
      extraCategories: decks.extraCategories,
      deckDifficulty: decks.deckDifficulty,
      deckType: decks.deckType,
      createdAt: decks.createdAt,
      cardCount: sql<number>`count(${cards.id})::int`,
    })
    .from(decks)
    .leftJoin(cards, eq(cards.deckId, decks.id))
    .where(eq(decks.ownerId, sub!))
    .groupBy(decks.id)
    .orderBy(decks.createdAt)

  return c.json({ decks: rows })
})

// ─── GET /api/decks/saved ───────────────────────────────────────────────────────

decksRouter.get('/saved', requireAuth, async (c) => {
  const { sub } = c.get('user')

  const rows = await db
    .select({
      id: decks.id,
      name: decks.name,
      description: decks.description,
      ownerId: decks.ownerId,
      isPublic: decks.isPublic,
      pinEmoji: decks.pinEmoji,
      pinLabel: decks.pinLabel,
      category: decks.category,
      extraCategories: decks.extraCategories,
      deckDifficulty: decks.deckDifficulty,
      deckType: decks.deckType,
      createdAt: decks.createdAt,
      cardCount: sql<number>`count(distinct ${cards.id})::int`,
      creatorName: users.displayName,
      creatorEmail: users.email,
      savedAt: savedDecks.savedAt,
    })
    .from(savedDecks)
    .innerJoin(decks, eq(savedDecks.deckId, decks.id))
    .innerJoin(users, eq(decks.ownerId, users.id))
    .leftJoin(cards, eq(cards.deckId, decks.id))
    .where(eq(savedDecks.userId, sub!))
    .groupBy(decks.id, users.displayName, users.email, savedDecks.savedAt)

  return c.json({ decks: rows })
})

// ─── GET /api/decks/public ────────────────────────────────────────────────────

decksRouter.get('/public', async (c) => {
  const rows = await db
    .select({
      id: decks.id,
      name: decks.name,
      description: decks.description,
      ownerId: decks.ownerId,
      isPublic: decks.isPublic,
      pinEmoji: decks.pinEmoji,
      pinLabel: decks.pinLabel,
      category: decks.category,
      extraCategories: decks.extraCategories,
      deckDifficulty: decks.deckDifficulty,
      deckType: decks.deckType,
      createdAt: decks.createdAt,
      cardCount: sql<number>`count(distinct ${cards.id})::int`,
      creatorName: users.displayName,
      creatorEmail: users.email,
    })
    .from(decks)
    .innerJoin(users, eq(decks.ownerId, users.id))
    .leftJoin(cards, eq(cards.deckId, decks.id))
    .where(eq(decks.isPublic, true))
    .groupBy(decks.id, users.displayName, users.email)
    .orderBy(decks.createdAt)

  return c.json({ decks: rows })
})

// ─── GET /api/decks/:id ───────────────────────────────────────────────────────

decksRouter.get('/:id', requireAuth, async (c) => {
  const { id } = c.req.param()
  const { sub, role } = c.get('user')

  const [deck] = await db.select().from(decks).where(eq(decks.id, id)).limit(1)
  if (!deck) return c.json({ error: 'Deck não encontrado.' }, 404)

  const canAccess = deck.ownerId === sub || deck.isPublic || role === 'admin'
  if (!canAccess) return c.json({ error: 'Acesso não autorizado.' }, 403)

  const deckCards = await db
    .select()
    .from(cards)
    .where(eq(cards.deckId, id))
    .orderBy(cards.position)

  return c.json({ deck, cards: deckCards })
})

// ─── POST /api/decks ──────────────────────────────────────────────────────────

decksRouter.post(
  '/',
  requireAuth,
  zValidator(
    'json',
    z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      isPublic: z.boolean().optional().default(false),
      category: z.string().max(60).nullable().optional(),
      extraCategories: z.array(z.string().max(60)).optional(),
      deckDifficulty: z.enum(['easy', 'medium', 'hard']).optional(),
      deckType: z.enum(['standard', 'true_false']).optional().default('standard'),
    }),
  ),
  async (c) => {
    const { sub } = c.get('user')
    const { name, description, isPublic, category, extraCategories, deckDifficulty, deckType } = c.req.valid('json')

    const [deck] = await db
      .insert(decks)
      .values({ name, description, ownerId: sub!, isPublic, category, extraCategories, deckDifficulty, deckType })
      .returning()

    return c.json({ deck }, 201)
  },
)

// ─── PATCH /api/decks/:id ─────────────────────────────────────────────────────

decksRouter.patch(
  '/:id',
  requireAuth,
  zValidator(
    'json',
    z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      isPublic: z.boolean().optional(),
      pinEmoji: z.string().max(10).nullable().optional(),
      pinLabel: z.string().max(60).nullable().optional(),
      category: z.string().max(60).nullable().optional(),
      extraCategories: z.array(z.string().max(60)).nullable().optional(),
      deckDifficulty: z.enum(['easy', 'medium', 'hard']).optional(),
      deckType: z.enum(['standard', 'true_false']).optional(),
    }),
  ),
  async (c) => {
    const { id } = c.req.param()
    const { sub, role } = c.get('user')
    const body = c.req.valid('json')

    const [deck] = await db.select().from(decks).where(eq(decks.id, id)).limit(1)
    if (!deck) return c.json({ error: 'Deck não encontrado.' }, 404)

    if (deck.ownerId !== sub && role !== 'admin') {
      return c.json({ error: 'Acesso não autorizado.' }, 403)
    }

    const [updated] = await db
      .update(decks)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(decks.id, id))
      .returning()

    return c.json({ deck: updated })
  },
)

// ─── DELETE /api/decks/:id ────────────────────────────────────────────────────

decksRouter.delete('/:id', requireAuth, async (c) => {
  const { id } = c.req.param()
  const { sub, role } = c.get('user')

  const [deck] = await db.select().from(decks).where(eq(decks.id, id)).limit(1)
  if (!deck) return c.json({ error: 'Deck não encontrado.' }, 404)

  if (deck.ownerId !== sub && role !== 'admin') {
    return c.json({ error: 'Acesso não autorizado.' }, 403)
  }

  await db.delete(decks).where(eq(decks.id, id))

  return c.json({ message: 'Deck excluído com sucesso.' })
})

// ─── POST /api/decks/:id/save ─────────────────────────────────────────────────

decksRouter.post('/:id/save', requireAuth, async (c) => {
  const { id } = c.req.param()
  const { sub } = c.get('user')

  const [deck] = await db.select().from(decks).where(eq(decks.id, id)).limit(1)
  if (!deck) return c.json({ error: 'Deck não encontrado.' }, 404)
  if (!deck.isPublic && deck.ownerId !== sub) {
    return c.json({ error: 'Deck não é público.' }, 403)
  }
  if (deck.ownerId === sub) {
    return c.json({ error: 'Não é possível salvar seu próprio deck.' }, 400)
  }

  await db
    .insert(savedDecks)
    .values({ userId: sub!, deckId: id })
    .onConflictDoNothing()

  return c.json({ saved: true })
})

// ─── DELETE /api/decks/:id/save ───────────────────────────────────────────────

decksRouter.delete('/:id/save', requireAuth, async (c) => {
  const { id } = c.req.param()
  const { sub } = c.get('user')

  await db
    .delete(savedDecks)
    .where(and(eq(savedDecks.userId, sub!), eq(savedDecks.deckId, id)))

  return c.json({ saved: false })
})

// ─── GET /api/decks/:id/quiz — generate quiz questions ───────────────────────

decksRouter.get('/:id/quiz', requireAuth, async (c) => {
  const { id } = c.req.param()
  const { sub, role } = c.get('user')
  const count = Math.min(parseInt(c.req.query('count') ?? '10', 10), 50)

  const [deck] = await db.select().from(decks).where(eq(decks.id, id)).limit(1)
  if (!deck) return c.json({ error: 'Deck não encontrado.' }, 404)

  const canAccess = deck.ownerId === sub || deck.isPublic || role === 'admin'
  if (!canAccess) return c.json({ error: 'Acesso não autorizado.' }, 403)

  const allCards = await db.select().from(cards).where(eq(cards.deckId, id))

  if (allCards.length < 2) {
    return c.json({ error: 'O deck precisa ter pelo menos 2 cards para jogar.' }, 422)
  }

  const selectedIds = c.req.query('selected')?.split(',').filter(Boolean) ?? []
  const pool = selectedIds.length ? allCards.filter((card) => selectedIds.includes(card.id)) : allCards

  if (pool.length < 2) {
    return c.json({ error: 'Seleção de cards insuficiente para jogar.' }, 422)
  }

  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length))

  const questions = shuffled.map((card) => {
    const normalizedAnswer = card.cardType === 'true_false' ? (card.answer.toLowerCase() === 'false' || card.answer.toLowerCase() === 'falso' || card.answer.toLowerCase() === 'f' ? 'Falso' : 'Verdadeiro') : card.answer
    const options = card.cardType === 'true_false' ? ['Verdadeiro', 'Falso'] : (() => {
      const otherAnswers = allCards
        .filter((c) => c.id !== card.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((c) => c.answer)

      return [...otherAnswers, card.answer].sort(() => Math.random() - 0.5)
    })()

    return {
      id: card.id,
      question: card.question,
      explanation: card.explanation,
      analogy: card.analogy,
      correctAnswer: normalizedAnswer,
      options,
    }
  })

  return c.json({ questions, deckName: deck.name })
})

// ─── POST /api/decks/:id/sessions — save game result ─────────────────────────

decksRouter.post(
  '/:id/sessions',
  requireAuth,
  zValidator(
    'json',
    z.object({
      gameType: z.enum(['hold_and_answer', 'quiz']),
      score: z.number().int().min(0),
      totalCards: z.number().int().min(1),
      correctCards: z.number().int().min(0),
    }),
  ),
  async (c) => {
    const { id } = c.req.param()
    const { sub } = c.get('user')
    const body = c.req.valid('json')

    const [deck] = await db.select({ id: decks.id }).from(decks).where(and(eq(decks.id, id))).limit(1)
    if (!deck) return c.json({ error: 'Deck não encontrado.' }, 404)

    // Insert game session (import gameSessions table)
    const { gameSessions } = await import('../_db/schema.js')
    const [session] = await db
      .insert(gameSessions)
      .values({ userId: sub!, deckId: id, ...body })
      .returning()

    return c.json({ session }, 201)
  },
)

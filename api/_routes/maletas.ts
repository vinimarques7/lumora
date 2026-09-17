import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../_db/index.js'
import { maletas, decks } from '../_db/schema.js'
import { requireAuth } from '../_middleware/auth.js'

export const maletasRouter = new Hono()

maletasRouter.get('/', requireAuth, async (c) => {
  const { sub } = c.get('user')

  const rows = await db.select().from(maletas).where(eq(maletas.ownerId, sub!)).orderBy(maletas.createdAt)

  return c.json({ maletas: rows })
})

maletasRouter.post(
  '/',
  requireAuth,
  zValidator(
    'json',
    z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      category: z.string().max(60).nullable().optional(),
    }),
  ),
  async (c) => {
    const { sub } = c.get('user')
    const body = c.req.valid('json')

    const [maleta] = await db
      .insert(maletas)
      .values({ ...body, ownerId: sub! })
      .returning()

    return c.json({ maleta }, 201)
  },
)

maletasRouter.patch(
  '/:id',
  requireAuth,
  zValidator(
    'json',
    z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).nullable().optional(),
      category: z.string().max(60).nullable().optional(),
    }),
  ),
  async (c) => {
    const { id } = c.req.param()
    const { sub, role } = c.get('user')
    const body = c.req.valid('json')

    const [maleta] = await db.select().from(maletas).where(eq(maletas.id, id)).limit(1)
    if (!maleta) return c.json({ error: 'Maleta não encontrada.' }, 404)
    if (maleta.ownerId !== sub && role !== 'admin') return c.json({ error: 'Acesso não autorizado.' }, 403)

    const [updated] = await db.update(maletas).set({ ...body, updatedAt: new Date() }).where(eq(maletas.id, id)).returning()

    return c.json({ maleta: updated })
  },
)

maletasRouter.delete('/:id', requireAuth, async (c) => {
  const { id } = c.req.param()
  const { sub, role } = c.get('user')

  const [maleta] = await db.select().from(maletas).where(eq(maletas.id, id)).limit(1)
  if (!maleta) return c.json({ error: 'Maleta não encontrada.' }, 404)
  if (maleta.ownerId !== sub && role !== 'admin') return c.json({ error: 'Acesso não autorizado.' }, 403)

  await db.delete(maletas).where(eq(maletas.id, id))

  return c.json({ message: 'Maleta excluída com sucesso.' })
})

maletasRouter.get('/:id/decks', requireAuth, async (c) => {
  const { id } = c.req.param()
  const { sub } = c.get('user')

  const [maleta] = await db.select().from(maletas).where(eq(maletas.id, id)).limit(1)
  if (!maleta) return c.json({ error: 'Maleta não encontrada.' }, 404)
  if (maleta.ownerId !== sub) return c.json({ error: 'Acesso não autorizado.' }, 403)

  const rows = await db.select().from(decks).where(eq(decks.maletaId, id)).orderBy(decks.createdAt)

  return c.json({ decks: rows })
})

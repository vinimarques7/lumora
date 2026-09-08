import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import argon2 from 'argon2'
import { db } from '../_db/index.js'
import { users } from '../_db/schema.js'
import { requireAuth, requireAdmin } from '../_middleware/auth.js'

export const usersRouter = new Hono()
const REFRESH_COOKIE = 'refresh_token'
const IS_PROD = process.env.NODE_ENV === 'production'

// ─── GET /api/users/me ────────────────────────────────────────────────────────

usersRouter.get('/me', requireAuth, async (c) => {
  const { sub } = c.get('user')

  const [user] = await db
    .select({ id: users.id, email: users.email, role: users.role, themeColor: users.themeColor, displayName: users.displayName, occupation: users.occupation, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, sub!))
    .limit(1)

  if (!user) return c.json({ error: 'Usuário não encontrado.' }, 404)

  return c.json({ user })
})

// ─── PATCH /api/users/me ──────────────────────────────────────────────────────

usersRouter.patch(
  '/me',
  requireAuth,
  zValidator(
    'json',
    z.object({
      themeColor: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida. Use formato hexadecimal: #rrggbb.')
        .optional(),
      displayName: z.string().min(1).max(100).optional(),
      occupation: z.string().max(100).optional(),
      currentPassword: z.string().min(1).optional(),
      newPassword: z.string().min(8).max(128).optional(),
    }),
  ),
  async (c) => {
    const { sub } = c.get('user')
    const { themeColor, displayName, occupation, currentPassword, newPassword } = c.req.valid('json')

    const [user] = await db.select().from(users).where(eq(users.id, sub!)).limit(1)
    if (!user) return c.json({ error: 'Usuário não encontrado.' }, 404)

    const updates: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (themeColor) {
      updates.themeColor = themeColor
    }

    if (displayName !== undefined) {
      updates.displayName = displayName
    }

    if (occupation !== undefined) {
      updates.occupation = occupation
    }

    if (newPassword) {
      if (!currentPassword) {
        return c.json({ error: 'Informe a senha atual para alterá-la.' }, 400)
      }
      const valid = await argon2.verify(user.passwordHash, currentPassword)
      if (!valid) {
        return c.json({ error: 'Senha atual incorreta.' }, 400)
      }
      updates.passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id })
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, sub!))
      .returning({ id: users.id, email: users.email, role: users.role, themeColor: users.themeColor, displayName: users.displayName, occupation: users.occupation })

    return c.json({ user: updated })
  },
)

// ─── DELETE /api/users/me ────────────────────────────────────────────────────

usersRouter.delete(
  '/me',
  requireAuth,
  zValidator(
    'json',
    z.object({
      username: z.string().min(1).max(100),
      password: z.string().min(1).max(128),
    }),
  ),
  async (c) => {
    const { sub } = c.get('user')
    const { username, password } = c.req.valid('json')

    const [user] = await db.select().from(users).where(eq(users.id, sub!)).limit(1)
    if (!user) return c.json({ error: 'Usuário não encontrado.' }, 404)

    const expectedUsername = (user.displayName ?? user.email).trim().toLowerCase()
    if (username.trim().toLowerCase() !== expectedUsername) {
      return c.json({ error: 'Nome de usuário incorreto.' }, 400)
    }

    const validPassword = await argon2.verify(user.passwordHash, password)
    if (!validPassword) {
      return c.json({ error: 'Senha incorreta.' }, 400)
    }

    await db.delete(users).where(eq(users.id, sub!))

    c.header(
      'Set-Cookie',
      `${REFRESH_COOKIE}=; HttpOnly; ${IS_PROD ? 'Secure; ' : ''}SameSite=Strict; Max-Age=0; Path=/`,
    )

    return c.json({ message: 'Conta deletada com sucesso.' })
  },
)

// ─── GET /api/users (admin only) ──────────────────────────────────────────────

usersRouter.get('/', requireAdmin, async (c) => {
  const allUsers = await db
    .select({ id: users.id, email: users.email, role: users.role, themeColor: users.themeColor, createdAt: users.createdAt })
    .from(users)
    .orderBy(users.createdAt)

  return c.json({ users: allUsers })
})

// ─── PATCH /api/users/:id/role (admin only) ───────────────────────────────────

usersRouter.patch(
  '/:id/role',
  requireAdmin,
  zValidator('json', z.object({ role: z.enum(['user', 'admin']) })),
  async (c) => {
    const { id } = c.req.param()
    const { role } = c.req.valid('json')
    const adminUser = c.get('user')

    // Prevent admin from demoting themselves
    if (id === adminUser.sub && role !== 'admin') {
      return c.json({ error: 'Você não pode rebaixar sua própria conta de admin.' }, 400)
    }

    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id, email: users.email, role: users.role })

    if (!updated) return c.json({ error: 'Usuário não encontrado.' }, 404)

    return c.json({ user: updated })
  },
)

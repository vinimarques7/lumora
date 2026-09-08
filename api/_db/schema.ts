import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  integer,
  boolean,
  varchar,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['user', 'admin'])
export const difficultyEnum = pgEnum('difficulty', ['easy', 'medium', 'hard'])
export const tokenPurposeEnum = pgEnum('token_purpose', ['password_reset'])

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  themeColor: varchar('theme_color', { length: 7 }).notNull().default('#6366f1'),
  displayName: varchar('display_name', { length: 100 }),
  occupation: varchar('occupation', { length: 100 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const usersRelations = relations(users, ({ many }) => ({
  decks: many(decks),
  cards: many(cards),
  refreshTokens: many(refreshTokens),
  savedDecks: many(savedDecks),
}))

// ─── Refresh Tokens ───────────────────────────────────────────────────────────

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  jti: uuid('jti').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  revoked: boolean('revoked').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}))

// ─── Verification Tokens (password reset) ─────────────────────────────────────

export const verificationTokens = pgTable('verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  purpose: tokenPurposeEnum('purpose').notNull(),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const verificationTokensRelations = relations(verificationTokens, ({ one }) => ({
  user: one(users, { fields: [verificationTokens.userId], references: [users.id] }),
}))

// ─── Decks ────────────────────────────────────────────────────────────────────

export const decks = pgTable('decks', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  isPublic: boolean('is_public').notNull().default(false),
  pinEmoji: varchar('pin_emoji', { length: 10 }),
  pinLabel: varchar('pin_label', { length: 60 }),
  category: varchar('category', { length: 60 }),
  extraCategories: text('extra_categories').array(),
  deckDifficulty: difficultyEnum('deck_difficulty').notNull().default('medium'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const decksRelations = relations(decks, ({ one, many }) => ({
  owner: one(users, { fields: [decks.ownerId], references: [users.id] }),
  cards: many(cards),
  savedByUsers: many(savedDecks),
}))

// ─── Cards ────────────────────────────────────────────────────────────────────

export const cards = pgTable('cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  deckId: uuid('deck_id')
    .notNull()
    .references(() => decks.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  explanation: text('explanation'),
  analogy: text('analogy'),
  imageUrl: text('image_url'),
  difficulty: difficultyEnum('difficulty').notNull().default('medium'),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const cardsRelations = relations(cards, ({ one }) => ({
  deck: one(decks, { fields: [cards.deckId], references: [decks.id] }),
  author: one(users, { fields: [cards.authorId], references: [users.id] }),
}))

// ─── Site Settings ────────────────────────────────────────────────────────────

export const siteSettings = pgTable('site_settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── Game Sessions (optional — histórico de partidas) ─────────────────────────

export const gameSessions = pgTable('game_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  deckId: uuid('deck_id')
    .notNull()
    .references(() => decks.id, { onDelete: 'cascade' }),
  gameType: varchar('game_type', { length: 30 }).notNull(), // 'hold_and_answer' | 'quiz'
  score: integer('score').notNull().default(0),
  totalCards: integer('total_cards').notNull().default(0),
  correctCards: integer('correct_cards').notNull().default(0),
  playedAt: timestamp('played_at').notNull().defaultNow(),
})

// ─── Saved Decks ──────────────────────────────────────────────────────────────

export const savedDecks = pgTable(
  'saved_decks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deckId: uuid('deck_id')
      .notNull()
      .references(() => decks.id, { onDelete: 'cascade' }),
    savedAt: timestamp('saved_at').notNull().defaultNow(),
  },
  (t) => ({ uniq: uniqueIndex('saved_decks_user_deck_idx').on(t.userId, t.deckId) }),
)

export const savedDecksRelations = relations(savedDecks, ({ one }) => ({
  user: one(users, { fields: [savedDecks.userId], references: [users.id] }),
  deck: one(decks, { fields: [savedDecks.deckId], references: [decks.id] }),
}))

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Deck = typeof decks.$inferSelect
export type NewDeck = typeof decks.$inferInsert
export type Card = typeof cards.$inferSelect
export type NewCard = typeof cards.$inferInsert
export type SiteSetting = typeof siteSettings.$inferSelect
export type GameSession = typeof gameSessions.$inferSelect

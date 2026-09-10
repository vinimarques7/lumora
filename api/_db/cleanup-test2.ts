import 'dotenv/config'
import { db } from './index.js'
import { users } from './schema.js'
import { eq } from 'drizzle-orm'

const EMAIL_TO_DELETE = process.env.CLEANUP_USER_EMAIL ?? 'teste2@lumora.app'

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ cleanup-test2 é restrito a ambiente de desenvolvimento.')
    process.exit(1)
  }

  if (process.env.ALLOW_TEST_CLEANUP !== 'true') {
    console.error('❌ Para executar este script, defina ALLOW_TEST_CLEANUP=true')
    process.exit(1)
  }

  if (!EMAIL_TO_DELETE.endsWith('@lumora.app') && !EMAIL_TO_DELETE.endsWith('@studycenter.test')) {
    console.error('❌ Email de limpeza fora do escopo permitido. Use o e-mail de teste específico.')
    process.exit(1)
  }

  const deleted = await db
    .delete(users)
    .where(eq(users.email, EMAIL_TO_DELETE))
    .returning({ email: users.email })

  if (deleted.length > 0) {
    console.log('✅ Usuário removido:', deleted[0].email)
  } else {
    console.log('ℹ️  Usuário não encontrado.')
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })

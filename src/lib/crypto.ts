import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getEncryptionKey() {
  const secret = process.env.CLAIMRAIL_ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET

  if (!secret) {
    throw new Error('CLAIMRAIL_ENCRYPTION_SECRET or NEXTAUTH_SECRET must be configured')
  }

  return createHash('sha256').update(secret).digest()
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return {
    iv: iv.toString('base64'),
    content: encrypted.toString('base64'),
    tag: tag.toString('base64'),
  }
}

export function decryptSecret(payload: { iv: string; content: string; tag: string }) {
  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(payload.iv, 'base64')
  )

  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.content, 'base64')),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

export function hashApiKey(apiKey: string) {
  return createHash('sha256').update(apiKey).digest('hex')
}

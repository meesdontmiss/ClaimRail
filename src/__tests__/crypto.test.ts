import { describe, it, expect } from 'vitest'
import { encryptSecret, decryptSecret } from '@/lib/crypto'

describe('Crypto Utilities', () => {
  it('should encrypt and decrypt a secret correctly', () => {
    const original = 'my-secret-password'
    const encrypted = encryptSecret(original)
    
    expect(encrypted).toHaveProperty('iv')
    expect(encrypted).toHaveProperty('content')
    expect(encrypted).toHaveProperty('tag')
    
    const decrypted = decryptSecret(encrypted)
    expect(decrypted).toBe(original)
  })

  it('should generate different encrypted values for same input', () => {
    const original = 'test-secret'
    const encrypted1 = encryptSecret(original)
    const encrypted2 = encryptSecret(original)
    
    // IV should be random, so encrypted values should differ
    expect(encrypted1.iv).not.toBe(encrypted2.iv)
    expect(encrypted1.content).not.toBe(encrypted2.content)
    
    // But both should decrypt to same value
    expect(decryptSecret(encrypted1)).toBe(original)
    expect(decryptSecret(encrypted2)).toBe(original)
  })

  it('should throw error when no encryption key is configured', () => {
    const originalEnv = process.env.CLAIMRAIL_ENCRYPTION_SECRET
    const originalNextAuth = process.env.NEXTAUTH_SECRET
    
    delete process.env.CLAIMRAIL_ENCRYPTION_SECRET
    delete process.env.NEXTAUTH_SECRET
    
    expect(() => encryptSecret('test')).toThrow()
    expect(() => decryptSecret({ iv: '', content: '', tag: '' })).toThrow()
    
    // Restore env
    process.env.CLAIMRAIL_ENCRYPTION_SECRET = originalEnv
    process.env.NEXTAUTH_SECRET = originalNextAuth
  })
})

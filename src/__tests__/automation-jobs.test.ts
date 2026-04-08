import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAutomationWorkerSecretConfig, isAutomationWorkerAuthorized } from '@/lib/automation-jobs'

describe('Automation Jobs', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  describe('getAutomationWorkerSecretConfig', () => {
    it('should prioritize AUTOMATION_WORKER_SECRET', () => {
      process.env.AUTOMATION_WORKER_SECRET = 'worker-secret-123'
      process.env.CLAIMRAIL_ENCRYPTION_SECRET = 'encryption-secret'
      process.env.NEXTAUTH_SECRET = 'nextauth-secret'

      const config = getAutomationWorkerSecretConfig()
      
      expect(config.source).toBe('AUTOMATION_WORKER_SECRET')
      expect(config.secret).toBe('worker-secret-123')
    })

    it('should fallback to CLAIMRAIL_ENCRYPTION_SECRET', () => {
      delete process.env.AUTOMATION_WORKER_SECRET
      process.env.CLAIMRAIL_ENCRYPTION_SECRET = 'encryption-secret'
      process.env.NEXTAUTH_SECRET = 'nextauth-secret'

      const config = getAutomationWorkerSecretConfig()
      
      expect(config.source).toBe('CLAIMRAIL_ENCRYPTION_SECRET')
      expect(config.secret).toBe('encryption-secret')
    })

    it('should fallback to NEXTAUTH_SECRET', () => {
      delete process.env.AUTOMATION_WORKER_SECRET
      delete process.env.CLAIMRAIL_ENCRYPTION_SECRET
      process.env.NEXTAUTH_SECRET = 'nextauth-secret'

      const config = getAutomationWorkerSecretConfig()
      
      expect(config.source).toBe('NEXTAUTH_SECRET')
      expect(config.secret).toBe('nextauth-secret')
    })

    it('should return empty secret when none configured', () => {
      delete process.env.AUTOMATION_WORKER_SECRET
      delete process.env.CLAIMRAIL_ENCRYPTION_SECRET
      delete process.env.NEXTAUTH_SECRET

      const config = getAutomationWorkerSecretConfig()
      
      expect(config.secret).toBe('')
      expect(config.source).toBeNull()
    })
  })

  describe('isAutomationWorkerAuthorized', () => {
    it('should reject when no secret is configured', () => {
      delete process.env.AUTOMATION_WORKER_SECRET
      delete process.env.CLAIMRAIL_ENCRYPTION_SECRET
      delete process.env.NEXTAUTH_SECRET

      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'x-claimrail-worker-secret': 'any-secret',
        },
      })

      expect(isAutomationWorkerAuthorized(request)).toBe(false)
    })

    it('should accept when worker secret matches', () => {
      process.env.AUTOMATION_WORKER_SECRET = 'matching-secret'

      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'x-claimrail-worker-secret': 'matching-secret',
        },
      })

      expect(isAutomationWorkerAuthorized(request)).toBe(true)
    })

    it('should reject when worker secret does not match', () => {
      process.env.AUTOMATION_WORKER_SECRET = 'correct-secret'

      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'x-claimrail-worker-secret': 'wrong-secret',
        },
      })

      expect(isAutomationWorkerAuthorized(request)).toBe(false)
    })

    it('should accept Bearer token authorization', () => {
      process.env.AUTOMATION_WORKER_SECRET = 'bearer-secret'

      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer bearer-secret',
        },
      })

      expect(isAutomationWorkerAuthorized(request)).toBe(true)
    })
  })
})

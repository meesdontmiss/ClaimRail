import { describe, it, expect, vi, beforeEach } from 'vitest'
import { syncStripeCustomerToUser, syncStripeSubscriptionByCustomer } from '@/lib/stripe'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

vi.mock('@/lib/db', () => ({
  db: {
    update: vi.fn(),
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
  },
}))

vi.mock('@/lib/db/schema', () => ({
  users: {
    id: 'id',
    stripeCustomerId: 'stripeCustomerId',
    stripeSubscriptionId: 'stripeSubscriptionId',
    stripeSubscriptionStatus: 'stripeSubscriptionStatus',
  },
  eq: vi.fn(),
}))

describe('Stripe Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('syncStripeCustomerToUser', () => {
    it('should update user with Stripe customer info', async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      }
      
      vi.mocked(db.update).mockReturnValue(mockUpdate as any)

      await syncStripeCustomerToUser({
        userId: 'user-123',
        customerId: 'cus_abc123',
        subscriptionId: 'sub_def456',
        subscriptionStatus: 'active',
      })

      expect(db.update).toHaveBeenCalled()
      expect(mockUpdate.set).toHaveBeenCalledWith({
        stripeCustomerId: 'cus_abc123',
        stripeSubscriptionId: 'sub_def456',
        stripeSubscriptionStatus: 'active',
      })
    })

    it('should skip when userId is null', async () => {
      await syncStripeCustomerToUser({
        userId: null,
        customerId: 'cus_abc123',
      })

      expect(db.update).not.toHaveBeenCalled()
    })
  })

  describe('syncStripeSubscriptionByCustomer', () => {
    it('should update user subscription status', async () => {
      const mockUser = {
        id: 'user-123',
        stripeCustomerId: 'cus_abc123',
      }

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser)

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      }
      
      vi.mocked(db.update).mockReturnValue(mockUpdate as any)

      const mockSubscription = {
        id: 'sub_def456',
        status: 'active',
        customer: 'cus_abc123',
      }

      await syncStripeSubscriptionByCustomer('cus_abc123', mockSubscription as any)

      expect(db.query.users.findFirst).toHaveBeenCalled()
      expect(db.update).toHaveBeenCalled()
    })

    it('should skip when user not found', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null)

      await syncStripeSubscriptionByCustomer('cus_unknown', null)

      expect(db.update).not.toHaveBeenCalled()
    })
  })
})

'use server'

import { revalidatePath } from 'next/cache'
import { cancelAutomationJobForUser, requeueAutomationJobForUser } from '@/lib/automation-jobs'
import { requireUser } from '@/lib/session'

export async function retryAutomationJobAction(jobId: string) {
  const user = await requireUser()
  const result = await requeueAutomationJobForUser(jobId, user.id)

  revalidatePath('/dashboard/automation')
  return result
}

export async function cancelAutomationJobAction(jobId: string) {
  const user = await requireUser()
  const result = await cancelAutomationJobForUser(jobId, user.id)

  revalidatePath('/dashboard/automation')
  return result
}

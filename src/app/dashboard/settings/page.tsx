import { requireUser } from '@/lib/session'
import { getExtensionUsageStats } from '@/app/actions/extension-license'
import { SettingsScreen } from '@/components/settings/settings-screen'
import { getAutomationWorkerSecretConfig } from '@/lib/automation-jobs'

export default async function SettingsPage() {
  const user = await requireUser()
  const extensionUsage = await getExtensionUsageStats()
  const automationSecretConfig = getAutomationWorkerSecretConfig()

  return (
    <SettingsScreen
      userId={user.id}
      hasBMICredentials={Boolean(user.bmiCredentialsEncrypted)}
      subscriptionTier={user.stripeSubscriptionStatus === 'active' ? 'pro' : 'free'}
      registrationsThisWeek={'registrationsThisWeek' in extensionUsage && typeof extensionUsage.registrationsThisWeek === 'number' ? extensionUsage.registrationsThisWeek : 0}
      weeklyLimit={'weeklyLimit' in extensionUsage ? extensionUsage.weeklyLimit : 1}
      apiKeyCreatedAt={user.extensionApiKeyCreatedAt ? user.extensionApiKeyCreatedAt.toISOString() : null}
      hasApiKey={Boolean(user.extensionApiKey)}
      billingReady={Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)}
      billingWebhookReady={Boolean(process.env.STRIPE_WEBHOOK_SECRET)}
      automationReady={Boolean(process.env.AUTOMATION_WORKER_SECRET)}
      automationSecretSource={automationSecretConfig.source}
      automationSecretFingerprint={automationSecretConfig.fingerprint}
    />
  )
}

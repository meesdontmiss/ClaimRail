import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium, type Page } from 'playwright'

const BMI_LOGIN_URL = 'https://www.bmi.com/login'
const BMI_REGISTER_URL = 'https://www.bmi.com/register-work'

export interface BMIRegistrationData {
  workTitle: string
  isrc?: string
  writers: Array<{
    name: string
    ipi?: string
    pro?: string
    share: number
    role: 'writer' | 'composer' | 'publisher'
  }>
  alternativeTitles?: string[]
  publishers?: Array<{
    name: string
    share: number
  }>
}

export interface RegistrationResult {
  success: boolean
  confirmationNumber?: string
  error?: string
  workId?: string
  screenshotPath?: string
}

interface BMICredentials {
  username: string
  password: string
}

function resolveRole(role: BMIRegistrationData['writers'][number]['role']) {
  if (role === 'publisher') {
    return 'Publisher'
  }

  if (role === 'composer') {
    return 'Composer'
  }

  return 'Writer'
}

async function loginToBMI(page: Page, credentials: BMICredentials) {
  await page.goto(BMI_LOGIN_URL, { waitUntil: 'networkidle' })
  await page.fill('input[name="username"]', credentials.username)
  await page.fill('input[name="password"]', credentials.password)
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
}

async function assertLoggedIn(page: Page) {
  if (page.url().includes('/login')) {
    const bodyText = (await page.locator('body').textContent())?.toLowerCase() ?? ''
    if (bodyText.includes('invalid') || bodyText.includes('incorrect') || bodyText.includes('error')) {
      throw new Error('BMI login failed. Please check your credentials.')
    }
  }
}

export async function registerWorkWithBMI(
  data: BMIRegistrationData,
  userCredentials: BMICredentials
): Promise<RegistrationResult> {
  const browser = await chromium.launch({
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
  })

  const page = await browser.newPage()

  try {
    await loginToBMI(page, userCredentials)
    await assertLoggedIn(page)

    await page.goto(BMI_REGISTER_URL, { waitUntil: 'networkidle' })
    await page.fill('#work-title', data.workTitle)

    if (data.isrc) {
      await page.fill('#isrc-code', data.isrc)
    }

    for (const writer of data.writers) {
      const addWriterButton = page.locator('button.add-writer')
      if (await addWriterButton.count()) {
        await addWriterButton.first().click()
        await page.waitForTimeout(300)
      }

      await page.locator('.writer-name-input').last().fill(writer.name)
      if (writer.ipi) {
        await page.locator('.writer-ipi-input').last().fill(writer.ipi)
      }
      if (writer.pro) {
        await page.locator('.writer-pro-select').last().selectOption(writer.pro)
      }
      await page.locator('.writer-share-input').last().fill(String(writer.share))
      await page.locator('.writer-role-select').last().selectOption(resolveRole(writer.role))
    }

    await page.click('button[type="submit"]')
    await page.waitForSelector('.confirmation-message', { timeout: 15000 })

    const confirmationNumber = (await page.locator('.confirmation-number').textContent())?.trim()
    const workId = (await page.locator('.work-id').textContent())?.trim() || undefined

    if (!confirmationNumber) {
      throw new Error('BMI confirmation number was not found.')
    }

    const artifactsDir = path.resolve(process.cwd(), 'bmi-artifacts')
    await fs.mkdir(artifactsDir, { recursive: true })
    const screenshotPath = path.join(artifactsDir, `bmi-registration-${Date.now()}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })

    return {
      success: true,
      confirmationNumber,
      workId,
      screenshotPath,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  } finally {
    await browser.close()
  }
}

export async function validateBMICredentials(credentials: BMICredentials): Promise<boolean> {
  const browser = await chromium.launch({
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
  })

  const page = await browser.newPage()

  try {
    await loginToBMI(page, credentials)

    if (page.url().includes('/login')) {
      const bodyText = (await page.locator('body').textContent())?.toLowerCase() ?? ''
      if (bodyText.includes('invalid') || bodyText.includes('incorrect') || bodyText.includes('error')) {
        return false
      }
    }

    return !page.url().includes('/login')
  } catch {
    return false
  } finally {
    await browser.close()
  }
}

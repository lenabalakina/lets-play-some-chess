import { test, expect } from '@playwright/test'

test('online lobby shows create and join options', async ({ page }) => {
  await page.goto('/play/online')

  await expect(page.getByText('Create Room')).toBeVisible()
  await expect(page.getByPlaceholder('ROOM CODE')).toBeVisible()
})

test('creating a room generates a 6-char room code', async ({ page }) => {
  await page.goto('/play/online')

  await page.getByText('Create Room').click()

  // Navigates to /play/online/[CODE]?color=w
  await expect(page).toHaveURL(/play\/online\/[A-Z0-9]{6}/, { timeout: 8_000 })

  // Room code visible on page (from URL)
  const url  = page.url()
  const code = url.split('/').pop()!.split('?')[0]
  expect(code).toMatch(/^[A-Z0-9]{6}$/)
  await expect(page.getByText(code).first()).toBeVisible()
})

test('created room shows waiting for opponent message', async ({ page }) => {
  await page.goto('/play/online')
  await page.getByText('Create Room').click()
  await expect(page).toHaveURL(/play\/online\/[A-Z0-9]{6}/, { timeout: 8_000 })

  await expect(page.getByText(/waiting for opponent/i)).toBeVisible({ timeout: 5_000 })
})

test('join with invalid code shows error', async ({ page }) => {
  await page.goto('/play/online')

  const input = page.getByPlaceholder('ROOM CODE')
  await input.fill('XXXXXX')

  // Submit by pressing Enter
  await input.press('Enter')

  await expect(page.getByText(/not found|invalid|error/i)).toBeVisible({ timeout: 5_000 })
})

// Regression: 3D toggle in online room should not crash the UI
test('3D toggle in online room does not crash', async ({ page }) => {
  await page.goto('/play/online')
  await page.getByText('Create Room').click()
  await expect(page).toHaveURL(/play\/online\/[A-Z0-9]{6}/, { timeout: 8_000 })

  const toggle3D = page.getByRole('switch', { name: /3d board/i })
  if (await toggle3D.isVisible()) {
    await toggle3D.click()
    await page.waitForTimeout(300)
    await toggle3D.click()
    await page.waitForTimeout(300)
    await expect(page.getByText(/waiting|your move|opponent/i)).toBeVisible()
  }
})

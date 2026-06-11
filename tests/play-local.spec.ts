import { test, expect } from '@playwright/test'

test('local game board renders', async ({ page }) => {
  await page.goto('/play/local')
  await expect(page.locator('[data-square]').first()).toBeVisible({ timeout: 10_000 })
  // All 64 squares present
  await expect(page.locator('[data-square]')).toHaveCount(64)
})

test('local game: black can move after white', async ({ page }) => {
  await page.goto('/play/local')
  await page.locator('[data-square]').first().waitFor({ timeout: 10_000 })

  await page.locator('[data-square="e2"]').click()
  await page.locator('[data-square="e4"]').click()
  await expect(page.locator('[data-square="e4"]')).toHaveAttribute('data-piece', /P/, { timeout: 3_000 })

  // Black's turn — e7 pawn should move to e5
  await page.locator('[data-square="e7"]').click()
  await page.locator('[data-square="e5"]').click()
  await expect(page.locator('[data-square="e5"]')).toHaveAttribute('data-piece', /p/, { timeout: 3_000 })
})

test('local game: white pawn moves e2 to e4', async ({ page }) => {
  await page.goto('/play/local')
  await page.locator('[data-square]').first().waitFor({ timeout: 10_000 })

  await page.locator('[data-square="e2"]').click()
  await page.locator('[data-square="e4"]').click()

  await expect(page.locator('[data-square="e4"]')).toHaveAttribute('data-piece', /P/, { timeout: 3_000 })
})

test('local game: resign button is present and shows game over', async ({ page }) => {
  await page.goto('/play/local')
  await page.locator('[data-square]').first().waitFor({ timeout: 10_000 })

  // Resign button in game controls
  const resignBtn = page.getByRole('button', { name: /resign/i })
  await expect(resignBtn).toBeVisible()
  await resignBtn.click()

  // Game result modal heading should appear
  await expect(page.getByRole('heading', { name: /defeat|draw|victory/i })).toBeVisible({ timeout: 3_000 })
})

test('local game: draw button is present', async ({ page }) => {
  await page.goto('/play/local')
  await page.locator('[data-square]').first().waitFor({ timeout: 10_000 })

  // Draw button (½) in game controls
  const drawBtn = page.getByRole('button', { name: /½|draw/i })
  await expect(drawBtn).toBeVisible()
})

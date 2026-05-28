import { test, expect } from '@playwright/test'

test('AI page shows difficulty selector', async ({ page }) => {
  await page.goto('/play/ai')

  // Difficulty cards visible (labels used in the page)
  await expect(page.getByText('Beginner')).toBeVisible()
  await expect(page.getByText('Intermediate')).toBeVisible()
  await expect(page.getByText('Master')).toBeVisible()
})

test('clicking a difficulty card loads the game board', async ({ page }) => {
  await page.goto('/play/ai')

  await page.getByText('Beginner').click()

  // Board should appear
  await expect(page.locator('[data-square]').first()).toBeVisible({ timeout: 10_000 })
})

test('can select a piece and see legal move highlights', async ({ page }) => {
  await page.goto('/play/ai')
  await page.getByText('Beginner').click()
  await page.locator('[data-square]').first().waitFor({ timeout: 10_000 })

  // Click e2 (white pawn) — should highlight e3/e4 as legal
  await page.locator('[data-square="e2"]').click()
  await expect(page.locator('[data-square="e4"]')).toHaveAttribute('data-legal', 'true', { timeout: 3_000 })
})

test('can make a move — e2 to e4', async ({ page }) => {
  await page.goto('/play/ai')
  await page.getByText('Beginner').click()
  await page.locator('[data-square]').first().waitFor({ timeout: 10_000 })

  await page.locator('[data-square="e2"]').click()
  await page.locator('[data-square="e4"]').click()

  // Pawn now on e4
  await expect(page.locator('[data-square="e4"]')).toHaveAttribute('data-piece', 'P', { timeout: 5_000 })
})

// Regression: game must stay loaded after clicking difficulty (history.pushState bug was resetting state)
test('game stays loaded after clicking difficulty', async ({ page }) => {
  await page.goto('/play/ai')
  await page.getByText('Beginner').click()
  await page.waitForTimeout(600)
  await expect(page.locator('[data-square]').first()).toBeVisible()
})

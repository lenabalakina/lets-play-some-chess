import { test, expect } from '@playwright/test'

test('homepage loads and shows key sections', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/chess/i)

  // Headline visible
  await expect(page.getByText("FOR SOME CHESS?")).toBeVisible()

  // Primary CTA goes to online play
  const playBtn = page.getByRole('link', { name: /play online now/i })
  await expect(playBtn).toBeVisible()
  await expect(playBtn).toHaveAttribute('href', '/play/online')

  // Four mode cards
  await expect(page.getByText('VS Stockfish')).toBeVisible()
  await expect(page.getByText('Local Game')).toBeVisible()
  await expect(page.getByText('Daily Puzzle')).toBeVisible()
  await expect(page.getByText('Leaderboard')).toBeVisible()

  // Nav Sign In / Get Started
  await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /get started/i })).toBeVisible()
})

test('nav links go to correct pages', async ({ page }) => {
  await page.goto('/')

  // VS Stockfish card navigates to /play/ai
  await page.getByRole('link', { name: /vs stockfish/i }).first().click()
  await expect(page).toHaveURL(/play\/ai/)
})

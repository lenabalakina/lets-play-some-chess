import { test, expect } from '@playwright/test'

test('two players join by code and white move syncs to black', async ({ browser }) => {
  const ctxWhite = await browser.newContext()
  const ctxBlack = await browser.newContext()
  const white = await ctxWhite.newPage()
  const black = await ctxBlack.newPage()

  // Player 1 creates room
  await white.goto('/play/online')
  await white.getByText('Create Room').click()
  await expect(white).toHaveURL(/play\/online\/[A-Z0-9]{6}/, { timeout: 10_000 })

  const code = white.url().split('/').pop()!.split('?')[0]
  await expect(white.getByText(/waiting for opponent/i)).toBeVisible({ timeout: 8_000 })

  // Player 2 joins via direct URL (auto-join on page load)
  await black.goto(`/play/online/${code}?color=b`)
  await expect(black).toHaveURL(new RegExp(`play/online/${code}`), { timeout: 15_000 })

  // Game should start for both
  await expect(white.getByText(/♟ Your move|opponent's turn/i)).toBeVisible({ timeout: 15_000 })
  await expect(black.getByText(/♟ Your move|opponent's turn/i)).toBeVisible({ timeout: 15_000 })
  await expect(white.locator('text=10:00')).toHaveCount(0)
  await expect(black.locator('text=10:00')).toHaveCount(0)

  // White plays e2-e4
  await white.locator('[data-square="e2"]').click()
  await white.locator('[data-square="e4"]').click()

  // Black should see the move reflected (poll + SSE, allow up to 8s)
  await expect(black.locator('[data-square="e4"][data-piece="P"]')).toBeVisible({ timeout: 8_000 })
  await expect(black.locator('[data-square="e2"][data-piece]')).toHaveCount(0, { timeout: 3_000 })

  await ctxWhite.close()
  await ctxBlack.close()
})

test('black player sees own pieces at bottom of 2D board', async ({ browser }) => {
  const ctxWhite = await browser.newContext()
  const ctxBlack = await browser.newContext()
  const white = await ctxWhite.newPage()
  const black = await ctxBlack.newPage()

  await white.goto('/play/online')
  await white.getByText('Create Room').click()
  await expect(white).toHaveURL(/play\/online\/[A-Z0-9]{6}/, { timeout: 10_000 })
  const code = white.url().split('/').pop()!.split('?')[0]

  await black.goto(`/play/online/${code}?color=b`)
  await expect(black).toHaveURL(new RegExp(`play/online/${code}`), { timeout: 15_000 })

  // Black's e7 pawn should be on a lower row than e2 (rank 7 vs rank 2 in DOM order for black view)
  const e7Box = await black.locator('[data-square="e7"]').boundingBox()
  const e2Box = await black.locator('[data-square="e2"]').boundingBox()
  expect(e7Box).toBeTruthy()
  expect(e2Box).toBeTruthy()
  if (e7Box && e2Box) {
    expect(e7Box.y).toBeGreaterThan(e2Box.y)
  }

  await ctxWhite.close()
  await ctxBlack.close()
})

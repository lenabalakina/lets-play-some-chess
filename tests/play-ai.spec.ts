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

test('ignores a stopped Stockfish search when difficulty changes mid-move', async ({ page }) => {
  await page.addInitScript(() => {
    class MockStockfishWorker {
      onmessage: ((event: MessageEvent<string>) => void) | null = null
      messages: string[] = []
      private goCount = 0

      constructor() {
        ;(window as unknown as { __stockfishWorkers: MockStockfishWorker[] }).__stockfishWorkers.push(this)
        setTimeout(() => this.emit('readyok'), 0)
      }

      postMessage(message: string) {
        this.messages.push(message)
        if (message === 'stop') {
          setTimeout(() => this.emit('bestmove e7e5'), 25)
          return
        }
        if (message.startsWith('go ')) {
          this.goCount += 1
          if (this.goCount > 1) {
            setTimeout(() => this.emit('bestmove g8f6'), 25)
          }
        }
      }

      terminate() {}

      private emit(data: string) {
        this.onmessage?.({ data } as MessageEvent<string>)
      }
    }

    ;(window as unknown as { __stockfishWorkers: MockStockfishWorker[] }).__stockfishWorkers = []
    Object.defineProperty(window, 'Worker', {
      configurable: true,
      value: MockStockfishWorker,
    })
  })

  await page.goto('/play/ai')
  await page.getByText('Beginner').click()
  await page.locator('[data-square]').first().waitFor({ timeout: 10_000 })

  await page.locator('[data-square="e2"]').click()
  await page.locator('[data-square="e4"]').click()
  await page.waitForFunction(() => {
    const workers = (window as unknown as { __stockfishWorkers?: Array<{ messages: string[] }> }).__stockfishWorkers
    return workers?.some(worker => worker.messages.some(message => message.startsWith('go ')))
  })

  await page.getByRole('button', { name: /settings/i }).click()
  await page.getByRole('button', { name: 'Intermediate' }).click()

  await expect(page.locator('[data-square="f6"]')).toHaveAttribute('data-piece', 'n', { timeout: 3_000 })
  await expect(page.locator('[data-square="e5"]')).not.toHaveAttribute('data-piece', 'p')
})

// Regression: game must stay loaded after clicking difficulty (history.pushState bug was resetting state)
test('game stays loaded after clicking difficulty', async ({ page }) => {
  await page.goto('/play/ai')
  await page.getByText('Beginner').click()
  await page.waitForTimeout(600)
  await expect(page.locator('[data-square]').first()).toBeVisible()
})

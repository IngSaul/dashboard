import type { Page } from '@playwright/test'
import { expect, test, waitForPersistedConfig } from './fixtures'

/**
 * Personalization: add, edit, remove and filter shortcuts, verifying each
 * change survives a real page reload — which, for an authenticated account,
 * means it round-tripped through `PUT /api/dashboard` and came back from
 * SQLite, not from browser storage.
 *
 * Rewritten from the feature-001 "Manage shortcuts" drawer flow: shortcut
 * and category management lives on the shortcuts widget grid itself now
 * (`AddShortcutCard`, the per-card `ShortcutActionsMenu`, and their modals)
 * — see `ShortcutsWidget`'s own doc comment.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Gmail' })).toBeVisible()
})

/**
 * A card's corner menu is `pointer-events: none` until the card is hovered
 * or focused (`ShortcutActionsMenu.css`), so the pointer has to travel over
 * the card first — exactly as a real user's does. Clicking the trigger
 * straight away deadlocks: the hit test resolves to the wrapper instead.
 */
async function openCardMenu(page: Page, label: string) {
  const card = page.locator('.shortcut-card').filter({
    has: page.getByRole('link', { name: label, exact: true }),
  })
  await card.hover()
  await card.getByRole('button', { name: `Acciones para ${label}` }).click()
}

test('adds a shortcut and keeps it after reload', async ({ page, accountApi }) => {
  await page.getByRole('button', { name: 'Añadir acceso directo' }).click()
  const dialog = page.getByRole('dialog', { name: 'Añadir acceso directo' })
  await dialog.getByRole('textbox', { name: /nombre/i }).fill('Docs')
  await dialog.getByRole('textbox', { name: /url/i }).fill('https://docs.example.com')
  await dialog.getByRole('button', { name: /crear/i }).click()
  await expect(dialog).not.toBeVisible()

  await expect(page.getByRole('link', { name: 'Docs' })).toBeVisible()

  await waitForPersistedConfig(accountApi, (config) =>
    config.shortcuts.some((shortcut) => shortcut.label === 'Docs'),
  )
  await page.reload()
  await expect(page.getByRole('link', { name: 'Docs' })).toBeVisible()
})

test('removes a shortcut and keeps it removed after reload', async ({ page, accountApi }) => {
  await openCardMenu(page, 'Gmail')
  await page.getByRole('menuitem', { name: 'Eliminar' }).click()
  const confirm = page.getByRole('dialog', { name: 'Eliminar acceso directo' })
  await confirm.getByRole('button', { name: 'Eliminar' }).click()
  await expect(confirm).not.toBeVisible()

  await expect(page.getByRole('link', { name: 'Gmail' })).toHaveCount(0)

  await waitForPersistedConfig(accountApi, (config) =>
    config.shortcuts.every((shortcut) => shortcut.label !== 'Gmail'),
  )
  await page.reload()
  await expect(page.getByRole('link', { name: 'GitHub' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Gmail' })).toHaveCount(0)
})

test('edits a shortcut label and keeps the change after reload', async ({ page, accountApi }) => {
  await openCardMenu(page, 'Gmail')
  await page.getByRole('menuitem', { name: 'Editar' }).click()

  const dialog = page.getByRole('dialog', { name: 'Editar acceso directo' })
  await dialog.getByRole('textbox', { name: /nombre/i }).fill('Correo')
  await dialog.getByRole('button', { name: /guardar/i }).click()
  await expect(dialog).not.toBeVisible()

  await expect(page.getByRole('link', { name: 'Correo' })).toBeVisible()

  await waitForPersistedConfig(accountApi, (config) =>
    config.shortcuts.some((shortcut) => shortcut.label === 'Correo'),
  )
  await page.reload()
  await expect(page.getByRole('link', { name: 'Correo' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Gmail' })).toHaveCount(0)
})

test('filters shortcuts by category', async ({ page }) => {
  // A second category with its own shortcut, so filtering has something to
  // actually hide — the default seed ships a single "General" category.
  await page.getByRole('button', { name: 'Añadir categoría' }).click()
  const categoryDialog = page.getByRole('dialog', { name: 'Añadir categoría' })
  await categoryDialog.getByRole('textbox', { name: /nombre/i }).fill('Trabajo')
  await categoryDialog.getByRole('button', { name: 'Crear categoría' }).click()
  await expect(categoryDialog).not.toBeVisible()

  await page.getByRole('button', { name: 'Añadir acceso directo' }).click()
  const shortcutDialog = page.getByRole('dialog', { name: 'Añadir acceso directo' })
  await shortcutDialog.getByRole('textbox', { name: /nombre/i }).fill('Jira')
  await shortcutDialog.getByRole('textbox', { name: /url/i }).fill('https://jira.example.com')
  await shortcutDialog.getByRole('button', { name: /categoría/i }).click()
  await page.getByRole('option', { name: 'Trabajo' }).click()
  await shortcutDialog.getByRole('button', { name: /crear/i }).click()
  await expect(shortcutDialog).not.toBeVisible()

  await page.getByRole('button', { name: 'General', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Gmail' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Jira' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Trabajo', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Jira' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Gmail' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Todas', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Gmail' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Jira' })).toBeVisible()
})

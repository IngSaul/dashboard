import { expect, test } from '@playwright/test'

/**
 * Real pointer-drag coverage for the shortcuts drag & drop reorder
 * feature — jsdom (used by the Vitest integration tests) has no layout
 * engine, so collision detection there needs manually-stubbed rects; here
 * Chromium/Firefox/WebKit lay out the grid for real, so a genuine mouse
 * drag exercises `@dnd-kit`'s pointer sensor + collision detection exactly
 * as a user would trigger it.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
})

test('dragging a shortcut reorders it within its category and the order survives a reload', async ({ page }) => {
  // "Todas" has no independent order of its own — switch to a specific
  // category ("General", the default seed data) to reorder it directly.
  await page.getByRole('button', { name: 'General', exact: true }).click()

  const gmailCard = page.locator('.shortcut-card').filter({ has: page.getByRole('link', { name: 'Gmail', exact: true }) })
  const calendarCard = page
    .locator('.shortcut-card')
    .filter({ has: page.getByRole('link', { name: 'Calendario', exact: true }) })

  await expect(gmailCard).toBeVisible()
  await expect(calendarCard).toBeVisible()

  const gmailBox = await gmailCard.boundingBox()
  const calendarBox = await calendarCard.boundingBox()
  if (!gmailBox || !calendarBox) {
    throw new Error('shortcut card bounding box unavailable')
  }

  await page.mouse.move(gmailBox.x + gmailBox.width / 2, gmailBox.y + gmailBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(calendarBox.x + calendarBox.width / 2, calendarBox.y + calendarBox.height / 2, {
    steps: 10,
  })
  await page.mouse.move(calendarBox.x + calendarBox.width / 2 + 8, calendarBox.y + calendarBox.height / 2 + 8, {
    steps: 5,
  })
  await page.mouse.up()

  async function labelOrder(): Promise<string[]> {
    return page.locator('.shortcuts-widget__grid .shortcut-card .shortcut-card__label').allTextContents()
  }

  await expect(async () => {
    // `.shortcut-card__label` briefly matches more than 4 nodes while
    // dnd-kit's drop animation settles — require a stable count too, so the
    // retry doesn't accept a still-transitioning DOM snapshot.
    const order = await labelOrder()
    expect(order).toHaveLength(4)
    expect(order.indexOf('Calendario')).toBeLessThan(order.indexOf('Gmail'))
  }).toPass()

  const orderBeforeReload = await labelOrder()

  await page.reload()
  await page.getByRole('button', { name: 'General', exact: true }).click()
  await expect(gmailCard).toBeVisible()

  const orderAfterReload = await labelOrder()
  expect(orderAfterReload).toEqual(orderBeforeReload)
})

test('keeps the dragged overlay tracking the pointer, not offset by an ancestor blur/backdrop-filter', async ({
  page,
}) => {
  // Every widget renders inside a `.glass-panel` with `backdrop-filter`,
  // which establishes its own containing block for `position: fixed`
  // descendants — a regression here reproduces as the overlay jumping
  // hundreds of pixels away from the cursor instead of following it.
  await page.getByRole('button', { name: 'General', exact: true }).click()
  const gmailCard = page.locator('.shortcut-card').filter({ has: page.getByRole('link', { name: 'Gmail', exact: true }) })
  const gmailBox = await gmailCard.boundingBox()
  if (!gmailBox) {
    throw new Error('gmail card bounding box unavailable')
  }

  const startX = gmailBox.x + gmailBox.width / 2
  const startY = gmailBox.y + gmailBox.height / 2
  const pointerX = startX + 12
  const pointerY = startY + 60

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  // Past the 4px mouse-sensor activation distance, so the overlay mounts.
  await page.mouse.move(pointerX, pointerY, { steps: 10 })

  const overlay = page.locator('.shortcut-card--dragging')
  await expect(overlay).toBeVisible()
  const overlayBox = await overlay.boundingBox()
  await page.mouse.up()

  if (!overlayBox) {
    throw new Error('drag overlay bounding box unavailable')
  }
  const overlayCenterX = overlayBox.x + overlayBox.width / 2
  const overlayCenterY = overlayBox.y + overlayBox.height / 2
  // A broken containing block offsets the overlay by hundreds of pixels —
  // a generous 40px tolerance still catches that class of bug without being
  // sensitive to exactly where within the card the drag started.
  expect(Math.abs(overlayCenterX - pointerX)).toBeLessThan(40)
  expect(Math.abs(overlayCenterY - pointerY)).toBeLessThan(40)
})

test('dragging a shortcut onto a card from a different category only reorders it globally — it keeps its own category, and that persists', async ({
  page,
}) => {
  // The default seed only has one category ("General") — create a second
  // one with its own shortcut so there's something to drag across, exactly
  // as a real user would.
  await page.getByRole('button', { name: 'Añadir categoría' }).click()
  const addCategoryDialog = page.getByRole('dialog', { name: 'Añadir categoría' })
  await addCategoryDialog.getByRole('textbox', { name: /nombre/i }).fill('Trabajo')
  await addCategoryDialog.getByRole('button', { name: 'Crear categoría' }).click()
  await expect(addCategoryDialog).not.toBeVisible()

  // Creating a category auto-selects it — add its shortcut here.
  await page.getByRole('button', { name: 'Añadir acceso directo' }).click()
  const addShortcutDialog = page.getByRole('dialog', { name: 'Añadir acceso directo' })
  await addShortcutDialog.getByRole('textbox', { name: /nombre/i }).fill('Jira')
  await addShortcutDialog.getByRole('textbox', { name: /url/i }).fill('https://jira.example.com')
  await addShortcutDialog.getByRole('button', { name: /categoría/i }).click()
  await page.getByRole('option', { name: 'Trabajo' }).click()
  await addShortcutDialog.getByRole('button', { name: /crear/i }).click()
  await expect(addShortcutDialog).not.toBeVisible()

  // "Todas" shows both categories' cards together, so "Gmail" (General) can
  // be dropped directly onto "Jira" (Trabajo).
  await page.getByRole('button', { name: 'Todas', exact: true }).click()
  const gmailCard = page.locator('.shortcut-card').filter({ has: page.getByRole('link', { name: 'Gmail', exact: true }) })
  const jiraCard = page.locator('.shortcut-card').filter({ has: page.getByRole('link', { name: 'Jira', exact: true }) })
  await expect(gmailCard).toBeVisible()
  await expect(jiraCard).toBeVisible()

  const gmailBox = await gmailCard.boundingBox()
  const jiraBox = await jiraCard.boundingBox()
  if (!gmailBox || !jiraBox) {
    throw new Error('shortcut card bounding box unavailable')
  }

  await page.mouse.move(gmailBox.x + gmailBox.width / 2, gmailBox.y + gmailBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(jiraBox.x + jiraBox.width / 2, jiraBox.y + jiraBox.height / 2, { steps: 10 })
  await page.mouse.move(jiraBox.x + jiraBox.width / 2 + 8, jiraBox.y + jiraBox.height / 2 + 8, { steps: 5 })
  await page.mouse.up()

  async function gmailIsInTrabajo(): Promise<boolean> {
    await page.getByRole('button', { name: 'Trabajo', exact: true }).click()
    const visible = await page.getByRole('link', { name: 'Gmail', exact: true }).isVisible()
    await page.getByRole('button', { name: 'Todas', exact: true }).click()
    return visible
  }

  async function gmailIsInGeneral(): Promise<boolean> {
    await page.getByRole('button', { name: 'General', exact: true }).click()
    const visible = await page.getByRole('link', { name: 'Gmail', exact: true }).isVisible()
    await page.getByRole('button', { name: 'Todas', exact: true }).click()
    return visible
  }

  // Dropping "Gmail" (General) beside "Jira" (Trabajo) only reorders it in
  // the single global order — it must never adopt "Trabajo" as its category.
  await expect(async () => {
    expect(await gmailIsInTrabajo()).toBe(false)
    expect(await gmailIsInGeneral()).toBe(true)
  }).toPass()

  await page.reload()
  expect(await gmailIsInTrabajo()).toBe(false)
  expect(await gmailIsInGeneral()).toBe(true)
})

import { test, expect } from "@playwright/test";

test.describe("ScratchPad Notes", () => {
  test("can add a note and see it in the list", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("ScratchPad")).toBeVisible();

    // Add a note
    const input = page.getByTestId("quick-add-input");
    await input.fill("My first test note");
    await page.getByTestId("quick-add-button").click();

    // Should appear in the list
    await expect(page.getByText("My first test note")).toBeVisible();
  });

  test("can add a note with a URL and see the link chip", async ({ page }) => {
    await page.goto("/");
    const input = page.getByTestId("quick-add-input");
    await input.fill("Check out https://example.com for more info");
    await page.getByTestId("quick-add-button").click();

    // URL chips render as buttons (not links) in the note card
    await expect(page.locator("button", { hasText: "example.com" })).toBeVisible();
  });

  test("can search notes by text", async ({ page }) => {
    await page.goto("/");
    const input = page.getByTestId("quick-add-input");

    // Add two notes
    await input.fill("Buy groceries");
    await page.getByTestId("quick-add-button").click();
    await input.fill("Read a book about TypeScript");
    await page.getByTestId("quick-add-button").click();

    // Click search chip to expand search input
    const searchChip = page.getByTestId("search-chip");
    await searchChip.click();

    // Type in expanded search input
    const searchInput = page.getByTestId("search-chip-input");
    await searchInput.fill("grocer");

    // Only matching note visible
    await expect(page.getByText("Buy groceries")).toBeVisible();
    await expect(page.getByText("Read a book")).not.toBeVisible();
  });

  test("can click a note to view detail and go back", async ({ page }) => {
    await page.goto("/");
    const input = page.getByTestId("quick-add-input");
    await input.fill("Detail test note");
    await page.getByTestId("quick-add-button").click();

    // Click the note
    await page.getByText("Detail test note").click();

    // Detail page defaults to textarea editor (not markdown view)
    await expect(page.getByTestId("note-editor")).toBeVisible();
    await expect(page.getByTestId("markdown-view")).not.toBeVisible();

    // Go back
    await page.getByTestId("back-button").click();
    await expect(page.getByTestId("quick-add-input")).toBeVisible();
  });

  test("can edit a note from the detail page", async ({ page }) => {
    await page.goto("/");
    const input = page.getByTestId("quick-add-input");
    await input.fill("Original content");
    await page.getByTestId("quick-add-button").click();

    await page.getByText("Original content").click();

    // Detail page defaults to editor mode — no toggle needed
    const editor = page.getByTestId("note-editor");
    await expect(editor).toBeVisible();
    await editor.clear();
    await editor.fill("Updated content");

    // Auto-save is debounced (1s) + save-on-unmount via back button
    await page.waitForTimeout(1200);
    await page.getByTestId("back-button").click();

    // Back on the list with updated content
    await expect(page.getByText("Updated content")).toBeVisible();
  });

  test("can archive a note and unarchive it from archive view", async ({ page }) => {
    await page.goto("/");
    // Add a note
    const input = page.getByTestId("quick-add-input");
    await input.fill("Archive test note");
    await page.getByTestId("quick-add-button").click();
    // Right-click the note to open context menu, then archive
    await page.getByText("Archive test note").click({ button: "right" });
    await page.getByText("Archivar").click();
    // Note should be gone from main list
    await expect(page.getByText("Archive test note")).not.toBeVisible();
    // Go to archive
    await page.getByTestId("archive-nav-button").click();
    // Note should be in archive
    await expect(page.getByText("Archive test note")).toBeVisible();
    // Unarchive it
    await page.locator('[data-testid^="unarchive-button-"]').first().click();
    // Go back to main view
    await page.getByTestId("archive-back-button").click();
    // Note should be back in main list
    await expect(page.getByText("Archive test note")).toBeVisible();
  });

  test("can add a label to a note via context menu", async ({ page }) => {
    await page.goto("/");
    const input = page.getByTestId("quick-add-input");
    await input.fill("Label test note");
    await page.getByTestId("quick-add-button").click();
    
    // Right-click the note to open context menu
    await page.getByText("Label test note").click({ button: "right" });
    await page.getByText("Agregar etiqueta").click();
    
    // Type a label in the popup input and press Enter
    const labelInput = page.locator('[data-testid^="swipe-label-input-"]');
    await labelInput.fill("trabajo");
    await labelInput.press("Enter");
    
    // Label should appear as chip on the note card
    const noteCard = page.locator('[data-testid^="note-card-"]');
    await expect(noteCard.getByText("trabajo")).toBeVisible();
  });

  test("can convert a note to checklist and toggle items", async ({ page }) => {
    await page.goto("/");
    const input = page.getByTestId("quick-add-input");
    await input.fill("Shopping list");
    await page.getByTestId("quick-add-button").click();

    // Open note detail to add multiline content via the textarea editor
    await page.getByText("Shopping list").click();
    const editor = page.getByTestId("note-editor");
    await editor.clear();
    await editor.fill("Buy milk\nBuy eggs\nBuy bread");
    await page.waitForTimeout(1200);
    await page.getByTestId("back-button").click();

    // Right-click to convert to checklist
    await page.getByText("Buy milk").click({ button: "right" });
    await page.getByText("Hacer lista").click();

    // Should see checklist badge on card
    await expect(page.getByTestId("checklist-badge")).toBeVisible();
    await expect(page.getByText("0/3 ✓")).toBeVisible();

    // Click note to see checklist detail
    await page.getByText("Buy milk").click();

    // Should see checklist view
    await expect(page.getByTestId("checklist-view")).toBeVisible();

    // Toggle first item
    await page.getByTestId("checklist-item-0").click();

    // Go back
    await page.getByTestId("back-button").click();

    // Badge should update
    await expect(page.getByText("1/3 ✓")).toBeVisible();
  });

  test("can search in archive page", async ({ page }) => {
    await page.goto("/");
    const input = page.getByTestId("quick-add-input");

    // Add two notes
    await input.fill("Archived groceries note");
    await page.getByTestId("quick-add-button").click();
    await input.fill("Archived work note");
    await page.getByTestId("quick-add-button").click();

    // Archive first note via context menu
    await page.getByText("Archived groceries note").click({ button: "right" });
    await page.getByText("Archivar").click();
    await expect(page.getByText("Archived groceries note")).not.toBeVisible();

    // Archive second note
    await page.getByText("Archived work note").click({ button: "right" });
    await page.getByText("Archivar").click();
    await expect(page.getByText("Archived work note")).not.toBeVisible();

    // Go to archive
    await page.getByTestId("archive-nav-button").click();

    // Both should be visible
    await expect(page.getByText("Archived groceries note")).toBeVisible();
    await expect(page.getByText("Archived work note")).toBeVisible();

    // Search for "groceries"
    const searchInput = page.getByTestId("archive-search-input");
    await searchInput.fill("groceries");

    // Only matching note visible
    await expect(page.getByText("Archived groceries note")).toBeVisible();
    await expect(page.getByText("Archived work note")).not.toBeVisible();
  });
});

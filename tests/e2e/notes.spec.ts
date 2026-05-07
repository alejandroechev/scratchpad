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

    // Should see rendered markdown view (not editor textarea)
    await expect(page.getByTestId("markdown-view")).toBeVisible();
    await expect(page.getByTestId("note-editor")).not.toBeVisible();

    // Note content should be rendered in the markdown view
    await expect(page.getByTestId("markdown-view")).toContainText("Detail test note");

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

    // Should be in view mode initially
    await expect(page.getByTestId("markdown-view")).toBeVisible();
    await expect(page.getByTestId("note-editor")).not.toBeVisible();

    // Switch to edit mode via toggle button
    await page.getByTestId("toggle-mode-button").click();

    // Now editor should be visible
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

  test("can create and toggle a markdown checklist", async ({ page }) => {
    await page.goto("/");
    const input = page.getByTestId("quick-add-input");

    // Create a simple note first
    await input.fill("Checklist note");
    await page.getByTestId("quick-add-button").click();

    // Open note detail
    await page.getByText("Checklist note").click();

    // Switch to edit mode
    await page.getByTestId("toggle-mode-button").click();

    // Fill with checklist content
    const editor = page.getByTestId("note-editor");
    await editor.clear();
    await editor.fill("- [ ] Buy milk\n- [ ] Buy eggs\n- [x] Buy bread");

    // Wait for auto-save
    await page.waitForTimeout(1200);

    // Go back to list
    await page.getByTestId("back-button").click();

    // Should see checklist badge showing "1/3 ✓"
    await expect(page.getByTestId("checklist-badge")).toContainText("1/3");

    // Open note again — should be in markdown view with checkboxes
    await page.getByText("Buy milk").click();
    await expect(page.getByTestId("markdown-view")).toBeVisible();

    // Checkboxes should be rendered
    const checkboxes = page.getByTestId("markdown-view").locator('input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(3);

    // Toggle the first checkbox (unchecked → checked)
    await checkboxes.first().click();

    // Wait for auto-save
    await page.waitForTimeout(1200);

    // Go back
    await page.getByTestId("back-button").click();

    // Badge should now show 2/3
    await expect(page.getByTestId("checklist-badge")).toContainText("2/3");
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

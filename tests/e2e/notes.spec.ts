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

    await expect(page.getByRole("link", { name: "example.com" })).toBeVisible();
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

    // Should see detail page
    await expect(page.getByTestId("note-editor")).toBeVisible();
    await expect(page.getByTestId("note-editor")).toHaveValue("Detail test note");

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

    const editor = page.getByTestId("note-editor");
    await editor.clear();
    await editor.fill("Updated content");
    await page.getByTestId("save-button").click();

    // Back on the list with updated content
    await expect(page.getByText("Updated content")).toBeVisible();
  });

  test("can archive a note and unarchive it from archive view", async ({ page }) => {
    await page.goto("/");
    // Add a note
    const input = page.getByTestId("quick-add-input");
    await input.fill("Archive test note");
    await page.getByTestId("quick-add-button").click();
    // Click note to open detail
    await page.getByText("Archive test note").click();
    // Archive it
    await page.getByTestId("archive-button").click();
    // Note should be gone from main list
    await expect(page.getByText("Archive test note")).not.toBeVisible();
    // Go to archive
    await page.getByTestId("archive-nav-button").click();
    // Note should be in archive
    await expect(page.getByText("Archive test note")).toBeVisible();
    // Unarchive it - using a more specific selector
    await page.locator('[data-testid^="unarchive-button-"]').first().click();
    // Go back to main view
    await page.getByTestId("archive-back-button").click();
    // Note should be back in main list
    await expect(page.getByText("Archive test note")).toBeVisible();
  });

  test("can add and remove labels on a note", async ({ page }) => {
    await page.goto("/");
    const input = page.getByTestId("quick-add-input");
    await input.fill("Label test note");
    await page.getByTestId("quick-add-button").click();
    
    // Click note to open detail
    await page.getByText("Label test note").click();
    
    // Add a label
    const labelInput = page.getByTestId("add-label-input");
    await labelInput.fill("trabajo");
    await labelInput.press("Enter");
    
    // Label should appear as chip
    await expect(page.getByText("trabajo")).toBeVisible();
    
    // Add another label
    await labelInput.fill("urgente");
    await labelInput.press("Enter");
    await expect(page.getByText("urgente")).toBeVisible();
    
    // Remove a label
    await page.getByTestId("remove-label-trabajo").click();
    await page.waitForTimeout(100); // Wait for async operation
    await expect(page.getByText("trabajo")).not.toBeVisible();
    await expect(page.getByText("urgente")).toBeVisible();
    
    // Go back and verify label shows on card
    await page.getByTestId("back-button").click();
    
    // Should see the remaining label chip on the note card
    await expect(page.getByText("urgente")).toBeVisible();
  });
});

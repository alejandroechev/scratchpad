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

    // Search
    const search = page.getByTestId("search-input");
    await search.fill("grocer");

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
});

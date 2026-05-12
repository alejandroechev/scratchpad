import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarkdownRenderer } from "../../src/ui/components/MarkdownRenderer";

describe("MarkdownRenderer", () => {
  it("renders plain text", () => {
    render(<MarkdownRenderer content="Hello world" mode="full" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders headings", { timeout: 15000 }, () => {
    render(<MarkdownRenderer content="# Main Title" mode="full" />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Main Title");
  });

  it("renders checkboxes (checked and unchecked)", () => {
    const content = "- [ ] unchecked\n- [x] checked";
    render(<MarkdownRenderer content={content} mode="full" />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).toBeChecked();
  });

  it("in full mode, checkbox click calls onCheckboxToggle with correct index", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const content = "- [ ] first\n- [x] second\n- [ ] third";
    render(
      <MarkdownRenderer content={content} mode="full" onCheckboxToggle={onToggle} />
    );
    const checkboxes = screen.getAllByRole("checkbox");

    await user.click(checkboxes[0]);
    expect(onToggle).toHaveBeenCalledWith(0);

    await user.click(checkboxes[2]);
    expect(onToggle).toHaveBeenCalledWith(2);
  });

  it("in truncate mode, checkboxes are not clickable", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const content = "- [ ] task one\n- [x] task two";
    render(
      <MarkdownRenderer content={content} mode="truncate" onCheckboxToggle={onToggle} />
    );
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toBeDisabled();
    expect(checkboxes[1]).toBeDisabled();

    await user.click(checkboxes[0]).catch(() => {});
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("renders links with target _blank", () => {
    render(
      <MarkdownRenderer content="Visit [Google](https://google.com)" mode="full" />
    );
    const link = screen.getByRole("link", { name: "Google" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://google.com");
    expect(link).toHaveAttribute("target", "_blank");
  });
});

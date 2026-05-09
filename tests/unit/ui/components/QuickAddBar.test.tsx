import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuickAddBar } from "../../../../src/ui/components/QuickAddBar";

function renderBar(overrides = {}) {
  const props = {
    onAddNote: vi.fn(),
    onAddList: vi.fn(),
    onAddFromCamera: vi.fn(),
    onAddFromGallery: vi.fn(),
    ...overrides,
  };
  render(<QuickAddBar {...props} />);
  return props;
}

describe("QuickAddBar", () => {
  it("renders all 4 buttons with correct labels", () => {
    renderBar();
    expect(screen.getByText("Nota")).toBeInTheDocument();
    expect(screen.getByText("Lista")).toBeInTheDocument();
    expect(screen.getByText("Cámara")).toBeInTheDocument();
    expect(screen.getByText("Foto")).toBeInTheDocument();
  });

  it("does not render a text input", () => {
    renderBar();
    expect(screen.queryByTestId("quick-add-input")).not.toBeInTheDocument();
  });

  it("calls onAddNote when Nota button is clicked", () => {
    const props = renderBar();
    fireEvent.click(screen.getByTestId("quick-add-note"));
    expect(props.onAddNote).toHaveBeenCalledOnce();
  });

  it("calls onAddList when Lista button is clicked", () => {
    const props = renderBar();
    fireEvent.click(screen.getByTestId("quick-add-list"));
    expect(props.onAddList).toHaveBeenCalledOnce();
  });

  it("calls onAddFromCamera when a file is selected via camera input", () => {
    const props = renderBar();
    const input = screen.getByTestId("quick-add-camera-input") as HTMLInputElement;
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(props.onAddFromCamera).toHaveBeenCalledWith(file);
  });

  it("calls onAddFromGallery when a file is selected via gallery input", () => {
    const props = renderBar();
    const input = screen.getByTestId("quick-add-gallery-input") as HTMLInputElement;
    const file = new File(["img"], "gallery.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(props.onAddFromGallery).toHaveBeenCalledWith(file);
  });
});

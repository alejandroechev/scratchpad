import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ImageViewerOverlay } from "../../src/ui/components/ImageViewerOverlay";

vi.mock("../../src/infra/automerge/blob-sync", () => ({
  getBlobUrl: vi.fn().mockResolvedValue("blob:http://localhost/fake-url"),
}));

describe("ImageViewerOverlay", () => {
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onClose = vi.fn();
  });

  it("renders the overlay backdrop", () => {
    render(<ImageViewerOverlay blobId="abc123" onClose={onClose} />);
    expect(screen.getByTestId("image-viewer-overlay")).toBeTruthy();
  });

  it("renders the close button", () => {
    render(<ImageViewerOverlay blobId="abc123" onClose={onClose} />);
    expect(screen.getByTestId("image-viewer-close")).toBeTruthy();
  });

  it("calls onClose when close button is clicked", () => {
    render(<ImageViewerOverlay blobId="abc123" onClose={onClose} />);
    fireEvent.click(screen.getByTestId("image-viewer-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    render(<ImageViewerOverlay blobId="abc123" onClose={onClose} />);
    fireEvent.click(screen.getByTestId("image-viewer-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders image after blob URL resolves", async () => {
    render(<ImageViewerOverlay blobId="abc123" onClose={onClose} />);
    const img = await screen.findByTestId("image-viewer-img");
    expect(img).toBeTruthy();
    expect((img as HTMLImageElement).src).toContain("blob:");
  });

  it("does not call onClose when image is clicked", async () => {
    render(<ImageViewerOverlay blobId="abc123" onClose={onClose} />);
    const img = await screen.findByTestId("image-viewer-img");
    fireEvent.click(img);
    expect(onClose).not.toHaveBeenCalled();
  });
});

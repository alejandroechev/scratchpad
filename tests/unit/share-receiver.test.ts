import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks for dynamic imports used by share-receiver
const mockCreateNote = vi.fn();
const mockAddImage = vi.fn();
const mockStoreImageBlob = vi.fn();
const mockReadFile = vi.fn();
const mockPopIntentQueue = vi.fn();
const mockListen = vi.fn();

vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}));

vi.mock("tauri-plugin-mobile-sharetarget-api", () => ({
  popIntentQueue: () => mockPopIntentQueue(),
}));

vi.mock("../../src/infra/store-provider.js", () => ({
  createNote: (...args: unknown[]) => mockCreateNote(...args),
  addImage: (...args: unknown[]) => mockAddImage(...args),
  storeImageBlob: (...args: unknown[]) => mockStoreImageBlob(...args),
}));

// Import the module under test AFTER mocks are set up
import { initShareReceiver } from "../../src/infra/share-receiver.js";

describe("share-receiver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(vi.fn());
  });

  describe("text intent handling", () => {
    it("creates a note with shared text content", async () => {
      const sharedText = "Check out this article!";
      mockPopIntentQueue
        .mockResolvedValueOnce(sharedText)
        .mockResolvedValueOnce(null);
      mockCreateNote.mockResolvedValue({ id: "n1", content: sharedText });

      await initShareReceiver();

      expect(mockCreateNote).toHaveBeenCalledWith(sharedText);
    });

    it("creates a note when a URL is shared", async () => {
      const sharedUrl = "https://example.com/article";
      mockPopIntentQueue
        .mockResolvedValueOnce(sharedUrl)
        .mockResolvedValueOnce(null);
      mockCreateNote.mockResolvedValue({ id: "n2", content: sharedUrl });

      await initShareReceiver();

      expect(mockCreateNote).toHaveBeenCalledWith(sharedUrl);
    });

    it("handles multiple text intents in sequence", async () => {
      mockPopIntentQueue
        .mockResolvedValueOnce("first note")
        .mockResolvedValueOnce("second note")
        .mockResolvedValueOnce(null);
      mockCreateNote.mockResolvedValue({ id: "n1", content: "" });

      await initShareReceiver();

      expect(mockCreateNote).toHaveBeenCalledTimes(2);
      expect(mockCreateNote).toHaveBeenCalledWith("first note");
      expect(mockCreateNote).toHaveBeenCalledWith("second note");
    });
  });

  describe("image intent handling", () => {
    it("creates a note with image when content:// URI is shared", async () => {
      const contentUri = "content://media/external/images/1234";
      const fakeBytes = new Uint8Array([0xff, 0xd8, 0xff]);
      mockPopIntentQueue
        .mockResolvedValueOnce(contentUri)
        .mockResolvedValueOnce(null);
      mockReadFile.mockResolvedValue(fakeBytes);
      mockStoreImageBlob.mockResolvedValue({
        blobId: "blob1",
        sizeBytes: 3,
      });
      mockCreateNote.mockResolvedValue({ id: "img-note", content: "" });
      mockAddImage.mockResolvedValue({
        id: "img-note",
        content: "",
        images: [],
      });

      await initShareReceiver();

      expect(mockReadFile).toHaveBeenCalledWith(contentUri);
      expect(mockStoreImageBlob).toHaveBeenCalledTimes(1);
      expect(mockCreateNote).toHaveBeenCalledWith("");
      expect(mockAddImage).toHaveBeenCalledWith("img-note", expect.objectContaining({
        blobId: "blob1",
        fileName: "shared-image.jpg",
        sizeBytes: 3,
      }));
    });

    it("creates a note with image when file:// URI is shared", async () => {
      const fileUri = "file:///sdcard/photo.jpg";
      const fakeBytes = new Uint8Array([0x89, 0x50]);
      mockPopIntentQueue
        .mockResolvedValueOnce(fileUri)
        .mockResolvedValueOnce(null);
      mockReadFile.mockResolvedValue(fakeBytes);
      mockStoreImageBlob.mockResolvedValue({
        blobId: "blob2",
        sizeBytes: 2,
      });
      mockCreateNote.mockResolvedValue({ id: "file-note", content: "" });
      mockAddImage.mockResolvedValue({
        id: "file-note",
        content: "",
        images: [],
      });

      await initShareReceiver();

      expect(mockReadFile).toHaveBeenCalledWith(fileUri);
      expect(mockCreateNote).toHaveBeenCalledWith("");
      expect(mockAddImage).toHaveBeenCalledWith("file-note", expect.objectContaining({
        blobId: "blob2",
      }));
    });
  });

  describe("mixed intents", () => {
    it("handles text and image intents in the same queue", async () => {
      const textContent = "Some shared text";
      const imageUri = "content://media/photo/5678";
      const fakeBytes = new Uint8Array([0xff]);

      mockPopIntentQueue
        .mockResolvedValueOnce(textContent)
        .mockResolvedValueOnce(imageUri)
        .mockResolvedValueOnce(null);
      mockReadFile.mockResolvedValue(fakeBytes);
      mockStoreImageBlob.mockResolvedValue({ blobId: "b1", sizeBytes: 1 });
      mockCreateNote
        .mockResolvedValueOnce({ id: "text-n", content: textContent })
        .mockResolvedValueOnce({ id: "img-n", content: "" });
      mockAddImage.mockResolvedValue({ id: "img-n", content: "", images: [] });

      await initShareReceiver();

      // Text intent: createNote with text content
      expect(mockCreateNote).toHaveBeenCalledWith(textContent);
      // Image intent: createNote with empty content, then addImage
      expect(mockCreateNote).toHaveBeenCalledWith("");
      expect(mockAddImage).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling", () => {
    it("continues processing queue when one intent fails", async () => {
      mockPopIntentQueue
        .mockResolvedValueOnce("content://bad/uri")
        .mockResolvedValueOnce("good text")
        .mockResolvedValueOnce(null);
      mockReadFile.mockRejectedValue(new Error("File not found"));
      mockCreateNote.mockResolvedValue({ id: "n1", content: "good text" });

      await initShareReceiver();

      // First intent (image) fails, second (text) succeeds
      expect(mockCreateNote).toHaveBeenCalledWith("good text");
    });

    it("does not crash when queue is empty", async () => {
      mockPopIntentQueue.mockResolvedValueOnce(null);

      await expect(initShareReceiver()).resolves.not.toThrow();
    });
  });

  describe("focus listener", () => {
    it("registers tauri://focus listener to drain queue on app resume", async () => {
      mockPopIntentQueue.mockResolvedValueOnce(null);

      await initShareReceiver();

      expect(mockListen).toHaveBeenCalledWith("tauri://focus", expect.any(Function));
    });
  });
});

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
import { initShareReceiver, extractTextFromIntent } from "../../src/infra/share-receiver.js";

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

  describe("extractTextFromIntent", () => {
    it("extracts URL-encoded text from a raw intent string", () => {
      const raw =
        "#Intent;action=android.intent.action.SEND;type=text/plain;S.android.intent.extra.TEXT=https%3A%2F%2Fgithub.com%2Falejandroechev%2Fscratchpad;end";
      expect(extractTextFromIntent(raw)).toBe(
        "https://github.com/alejandroechev/scratchpad"
      );
    });

    it("extracts plain text without encoding", () => {
      const raw =
        "#Intent;action=android.intent.action.SEND;S.android.intent.extra.TEXT=Hello world;end";
      expect(extractTextFromIntent(raw)).toBe("Hello world");
    });

    it("returns null when EXTRA_TEXT is missing from intent", () => {
      const raw = "#Intent;action=android.intent.action.SEND;type=image/jpeg;end";
      expect(extractTextFromIntent(raw)).toBeNull();
    });

    it("returns raw value when decodeURIComponent fails", () => {
      const raw =
        "#Intent;S.android.intent.extra.TEXT=%E0%A4%A;end";
      const result = extractTextFromIntent(raw);
      expect(result).toBe("%E0%A4%A");
    });
  });

  describe("raw intent string handling", () => {
    it("extracts text from raw #Intent; string and creates note", async () => {
      const rawIntent =
        "#Intent;action=android.intent.action.SEND;type=text/plain;S.android.intent.extra.TEXT=https%3A%2F%2Fexample.com;end";
      mockPopIntentQueue
        .mockResolvedValueOnce(rawIntent)
        .mockResolvedValueOnce(null);
      mockCreateNote.mockResolvedValue({ id: "n1", content: "" });

      await initShareReceiver();

      expect(mockCreateNote).toHaveBeenCalledWith("https://example.com");
    });

    it("warns and skips when raw intent has no EXTRA_TEXT", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const rawIntent =
        "#Intent;action=android.intent.action.SEND;type=image/jpeg;end";
      mockPopIntentQueue
        .mockResolvedValueOnce(rawIntent)
        .mockResolvedValueOnce(null);

      await initShareReceiver();

      expect(mockCreateNote).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Intent sin texto"),
        expect.any(String)
      );
      warnSpy.mockRestore();
    });

    it("plain text still routes to text handler", async () => {
      mockPopIntentQueue
        .mockResolvedValueOnce("just some plain text")
        .mockResolvedValueOnce(null);
      mockCreateNote.mockResolvedValue({ id: "n1", content: "" });

      await initShareReceiver();

      expect(mockCreateNote).toHaveBeenCalledWith("just some plain text");
    });

    it("content:// URI still routes to image handler", async () => {
      const uri = "content://media/external/images/999";
      const fakeBytes = new Uint8Array([0xff]);
      mockPopIntentQueue
        .mockResolvedValueOnce(uri)
        .mockResolvedValueOnce(null);
      mockReadFile.mockResolvedValue(fakeBytes);
      mockStoreImageBlob.mockResolvedValue({ blobId: "b1", sizeBytes: 1 });
      mockCreateNote.mockResolvedValue({ id: "img-n", content: "" });
      mockAddImage.mockResolvedValue({ id: "img-n", content: "", images: [] });

      await initShareReceiver();

      expect(mockReadFile).toHaveBeenCalledWith(uri);
      expect(mockCreateNote).toHaveBeenCalledWith("");
      expect(mockAddImage).toHaveBeenCalledTimes(1);
    });
  });
});

import { describe, it, expect } from "vitest";
import { computeBlobId } from "../../src/infra/automerge/blob-sync";

describe("computeBlobId", () => {
  it("returns a 64-char hex SHA-256 hash", async () => {
    const data = new TextEncoder().encode("hello world").buffer;
    const id = await computeBlobId(data);
    expect(id).toHaveLength(64);
    expect(id).toMatch(/^[0-9a-f]{64}$/);
  });

  it("matches known SHA-256 of 'hello world'", async () => {
    const data = new TextEncoder().encode("hello world").buffer;
    const id = await computeBlobId(data);
    // SHA-256("hello world") = b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9
    expect(id).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
  });

  it("returns different hashes for different data", async () => {
    const data1 = new TextEncoder().encode("hello").buffer;
    const data2 = new TextEncoder().encode("world").buffer;
    const id1 = await computeBlobId(data1);
    const id2 = await computeBlobId(data2);
    expect(id1).not.toBe(id2);
  });

  it("returns the same hash for the same data", async () => {
    const data1 = new TextEncoder().encode("deterministic").buffer;
    const data2 = new TextEncoder().encode("deterministic").buffer;
    const id1 = await computeBlobId(data1);
    const id2 = await computeBlobId(data2);
    expect(id1).toBe(id2);
  });

  it("handles empty input", async () => {
    const data = new ArrayBuffer(0);
    const id = await computeBlobId(data);
    // SHA-256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    expect(id).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
});

import { describe, it } from "node:test";
import assert from "node:assert";

// Simple utility functions for testing
function getFileExtension(filename) {
  if (!filename || typeof filename !== "string") return "";
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function isImageFile(filename) {
  const ext = getFileExtension(filename).toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(ext);
}

function isTextFile(filename) {
  const ext = getFileExtension(filename).toLowerCase();
  const textExts = [
    "txt",
    "md",
    "json",
    "js",
    "ts",
    "tsx",
    "jsx",
    "css",
    "html",
    "xml",
    "py",
    "java",
    "c",
    "cpp",
  ];
  return textExts.includes(ext) || ext === "" ||
    ["readme", "license", "dockerfile"].includes(filename.toLowerCase());
}

describe("Utils", () => {
  describe("getFileExtension", () => {
    it("should extract file extension correctly", () => {
      assert.strictEqual(getFileExtension("test.txt"), "txt");
      assert.strictEqual(getFileExtension("image.jpeg"), "jpeg");
      assert.strictEqual(getFileExtension("document.pdf"), "pdf");
      assert.strictEqual(getFileExtension("script.js"), "js");
    });

    it("should handle files without extensions", () => {
      assert.strictEqual(getFileExtension("README"), "");
      assert.strictEqual(getFileExtension("Dockerfile"), "");
    });

    it("should handle multiple dots in filename", () => {
      assert.strictEqual(getFileExtension("archive.tar.gz"), "gz");
      assert.strictEqual(getFileExtension("config.local.json"), "json");
    });

    it("should handle empty strings and paths", () => {
      assert.strictEqual(getFileExtension(""), "");
      assert.strictEqual(getFileExtension("/path/to/file.txt"), "txt");
    });
  });

  describe("isImageFile", () => {
    it("should identify image files correctly", () => {
      assert.strictEqual(isImageFile("photo.jpg"), true);
      assert.strictEqual(isImageFile("image.png"), true);
      assert.strictEqual(isImageFile("graphic.gif"), true);
      assert.strictEqual(isImageFile("vector.svg"), true);
      assert.strictEqual(isImageFile("bitmap.bmp"), true);
      assert.strictEqual(isImageFile("web.webp"), true);
    });

    it("should handle case insensitive extensions", () => {
      assert.strictEqual(isImageFile("IMAGE.PNG"), true);
      assert.strictEqual(isImageFile("photo.JPEG"), true);
    });

    it("should reject non-image files", () => {
      assert.strictEqual(isImageFile("document.txt"), false);
      assert.strictEqual(isImageFile("script.js"), false);
      assert.strictEqual(isImageFile("data.json"), false);
      assert.strictEqual(isImageFile("README"), false);
    });
  });

  describe("isTextFile", () => {
    it("should identify text files correctly", () => {
      assert.strictEqual(isTextFile("document.txt"), true);
      assert.strictEqual(isTextFile("script.js"), true);
      assert.strictEqual(isTextFile("data.json"), true);
      assert.strictEqual(isTextFile("style.css"), true);
      assert.strictEqual(isTextFile("page.html"), true);
      assert.strictEqual(isTextFile("README.md"), true);
      assert.strictEqual(isTextFile("config.xml"), true);
      assert.strictEqual(isTextFile("script.py"), true);
    });

    it("should handle case insensitive extensions", () => {
      assert.strictEqual(isTextFile("SCRIPT.JS"), true);
      assert.strictEqual(isTextFile("data.JSON"), true);
    });

    it("should reject non-text files", () => {
      assert.strictEqual(isTextFile("image.jpg"), false);
      assert.strictEqual(isTextFile("video.mp4"), false);
      assert.strictEqual(isTextFile("archive.zip"), false);
    });

    it("should handle files without extensions", () => {
      assert.strictEqual(isTextFile("README"), true);
      assert.strictEqual(isTextFile("Dockerfile"), true);
      assert.strictEqual(isTextFile("LICENSE"), true);
    });
  });
});

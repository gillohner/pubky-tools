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

function getFullFilePath(currentFile, filePath) {
  return currentFile?.path || filePath || "";
}

function getFileName(currentFile, filePath, defaultName = "untitled") {
  return currentFile?.name || filePath?.split("/").pop() || defaultName;
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

  describe("getFullFilePath", () => {
    it("should return currentFile.path when available", () => {
      const currentFile = { path: "pubky://user123/pub/documents/test.txt" };
      const filePath = "pubky://user123/pub/backup.txt";
      assert.strictEqual(
        getFullFilePath(currentFile, filePath),
        "pubky://user123/pub/documents/test.txt",
      );
    });

    it("should return filePath when currentFile is null", () => {
      const filePath = "pubky://user123/pub/backup.txt";
      assert.strictEqual(
        getFullFilePath(null, filePath),
        "pubky://user123/pub/backup.txt",
      );
    });

    it("should return filePath when currentFile is undefined", () => {
      const filePath = "pubky://user123/pub/backup.txt";
      assert.strictEqual(
        getFullFilePath(undefined, filePath),
        "pubky://user123/pub/backup.txt",
      );
    });

    it("should return empty string when both currentFile and filePath are missing", () => {
      assert.strictEqual(getFullFilePath(null, null), "");
      assert.strictEqual(getFullFilePath(undefined, undefined), "");
      assert.strictEqual(getFullFilePath(), "");
    });

    it("should prioritize currentFile.path over filePath", () => {
      const currentFile = { path: "pubky://user123/pub/current.txt" };
      const filePath = "pubky://user123/pub/fallback.txt";
      assert.strictEqual(
        getFullFilePath(currentFile, filePath),
        "pubky://user123/pub/current.txt",
      );
    });
  });

  describe("getFileName", () => {
    it("should return currentFile.name when available", () => {
      const currentFile = { name: "test.txt" };
      const filePath = "pubky://user123/pub/documents/backup.txt";
      assert.strictEqual(getFileName(currentFile, filePath), "test.txt");
    });

    it("should extract filename from filePath when currentFile name is not available", () => {
      const filePath = "pubky://user123/pub/documents/backup.txt";
      assert.strictEqual(getFileName(null, filePath), "backup.txt");
      assert.strictEqual(getFileName(undefined, filePath), "backup.txt");
      assert.strictEqual(getFileName({}, filePath), "backup.txt");
    });

    it("should return default name when both currentFile name and filePath are missing", () => {
      assert.strictEqual(getFileName(null, null), "untitled");
      assert.strictEqual(getFileName(undefined, undefined), "untitled");
      assert.strictEqual(getFileName({}, null), "untitled");
    });

    it("should use custom default name", () => {
      assert.strictEqual(
        getFileName(null, null, "new-file.txt"),
        "new-file.txt",
      );
      assert.strictEqual(
        getFileName(undefined, undefined, "custom.md"),
        "custom.md",
      );
    });

    it("should prioritize currentFile.name over filePath", () => {
      const currentFile = { name: "current.txt" };
      const filePath = "pubky://user123/pub/fallback.txt";
      assert.strictEqual(getFileName(currentFile, filePath), "current.txt");
    });

    it("should handle complex file paths", () => {
      const filePath = "pubky://user123/pub/documents/projects/nested/file.js";
      assert.strictEqual(getFileName(null, filePath), "file.js");
    });
  });
});

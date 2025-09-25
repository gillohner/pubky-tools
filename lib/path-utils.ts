/**
 * Utility functions for handling file paths, URLs, and clipboard operations
 * This module provides reusable functions for path manipulation and sharing
 * that can be used across different tools and components.
 */

import { PubkyFile } from "@/types/index";

export interface PathInfo {
  fullPath: string;
  fileName: string;
  parentPath: string;
  isDirectory: boolean;
  extension: string;
}

/**
 * Parse a pubky:// URL or file path and extract components
 */
export function parsePath(path: string): PathInfo {
  const cleanPath = path.trim();
  const isDirectory = cleanPath.endsWith("/");

  // Remove trailing slash for analysis
  const pathForAnalysis = isDirectory ? cleanPath.slice(0, -1) : cleanPath;

  // Extract filename/directory name
  const segments = pathForAnalysis.split("/");
  const fileName = segments[segments.length - 1] || "";

  // Extract parent path
  const parentPath = segments.slice(0, -1).join("/") +
    (segments.length > 1 ? "/" : "");

  // Extract extension
  const extension = isDirectory
    ? ""
    : (fileName.includes(".")
      ? fileName.split(".").pop()?.toLowerCase() || ""
      : "");

  return {
    fullPath: cleanPath,
    fileName,
    parentPath,
    isDirectory,
    extension,
  };
}

/**
 * Get the parent directory from a file path
 */
export function getParentPath(filePath: string): string {
  if (!filePath || !filePath.includes("/")) return filePath;
  const lastSlashIndex = filePath.lastIndexOf("/");
  return filePath.substring(0, lastSlashIndex + 1); // Include trailing slash
}

/**
 * Create a PubkyFile object from a path string
 */
export function createFileFromPath(
  path: string,
  size?: number,
  lastModified?: string,
): PubkyFile {
  const pathInfo = parsePath(path);

  return {
    name: pathInfo.fileName,
    path: pathInfo.fullPath,
    isDirectory: pathInfo.isDirectory,
    size,
    lastModified,
  };
}

/**
 * Check if a file is likely a media file based on its extension
 */
export function isLikelyMediaFile(fileName: string): boolean {
  const mediaExtensions =
    /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|mp4|webm|ogv|avi|mov|mkv|pdf|mp3|wav|flac|ogg|m4a)$/i;
  return mediaExtensions.test(fileName);
}

/**
 * Check if a file is likely a text file based on its extension
 */
export function isLikelyTextFile(fileName: string): boolean {
  const textExtensions =
    /\.(txt|md|json|xml|yaml|yml|html|css|js|ts|jsx|tsx|py|java|c|cpp|h|php|rb|go|rs|sh|sql|csv)$/i;
  return textExtensions.test(fileName) || !fileName.includes(".");
}

/**
 * Copy text to clipboard with fallback for older browsers
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers or non-HTTPS contexts
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const success = document.execCommand("copy");
      document.body.removeChild(textArea);
      return success;
    }
  } catch (err) {
    console.error("Failed to copy text:", err);
    return false;
  }
}

/**
 * Generate a shareable URL for a file or directory
 */
export function generateShareableUrl(
  path: string,
  tool?: "browser" | "editor" | "image",
): string {
  const baseUrl = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}`
    : "";

  const params = new URLSearchParams();

  if (tool) {
    params.set("tool", tool);
  }

  if (path) {
    params.set("path", path);
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Determine the appropriate tool for opening a file
 */
export function getRecommendedTool(
  fileName: string,
): "browser" | "editor" | "image" {
  if (isLikelyMediaFile(fileName)) {
    return "image";
  } else if (isLikelyTextFile(fileName)) {
    return "editor";
  } else {
    return "browser";
  }
}

/**
 * Normalize a pubky:// URL to ensure it's properly formatted
 */
export function normalizePubkyUrl(url: string): string {
  if (!url) return url;

  // Ensure it starts with pubky://
  if (!url.startsWith("pubky://")) {
    return url;
  }

  // Remove duplicate slashes (except after the protocol)
  return url.replace(/([^:]\/)\/+/g, "$1");
}

/**
 * Extract public key from a pubky:// URL
 */
export function extractPublicKey(pubkyUrl: string): string | null {
  const match = pubkyUrl.match(/^pubky:\/\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * Check if a path belongs to a specific public key
 */
export function isOwnPath(userPublicKey: string, filePath: string): boolean {
  const pathPublicKey = extractPublicKey(filePath);
  return pathPublicKey === userPublicKey;
}

/**
 * Get a human-readable description of a file type
 */
export function getFileTypeDescription(fileName: string): string {
  const extension = fileName.includes(".")
    ? fileName.split(".").pop()?.toLowerCase()
    : "";

  const typeMap: { [key: string]: string } = {
    // Images
    jpg: "JPEG Image",
    jpeg: "JPEG Image",
    png: "PNG Image",
    gif: "GIF Image",
    webp: "WebP Image",
    svg: "SVG Image",
    bmp: "Bitmap Image",

    // Videos
    mp4: "MP4 Video",
    webm: "WebM Video",
    avi: "AVI Video",
    mov: "QuickTime Video",

    // Audio
    mp3: "MP3 Audio",
    wav: "WAV Audio",
    flac: "FLAC Audio",
    ogg: "OGG Audio",

    // Documents
    pdf: "PDF Document",
    doc: "Word Document",
    docx: "Word Document",
    txt: "Text File",
    md: "Markdown File",

    // Code
    js: "JavaScript File",
    ts: "TypeScript File",
    html: "HTML File",
    css: "CSS File",
    json: "JSON File",
    xml: "XML File",

    // Archives
    zip: "ZIP Archive",
    rar: "RAR Archive",
    "7z": "7-Zip Archive",
  };

  return typeMap[extension || ""] ||
    (extension ? `${extension.toUpperCase()} File` : "File");
}

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  const sizes = ["Bytes", "KB", "MB", "GB"];
  if (bytes === 0) return "0 Bytes";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
}

export function getFileExtension(fileName: string): string {
  if (typeof fileName !== "string" || !fileName.includes(".")) {
    return "";
  }

  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
    return "";
  }

  return fileName.substring(lastDotIndex + 1).toLowerCase();
}

export function isImageFile(filename: string): boolean {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
  const ext = getFileExtension(filename);
  return imageExtensions.includes("." + ext);
}

export function isTextFile(filename: string): boolean {
  const textExtensions = [
    ".txt",
    ".md",
    ".json",
    ".js",
    ".ts",
    ".tsx",
    ".jsx",
    ".css",
    ".html",
    ".xml",
    ".yaml",
    ".yml",
  ];
  const ext = getFileExtension(filename);
  return textExtensions.includes("." + ext);
}

export function parseError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
}

export function hasWriteAccess(
  userPublicKey: string,
  capabilities: string[],
  filePath: string,
): boolean {
  // Check if the file is in user's own public area
  if (filePath.startsWith(`pubky://${userPublicKey}/pub/`)) {
    // Extract the path after /pub/
    const pathAfterPub = filePath.replace(
      `pubky://${userPublicKey}/pub/`,
      "/pub/",
    );

    // Check if user has write access to this specific path or a parent path
    return capabilities.some((capability) => {
      const [path, permission] = capability.split(":");
      if (!permission || !permission.includes("w")) return false;

      // Check if the capability path matches or is a parent of the file path
      return pathAfterPub.startsWith(path) || path.startsWith(pathAfterPub);
    });
  }

  // For other users' files, no write access
  return false;
}

export function isOwnPath(userPublicKey: string, filePath: string): boolean {
  return filePath.startsWith(`pubky://${userPublicKey}/`);
}

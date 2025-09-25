import { PubkyClient } from "@/lib/pubky-client";
import { CacheManager } from "@/lib/cache-manager";
import { PubkyFile } from "@/types/index";

export class FileOperations {
  private static instance: FileOperations;
  private pubkyClient: PubkyClient;
  private cacheManager: CacheManager;

  private constructor() {
    this.pubkyClient = PubkyClient.getInstance();
    this.cacheManager = CacheManager.getInstance();
  }

  public static getInstance(): FileOperations {
    if (!FileOperations.instance) {
      FileOperations.instance = new FileOperations();
    }
    return FileOperations.instance;
  }

  public async createFile(filePath: string, content: string): Promise<boolean> {
    try {
      const data = new TextEncoder().encode(content);
      const success = await this.pubkyClient.put(filePath, data);

      if (success) {
        // Update cache
        await this.cacheManager.set(filePath, content);

        // Invalidate parent directory cache to refresh file listing
        const parentPath = this.getParentPath(filePath);
        if (parentPath) {
          await this.cacheManager.invalidate(parentPath);
        }
      }

      return success;
    } catch (error) {
      console.error("Failed to create file:", error);
      return false;
    }
  }

  public async readFile(
    filePath: string,
    useCache = true,
  ): Promise<string | null> {
    try {
      // Validate file path
      if (!filePath || filePath.includes("Pubky Homeserver")) {
        console.error("Invalid file path:", filePath);
        return null;
      }

      // Try cache first if requested
      if (useCache) {
        const cached = await this.cacheManager.get(filePath);
        if (cached !== null) {
          return cached;
        }
      }

      // Fetch from homeserver
      const data = await this.pubkyClient.get(filePath);
      if (data !== null) {
        // Handle empty files (zero-length data)
        const content = data.length === 0 ? "" : new TextDecoder().decode(data);

        // Cache the result (even empty strings)
        await this.cacheManager.set(filePath, content);

        return content;
      }

      return null;
    } catch (error) {
      console.error("Failed to read file:", error);
      return null;
    }
  }

  public async updateFile(filePath: string, content: string): Promise<boolean> {
    try {
      const data = new TextEncoder().encode(content);
      const success = await this.pubkyClient.put(filePath, data);

      if (success) {
        // Update cache
        await this.cacheManager.set(filePath, content);
      }

      return success;
    } catch (error) {
      console.error("Failed to update file:", error);
      return false;
    }
  }

  public async deleteFile(filePath: string): Promise<boolean> {
    try {
      const success = await this.pubkyClient.delete(filePath);

      if (success) {
        // Remove from cache
        await this.cacheManager.delete(filePath);

        // Invalidate parent directory cache
        const parentPath = this.getParentPath(filePath);
        if (parentPath) {
          await this.cacheManager.invalidate(parentPath);
        }
      }

      return success;
    } catch (error) {
      console.error("Failed to delete file:", error);
      return false;
    }
  }

  public async listFiles(
    directoryPath: string,
    useCache = true,
  ): Promise<PubkyFile[]> {
    try {
      // Ensure directory path ends with /
      const normalizedPath = directoryPath.endsWith("/")
        ? directoryPath
        : directoryPath + "/";

      // Try cache first if requested
      if (useCache) {
        const cached = await this.cacheManager.get(normalizedPath);
        if (cached) {
          return JSON.parse(cached) as PubkyFile[];
        }
      }

      // Fetch from homeserver - get all URLs under this path
      const allUrls = await this.pubkyClient.list(normalizedPath);

      // Filter to only show immediate children (not nested files/folders)
      const immediateChildren = new Set<string>();

      for (const url of allUrls) {
        // Skip invalid URLs or metadata entries
        if (
          !url || url === normalizedPath || url.includes("Pubky Homeserver")
        ) {
          continue;
        }

        // Remove the base path to get the relative path
        const relativePath = url.replace(normalizedPath, "");

        // Skip if it's the exact same path or empty
        if (!relativePath || relativePath.length === 0) continue;

        // Skip entries that contain invalid characters or look like metadata
        if (
          relativePath.includes("Pubky Homeserver") ||
          relativePath.startsWith(".") ||
          relativePath.includes("//")
        ) {
          continue;
        }

        // Get the first segment (immediate child)
        const segments = relativePath.split("/");
        const firstSegment = segments[0];

        if (
          firstSegment && firstSegment !== "" && firstSegment.trim().length > 0
        ) {
          // If there are more segments, this is a directory
          const isDirectory = segments.length > 1 || relativePath.endsWith("/");
          const childName = isDirectory ? firstSegment + "/" : firstSegment;
          immediateChildren.add(childName);
        }
      }

      // Convert to PubkyFile objects
      const files: PubkyFile[] = Array.from(immediateChildren).map((name) => {
        const isDirectory = name.endsWith("/");
        const cleanName = isDirectory ? name.slice(0, -1) : name;

        return {
          name: cleanName,
          path: normalizedPath + name,
          isDirectory,
          size: isDirectory ? undefined : this.estimateFileSize(cleanName),
          lastModified: new Date().toISOString(), // Mock timestamp
        };
      });

      // Sort: directories first, then files, both alphabetically
      files.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      // Cache the result
      await this.cacheManager.set(normalizedPath, JSON.stringify(files));

      return files;
    } catch (error) {
      console.error("Failed to list files:", error);
      return [];
    }
  }

  public async createDirectory(directoryPath: string): Promise<boolean> {
    try {
      // Create a directory by creating a .placeholder file inside it
      const placeholderPath = `${
        directoryPath.replace(/\/$/, "")
      }/.placeholder`;
      const success = await this.createFile(placeholderPath, "");

      if (success) {
        // Invalidate parent directory cache
        const parentPath = this.getParentPath(directoryPath);
        if (parentPath) {
          await this.cacheManager.invalidate(parentPath);
        }
      }

      return success;
    } catch (error) {
      console.error("Failed to create directory:", error);
      return false;
    }
  }

  public async copyFile(
    sourcePath: string,
    destinationPath: string,
  ): Promise<boolean> {
    try {
      const content = await this.readFile(sourcePath, true);
      if (content === null) {
        return false;
      }

      return await this.createFile(destinationPath, content);
    } catch (error) {
      console.error("Failed to copy file:", error);
      return false;
    }
  }

  public async moveFile(
    sourcePath: string,
    destinationPath: string,
  ): Promise<boolean> {
    try {
      const success = await this.copyFile(sourcePath, destinationPath);
      if (success) {
        await this.deleteFile(sourcePath);
      }
      return success;
    } catch (error) {
      console.error("Failed to move file:", error);
      return false;
    }
  }

  public async fileExists(filePath: string): Promise<boolean> {
    try {
      const content = await this.readFile(filePath, true);
      return content !== null;
    } catch {
      return false;
    }
  }

  public async clearCache(pattern?: string): Promise<void> {
    try {
      await this.cacheManager.invalidate(pattern);
    } catch {
      // Ignore cache clearing errors
    }
  }

  private getParentPath(filePath: string): string | null {
    const parts = filePath.split("/");
    if (parts.length <= 3) return null; // Can't go above pubky://user/

    parts.pop(); // Remove filename or last directory
    if (parts[parts.length - 1] === "") {
      parts.pop(); // Remove empty string from trailing slash
    }

    return parts.join("/") + "/";
  }

  private estimateFileSize(filename: string): number {
    // Mock file size estimation based on extension
    const ext = filename.split(".").pop()?.toLowerCase();

    switch (ext) {
      case "json":
        return Math.floor(Math.random() * 10000) + 1000;
      case "md":
        return Math.floor(Math.random() * 5000) + 500;
      case "txt":
        return Math.floor(Math.random() * 2000) + 100;
      case "js":
      case "ts":
        return Math.floor(Math.random() * 20000) + 2000;
      default:
        return Math.floor(Math.random() * 1000) + 100;
    }
  }

  /**
   * Create a binary file (e.g., images, blobs)
   */
  public async createBinaryFile(
    filePath: string,
    data: Uint8Array,
  ): Promise<boolean> {
    try {
      const success = await this.pubkyClient.put(filePath, data);

      if (success) {
        // Invalidate parent directory cache to refresh file listing
        const parentPath = this.getParentPath(filePath);
        if (parentPath) {
          await this.cacheManager.invalidate(parentPath);
        }
      }

      return success;
    } catch (error) {
      console.error("Failed to create binary file:", error);
      return false;
    }
  }

  /**
   * Read a binary file
   */
  public async readBinaryFile(filePath: string): Promise<Uint8Array | null> {
    try {
      // Validate file path
      if (!filePath || filePath.includes("Pubky Homeserver")) {
        console.error("Invalid file path:", filePath);
        return null;
      }

      // Fetch from homeserver (don't cache binary data)
      const data = await this.pubkyClient.get(filePath);
      return data;
    } catch (error) {
      console.error("Failed to read binary file:", error);
      return null;
    }
  }

  /**
   * Update a binary file
   */
  public async updateBinaryFile(
    filePath: string,
    data: Uint8Array,
  ): Promise<boolean> {
    try {
      const success = await this.pubkyClient.put(filePath, data);
      return success;
    } catch (error) {
      console.error("Failed to update binary file:", error);
      return false;
    }
  }
}

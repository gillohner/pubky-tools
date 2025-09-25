import { FileOperations } from "@/lib/file-operations";
import { BlobMetadata } from "@/types/index";

export class BlobManager {
  private static instance: BlobManager;
  private fileOps: FileOperations;

  private constructor() {
    this.fileOps = FileOperations.getInstance();
  }

  public static getInstance(): BlobManager {
    if (!BlobManager.instance) {
      BlobManager.instance = new BlobManager();
    }
    return BlobManager.instance;
  }

  /**
   * Generate a unique blob ID
   */
  private generateBlobId(): string {
    const chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    let result = "";
    for (let i = 0; i < 26; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  /**
   * Upload an image file and create both blob and metadata
   */
  public async uploadImage(
    file: File,
    basePath: string,
    userPublicKey: string,
  ): Promise<
    { blobPath: string; metadataPath: string; metadata: BlobMetadata }
  > {
    try {
      const blobId = this.generateBlobId();
      const timestamp = Date.now() * 1000; // Convert to microseconds

      // Create paths
      const blobPath = `pubky://${userPublicKey}${basePath}/blobs/${blobId}`;
      const metadataId = this.generateBlobId();
      const metadataPath =
        `pubky://${userPublicKey}${basePath}/files/${metadataId}`;

      // Create metadata
      const metadata: BlobMetadata = {
        name: file.name,
        created_at: timestamp,
        src: blobPath,
        content_type: file.type,
        size: file.size,
      };

      // Upload blob data
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      await this.fileOps.createBinaryFile(blobPath, uint8Array);

      // Upload metadata
      const metadataJson = JSON.stringify(metadata, null, 2);
      await this.fileOps.createFile(metadataPath, metadataJson);

      return { blobPath, metadataPath, metadata };
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new Error(`Failed to upload image: ${error}`);
    }
  }

  /**
   * Replace an existing blob while keeping the same metadata file
   */
  public async replaceBlob(
    file: File,
    existingMetadataPath: string,
    userPublicKey: string,
  ): Promise<{ blobPath: string; metadata: BlobMetadata }> {
    try {
      // Read existing metadata
      const existingMetadataJson = await this.fileOps.readFile(
        existingMetadataPath,
      );
      if (!existingMetadataJson) {
        throw new Error("Could not read existing metadata");
      }

      const existingMetadata: BlobMetadata = JSON.parse(existingMetadataJson);

      // Generate new blob ID
      const newBlobId = this.generateBlobId();
      const timestamp = Date.now() * 1000; // Convert to microseconds

      // Extract base path from existing metadata path
      const basePath = existingMetadataPath
        .replace(`pubky://${userPublicKey}`, "")
        .replace(/\/files\/[^/]+$/, "");

      const newBlobPath =
        `pubky://${userPublicKey}${basePath}/blobs/${newBlobId}`;

      // Create updated metadata
      const updatedMetadata: BlobMetadata = {
        ...existingMetadata,
        name: file.name,
        created_at: timestamp,
        src: newBlobPath,
        content_type: file.type,
        size: file.size,
      };

      // Upload new blob data
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      await this.fileOps.createBinaryFile(newBlobPath, uint8Array);

      // Update metadata
      const metadataJson = JSON.stringify(updatedMetadata, null, 2);
      await this.fileOps.updateFile(existingMetadataPath, metadataJson);

      // Optionally delete old blob (if different)
      if (existingMetadata.src !== newBlobPath) {
        try {
          await this.fileOps.deleteFile(existingMetadata.src);
        } catch (error) {
          console.warn("Could not delete old blob:", error);
        }
      }

      return { blobPath: newBlobPath, metadata: updatedMetadata };
    } catch (error) {
      console.error("Error replacing blob:", error);
      throw new Error(`Failed to replace blob: ${error}`);
    }
  }

  /**
   * Parse blob metadata from JSON content
   */
  public parseBlobMetadata(jsonContent: string): BlobMetadata | null {
    try {
      const metadata = JSON.parse(jsonContent);

      // Validate required fields
      if (
        typeof metadata.name === "string" &&
        typeof metadata.created_at === "number" &&
        typeof metadata.src === "string" &&
        typeof metadata.content_type === "string" &&
        typeof metadata.size === "number" &&
        metadata.src.startsWith("pubky://")
      ) {
        return metadata as BlobMetadata;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if a file appears to be blob metadata
   */
  public isBlobMetadata(jsonContent: string): boolean {
    return this.parseBlobMetadata(jsonContent) !== null;
  }
}

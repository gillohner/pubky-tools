"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/AuthProvider";
import { FileOperations } from "@/lib/file-operations";
import { BlobManager } from "@/lib/blob-manager";
import { BlobMetadata, PubkyFile } from "@/types/index";
import {
  formatFileSize,
  getFileExtension,
  getFileName,
  getFullFilePath,
  hasWriteAccess,
} from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { NavigationHeader } from "@/components/ui/NavigationHeader";
import {
  AlertCircle,
  Download,
  Edit,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  Video,
} from "lucide-react";

// Helper function to detect content type from file content (magic bytes)
const detectContentTypeFromBlob = (blobContent: Uint8Array): string => {
  if (blobContent.length < 8) return "application/octet-stream";

  // Check for common image formats by magic bytes
  const header = Array.from(blobContent.slice(0, 12)); // Increased to 12 bytes for better detection

  // JPEG: FF D8 FF
  if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E &&
    header[3] === 0x47
  ) {
    return "image/png";
  }

  // GIF: 47 49 46 38 (GIF8)
  if (
    header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 &&
    header[3] === 0x38
  ) {
    return "image/gif";
  }

  // WebP: starts with "RIFF" then "WEBP"
  if (
    header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 &&
    header[3] === 0x46
  ) {
    // Check for WEBP at offset 8
    if (blobContent.length > 11) {
      const webpHeader = Array.from(blobContent.slice(8, 12));
      if (
        webpHeader[0] === 0x57 && webpHeader[1] === 0x45 &&
        webpHeader[2] === 0x42 && webpHeader[3] === 0x50
      ) {
        return "image/webp";
      }
    }
  }

  // BMP: 42 4D (BM)
  if (header[0] === 0x42 && header[1] === 0x4D) {
    return "image/bmp";
  }

  // PDF: %PDF
  if (
    header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 &&
    header[3] === 0x46
  ) {
    return "application/pdf";
  }

  // MP4: various signatures
  if (blobContent.length > 11) {
    const mp4Header = Array.from(blobContent.slice(4, 12));
    // ftyp marker at offset 4
    if (
      mp4Header[0] === 0x66 && mp4Header[1] === 0x74 && mp4Header[2] === 0x79 &&
      mp4Header[3] === 0x70
    ) {
      return "video/mp4";
    }
  }

  // ZIP: 50 4B 03 04 or 50 4B 05 06 or 50 4B 07 08
  if (header[0] === 0x50 && header[1] === 0x4B) {
    if (
      (header[2] === 0x03 && header[3] === 0x04) ||
      (header[2] === 0x05 && header[3] === 0x06) ||
      (header[2] === 0x07 && header[3] === 0x08)
    ) {
      return "application/zip";
    }
  }

  // Default fallback
  return "application/octet-stream";
};

// Helper function to get content type from file extension
const getContentTypeFromExtension = (fileName: string): string => {
  const extension = getFileExtension(fileName).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    // Images
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp",
    "svg": "image/svg+xml",
    "bmp": "image/bmp",
    "ico": "image/x-icon",
    "tiff": "image/tiff",
    "tif": "image/tiff",
    // Videos
    "mp4": "video/mp4",
    "webm": "video/webm",
    "ogv": "video/ogg",
    "avi": "video/x-msvideo",
    "mov": "video/quicktime",
    "wmv": "video/x-ms-wmv",
    "flv": "video/x-flv",
    "mkv": "video/x-matroska",
    // Audio
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "flac": "audio/flac",
    "ogg": "audio/ogg",
    "aac": "audio/aac",
    "m4a": "audio/mp4",
    "opus": "audio/opus",
    "wma": "audio/x-ms-wma",
    // Documents
    "pdf": "application/pdf",
    "doc": "application/msword",
    "docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "ppt": "application/vnd.ms-powerpoint",
    "pptx":
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    // Archives
    "zip": "application/zip",
    "rar": "application/vnd.rar",
    "7z": "application/x-7z-compressed",
    "tar": "application/x-tar",
    "gz": "application/gzip",
  };
  return mimeTypes[extension] || "application/octet-stream";
};

// PDF viewer component
const PdfViewer = ({ blobData }: { blobData: string }) => {
  return (
    <iframe
      src={blobData}
      width="100%"
      height="600px"
      style={{ border: "none" }}
      title="PDF Preview"
    />
  );
};

// Video viewer component
const VideoViewer = (
  { blobData, contentType }: { blobData: string; contentType: string },
) => {
  return (
    <video
      controls
      style={{ width: "100%", maxHeight: "600px" }}
      className="rounded-lg"
    >
      <source src={blobData} type={contentType} />
      Your browser does not support the video tag.
    </video>
  );
};

// Audio viewer component
const AudioViewer = (
  { blobData, contentType }: { blobData: string; contentType: string },
) => {
  return (
    <div className="flex items-center justify-center p-8">
      <audio controls className="w-full max-w-md">
        <source src={blobData} type={contentType} />
        Your browser does not support the audio tag.
      </audio>
    </div>
  );
};

interface MediaViewerProps {
  filePath?: string;
  onNavigateToPath?: (path: string) => void;
  onEditInTextEditor?: (file: PubkyFile) => void;
  onBack?: () => void;
  readOnlyMode?: boolean;
}

export function MediaViewer({
  filePath,
  onNavigateToPath,
  onEditInTextEditor,
  onBack,
  readOnlyMode = false,
}: MediaViewerProps) {
  const { state } = useAuth();
  const { showSuccess, showError } = useToast();
  const [file, setFile] = useState<PubkyFile | null>(null);
  const [metadata, setMetadata] = useState<BlobMetadata | null>(null);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  const [blobData, setBlobData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fileOps = FileOperations.getInstance();
  const blobManager = BlobManager.getInstance();

  const user = state.user;
  const canEdit = !readOnlyMode && user && file &&
    hasWriteAccess(user.publicKey, user.capabilities || [], file.path);

  // Load file and metadata from path
  useEffect(() => {
    if (!filePath) return;

    const loadFileData = async () => {
      setLoading(true);
      setMediaLoading(true);
      setMediaError(false);
      setBlobData(null);

      try {
        // Create file object from path
        const fileName = getFileName(null, filePath);
        const fileObj: PubkyFile = {
          name: fileName,
          path: filePath,
          isDirectory: false,
        };
        setFile(fileObj);

        // First try to load as metadata file (most common case for uploaded media)
        let metadataError: string | null = null;
        try {
          console.log("Attempting to load as metadata file:", filePath);
          const content = await fileOps.readFile(filePath, false); // Don't use cache for fresh data
          if (content) {
            const parsedMetadata = blobManager.parseBlobMetadata(content);
            if (parsedMetadata) {
              console.log("Successfully loaded metadata:", parsedMetadata);
              setMetadata(parsedMetadata);
              setMediaLoading(false); // Will be set to true again when loading blob
              return;
            } else {
              metadataError = "File contains invalid metadata format";
            }
          } else {
            metadataError = "Failed to read metadata file content";
          }
        } catch (error) {
          metadataError = `Metadata loading error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`;
          console.debug("Not a metadata file, trying as direct blob...", error);
        }

        // If metadata loading failed, try to load as direct blob (for direct image/media files)
        let blobError: string | null = null;
        try {
          console.log("Attempting to load as direct blob file:", filePath);
          const blobContent = await fileOps.readBinaryFile(filePath);
          if (blobContent && blobContent.length > 0) {
            // This is a direct blob file, detect content type from file extension first, then from content
            let contentType = getContentTypeFromExtension(fileName);

            // If extension didn't give us a good content type, try to detect from blob content
            if (contentType === "application/octet-stream") {
              contentType = detectContentTypeFromBlob(blobContent);
            }

            const directMetadata: BlobMetadata = {
              name: fileName,
              content_type: contentType,
              src: filePath, // Use the same path as source
              size: blobContent.length,
              created_at: Date.now(),
            };

            console.log(
              "Successfully loaded direct blob, creating metadata:",
              directMetadata,
            );
            setMetadata(directMetadata);

            // Since we already have the blob data, convert it to display URL immediately
            const buffer = new ArrayBuffer(blobContent.length);
            const view = new Uint8Array(buffer);
            view.set(blobContent);
            const blob = new Blob([buffer], { type: contentType });
            const dataUrl = URL.createObjectURL(blob);
            setBlobData(dataUrl);
            setMediaLoading(false);
            return;
          } else {
            blobError = "File is empty or failed to read binary content";
          }
        } catch (error) {
          blobError = `Binary loading error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`;
          console.debug("Not a blob file either...", error);
        }

        // Show detailed error information
        const combinedError = [
          `Failed to load file: ${filePath}`,
          metadataError ? `Metadata: ${metadataError}` : null,
          blobError ? `Binary: ${blobError}` : null,
        ].filter(Boolean).join(" | ");

        console.error("File loading failed:", {
          filePath,
          metadataError,
          blobError,
        });
        showError(combinedError);
      } catch (error) {
        console.error("Error loading file:", error);
        showError("Failed to load file");
      } finally {
        setLoading(false);
      }
    };

    loadFileData();
  }, [filePath, fileOps, blobManager, showError]);

  const loadBlobData = useCallback(async () => {
    if (!metadata) return;

    // If we already have blob data (from direct blob loading), don't reload
    if (blobData) return;

    try {
      setMediaLoading(true);
      setMediaError(false);

      console.log("Loading blob data from:", metadata.src);
      const blobContent = await fileOps.readBinaryFile(metadata.src);

      if (blobContent && blobContent.length > 0) {
        // Convert blob content to data URL for display
        const buffer = new ArrayBuffer(blobContent.length);
        const view = new Uint8Array(buffer);
        view.set(blobContent);
        const blob = new Blob([buffer], { type: metadata.content_type });
        const dataUrl = URL.createObjectURL(blob);
        setBlobData(dataUrl);
        console.log("Successfully loaded blob data, size:", blobContent.length);
      } else {
        const errorMsg = `Failed to load media blob: ${
          blobContent ? "Empty file" : "No data returned"
        }`;
        console.error(errorMsg, {
          src: metadata.src,
          contentType: metadata.content_type,
        });
        setMediaError(true);
        showError(errorMsg);
      }
    } catch (error) {
      const errorMsg = `Error loading blob from ${metadata.src}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      console.error("Error loading blob:", error, { metadata });
      setMediaError(true);
      showError(errorMsg);
    } finally {
      setMediaLoading(false);
    }
  }, [metadata, fileOps, showError, blobData]);

  useEffect(() => {
    if (metadata && metadata.src) {
      loadBlobData();
    }
  }, [metadata, loadBlobData]);

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      if (blobData && blobData.startsWith("blob:")) {
        URL.revokeObjectURL(blobData);
      }
    };
  }, [blobData]);

  const handleDownload = async () => {
    if (!metadata || !file) return;

    try {
      const blobContent = await fileOps.readBinaryFile(metadata.src);
      if (blobContent) {
        const buffer = new ArrayBuffer(blobContent.length);
        const view = new Uint8Array(buffer);
        view.set(blobContent);
        const blob = new Blob([buffer], { type: metadata.content_type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = metadata.name || file.name || "download";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showSuccess(`Downloaded ${metadata.name || file.name}`);
      }
    } catch {
      showError("Failed to download file");
    }
  };

  const handleEditFile = () => {
    if (file && onEditInTextEditor) {
      onEditInTextEditor(file);
    }
  };

  // Determine media type and render appropriate viewer
  const renderMediaViewer = () => {
    if (!metadata || !blobData) return null;

    const contentType = metadata.content_type.toLowerCase();

    if (contentType.startsWith("image/")) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={blobData}
          alt={metadata.name || file?.name || "Image"}
          className="max-w-full max-h-[600px] object-contain rounded-lg"
          onError={() => setMediaError(true)}
        />
      );
    }

    if (contentType.startsWith("video/")) {
      return <VideoViewer blobData={blobData} contentType={contentType} />;
    }

    if (contentType.startsWith("audio/")) {
      return <AudioViewer blobData={blobData} contentType={contentType} />;
    }

    if (contentType === "application/pdf") {
      return <PdfViewer blobData={blobData} />;
    }

    // For document types, show info and download option
    if (
      contentType.includes("word") ||
      contentType.includes("excel") ||
      contentType.includes("powerpoint") ||
      contentType.includes("spreadsheet") ||
      contentType.includes("presentation") ||
      contentType.includes("document")
    ) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-gray-600 space-y-4">
          <FileText className="h-16 w-16 text-blue-400" />
          <div className="text-center">
            <div className="text-lg font-medium">Document Preview</div>
            <div className="text-sm text-gray-500 mt-1">
              {metadata.content_type}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Download to view this document
            </div>
            <Button
              onClick={handleDownload}
              className="mt-4"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Document
            </Button>
          </div>
        </div>
      );
    }

    // For archive types
    if (
      contentType.includes("zip") ||
      contentType.includes("rar") ||
      contentType.includes("7z") ||
      contentType.includes("tar") ||
      contentType.includes("gzip")
    ) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-gray-600 space-y-4">
          <FileText className="h-16 w-16 text-orange-400" />
          <div className="text-center">
            <div className="text-lg font-medium">Archive File</div>
            <div className="text-sm text-gray-500 mt-1">
              {metadata.content_type}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Download to extract this archive
            </div>
            <Button
              onClick={handleDownload}
              className="mt-4"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Archive
            </Button>
          </div>
        </div>
      );
    }

    // For unsupported types, show download option
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-600 space-y-4">
        <FileText className="h-16 w-16 text-gray-400" />
        <div className="text-center">
          <div className="text-lg font-medium">Preview not available</div>
          <div className="text-sm text-gray-500 mt-1">
            {metadata.content_type}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            This file type is not supported for preview
          </div>
          <Button
            onClick={handleDownload}
            className="mt-4"
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Download File
          </Button>
        </div>
      </div>
    );
  };

  const getMediaIcon = () => {
    if (!metadata) return <FileText className="h-4 w-4" />;

    const contentType = metadata.content_type.toLowerCase();
    if (contentType.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4" />;
    }
    if (contentType.startsWith("video/")) return <Video className="h-4 w-4" />;
    if (contentType.startsWith("audio/")) return <Video className="h-4 w-4" />;
    if (contentType === "application/pdf") {
      return <FileText className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!file || !metadata) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64 text-center">
          <div className="space-y-3">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
            <div className="text-gray-600">Failed to load media file</div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while file info is being loaded
  if (loading || !file) {
    return (
      <div className="space-y-4">
        <NavigationHeader
          path={filePath || ""}
          onNavigate={onNavigateToPath}
          showBackButton={!!onBack}
          onBack={onBack}
          backButtonText="Back to Browser"
          fileName="Loading..."
          showFileName={false}
          context="image"
          variant="muted"
          showCopyButton={false}
          directEditing
        />
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <div className="text-lg">Loading file...</div>
              <div className="text-sm text-muted-foreground">
                Please wait while we load the file data
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state if we couldn't load file info at all
  if (!metadata) {
    return (
      <div className="space-y-4">
        <NavigationHeader
          path={getFullFilePath(file, filePath)}
          onNavigate={onNavigateToPath}
          showBackButton={!!onBack}
          onBack={onBack}
          backButtonText="Back to Browser"
          fileName={file?.name || "Unknown"}
          showFileName={false}
          context="image"
          variant="muted"
          showCopyButton={false}
          directEditing
        />
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div className="text-lg">Failed to load file</div>
              <div className="text-sm text-muted-foreground text-center">
                This file could not be loaded as media content.<br />
                It may not be a supported media file or there may be a network
                issue.
              </div>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <NavigationHeader
        path={getFullFilePath(file, filePath)} // Use utility function for consistent behavior
        onNavigate={onNavigateToPath}
        showBackButton={!!onBack}
        onBack={onBack}
        backButtonText="Back to Browser"
        fileName={metadata?.name || file?.name}
        showFileName={false} // Don't show separate filename since it's in the path
        context="image"
        variant="muted"
        showCopyButton={false}
        directEditing
      />

      {/* Media Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {getMediaIcon()}
            <span>{metadata.name || file.name}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Media Display */}
            <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg p-4 min-h-[300px]">
              {mediaLoading && (
                <div className="flex flex-col items-center space-y-3">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                  <div className="text-lg">Loading media...</div>
                  <div className="text-sm text-muted-foreground text-center">
                    {metadata.size
                      ? `Loading ${formatFileSize(metadata.size)} file`
                      : "Loading file content"}
                  </div>
                </div>
              )}

              {!mediaLoading && mediaError && (
                <div className="flex flex-col items-center space-y-3 text-red-500">
                  <AlertCircle className="h-10 w-10" />
                  <div className="text-lg font-medium">
                    Failed to load media
                  </div>
                  <div className="text-sm text-center text-muted-foreground max-w-md">
                    The media content could not be loaded. This might be due to
                    network issues or file corruption.
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadBlobData}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              )}

              {!mediaLoading && !mediaError && blobData && renderMediaViewer()}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button onClick={handleDownload} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>

                {canEdit && (
                  <Button onClick={handleEditFile} variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Metadata
                  </Button>
                )}
              </div>
            </div>

            {/* Media Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                  File Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Name:
                    </span>
                    <span>{metadata.name || file.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Type:
                    </span>
                    <span>{metadata.content_type}</span>
                  </div>
                  {metadata.size && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Size:
                      </span>
                      <span>{formatFileSize(metadata.size)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Created:
                    </span>
                    <span>
                      {new Date(metadata.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                  Location
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Path:
                    </span>
                    <span className="font-mono text-xs break-all">
                      {file.path}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Blob:
                    </span>
                    <span className="font-mono text-xs break-all">
                      {metadata.src}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

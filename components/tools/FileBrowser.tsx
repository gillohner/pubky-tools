"use client";

import {
  ChangeEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/AuthProvider";
import { FileOperations } from "@/lib/file-operations";
import { BlobManager } from "@/lib/blob-manager";
import { BlobMetadata, PubkyFile } from "@/types/index";
import {
  formatFileSize,
  getFileExtension,
  hasWriteAccess,
  isOwnPath,
  isTextFile,
} from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { FileCreationDialog } from "@/components/tools/FileCreationDialog";
import { PathBreadcrumb } from "@/components/ui/PathBreadcrumb";
import {
  Download,
  Edit,
  File,
  Folder,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

interface FileBrowserProps {
  onFileSelect?: (file: PubkyFile) => void;
  selectedFile?: PubkyFile | null;
  readOnlyMode?: boolean;
  currentPath?: string;
  onPathChange?: (path: string) => void;
  onFileCreated?: (newFile?: PubkyFile) => void;
}

export function FileBrowser(
  {
    onFileSelect,
    selectedFile,
    readOnlyMode = false,
    currentPath: externalCurrentPath,
    onPathChange,
    onFileCreated,
  }: FileBrowserProps,
) {
  const { state } = useAuth();
  const { showSuccess, showError } = useToast();
  const [currentPath, setCurrentPath] = useState(externalCurrentPath || "");
  const [files, setFiles] = useState<PubkyFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreationDialog, setShowCreationDialog] = useState(false);
  const [blobMetadata, setBlobMetadata] = useState<Map<string, BlobMetadata>>(
    new Map(),
  );

  const fileOps = FileOperations.getInstance();
  const blobManager = BlobManager.getInstance();

  // Check if user has write access to current directory
  const canWriteToCurrentPath = state.user && currentPath
    ? hasWriteAccess(
      state.user.publicKey,
      state.user.capabilities || [],
      currentPath,
    )
    : false;

  // Initialize with pub directory as root
  useEffect(() => {
    if (state.user?.publicKey) {
      const userPath = `pubky://${state.user.publicKey}/pub/`;
      if (!externalCurrentPath) {
        setCurrentPath(userPath);
      }
    }
  }, [state.user, externalCurrentPath]);

  // Sync external currentPath with internal state
  useEffect(() => {
    if (externalCurrentPath && externalCurrentPath !== currentPath) {
      setCurrentPath(externalCurrentPath);
    }
  }, [externalCurrentPath, currentPath]);

  // Notify parent when currentPath changes
  useEffect(() => {
    if (onPathChange && currentPath) {
      onPathChange(currentPath);
    }
  }, [currentPath, onPathChange]);

  // Load blob metadata for files that might be blob metadata
  const loadBlobMetadata = useCallback(async (fileList: PubkyFile[]) => {
    const newBlobMetadata = new Map<string, BlobMetadata>();

    // Check each file to see if it contains blob metadata
    const metadataPromises = fileList
      .filter((file) =>
        !file.isDirectory && file.name && getFileExtension(file.name) === ""
      )
      .map(async (file) => {
        try {
          const content = await fileOps.readFile(file.path);
          if (content) {
            const metadata = blobManager.parseBlobMetadata(content);
            if (metadata) {
              newBlobMetadata.set(file.path, metadata);
            }
          }
        } catch {
          // Ignore errors - file might not be blob metadata
          console.debug("Not blob metadata:", file.path);
        }
      });

    await Promise.all(metadataPromises);
    setBlobMetadata(newBlobMetadata);
  }, [fileOps, blobManager]);

  const loadFiles = useCallback(async (useCache = true) => {
    if (!currentPath) return;

    setIsLoading(true);

    try {
      const fileList = await fileOps.listFiles(currentPath, useCache);
      setFiles(fileList);

      // Load blob metadata in the background
      loadBlobMetadata(fileList);

      if (!useCache) {
        showSuccess("Files refreshed");
      }
    } catch (error) {
      console.error("Error loading files:", error);
      showError("Failed to load files");
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPath, fileOps, showSuccess, showError, loadBlobMetadata]);

  // Load files when path changes
  useEffect(() => {
    if (currentPath) {
      loadFiles();
    }
  }, [loadFiles, currentPath]); // loadFiles already includes currentPath in its dependencies

  const navigateToPath = (path: string) => {
    setCurrentPath(path);
    // Also notify parent component of path change
    if (onPathChange) {
      onPathChange(path);
    }
  };

  const handleFileClick = (file: PubkyFile) => {
    if (file.isDirectory) {
      navigateToPath(file.path + (file.path.endsWith("/") ? "" : "/"));
    } else {
      // Validate file before opening
      if (
        file.name === "Pubky Homeserver" ||
        file.name.includes("Pubky Homeserver") ||
        file.name.startsWith(".") ||
        !file.name.trim()
      ) {
        showError("Cannot open this file type");
        return;
      }

      if (onFileSelect) {
        onFileSelect(file);
      }
      // TODO: Open file in editor
      console.log("Opening file:", file.path);
    }
  };

  const handleRefresh = () => {
    loadFiles(false); // Force refresh without cache
  };

  const handleFileCreated = () => {
    setShowCreationDialog(false);
    loadFiles(false);

    // Notify parent component
    if (onFileCreated) {
      onFileCreated();
    }
  };

  const handleDeleteFile = async (file: PubkyFile) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) {
      return;
    }

    try {
      const success = await fileOps.deleteFile(file.path);
      if (success) {
        showSuccess(`"${file.name}" deleted successfully`);
        loadFiles(false);
      } else {
        showError("Failed to delete file");
      }
    } catch (error) {
      showError(`Failed to delete file: ${error}`);
    }
  };

  const handleDownloadFile = async (file: PubkyFile) => {
    try {
      const content = await fileOps.readFile(file.path);
      if (content) {
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showSuccess(`"${file.name}" downloaded successfully`);
      } else {
        showError("Failed to download file");
      }
    } catch (error) {
      showError(`Failed to download file: ${error}`);
    }
  };

  const getMediaTypeLabel = (
    metadata: BlobMetadata,
  ): { label: string; color: string } => {
    const contentType = metadata.content_type.toLowerCase();

    if (contentType.startsWith("image/")) {
      return { label: "IMAGE", color: "bg-purple-100 text-purple-800" };
    }
    if (contentType.startsWith("video/")) {
      return { label: "VIDEO", color: "bg-red-100 text-red-800" };
    }
    if (contentType.startsWith("audio/")) {
      return { label: "AUDIO", color: "bg-blue-100 text-blue-800" };
    }
    if (contentType === "application/pdf") {
      return { label: "PDF", color: "bg-orange-100 text-orange-800" };
    }
    return { label: "BLOB", color: "bg-gray-100 text-gray-800" };
  };

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Folder className="h-5 w-5" />
            <span>File Browser</span>
            {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mobile breadcrumb */}
          <div className="md:hidden">
            <PathBreadcrumb
              path={currentPath ||
                `pubky://${state.user?.publicKey || "unknown"}/pub/`}
              onNavigate={navigateToPath}
              showDefaultText={!state.user}
              defaultText="Enter a pubky:// URL or login to browse your files"
              className="w-full"
              directEditing={!state.user}
            />
          </div>

          {/* Desktop: breadcrumb and actions on same line */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            <div className="flex-1 min-w-0">
              <PathBreadcrumb
                path={currentPath ||
                  `pubky://${state.user?.publicKey || "unknown"}/pub/`}
                onNavigate={navigateToPath}
                showDefaultText={!state.user}
                defaultText="Enter a pubky:// URL or login to browse your files"
                className="w-full"
                directEditing={!state.user}
              />
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <SearchInput
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setSearchTerm(e.target.value)}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                title="Refresh"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
              {!readOnlyMode && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreationDialog(true)}
                    disabled={isLoading || !canWriteToCurrentPath}
                    title={!canWriteToCurrentPath
                      ? "No write access to create files in this directory"
                      : "Create new file, folder, or upload image"}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile: search and actions separate line */}
          <div className="flex items-center space-x-2 md:hidden">
            <SearchInput
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setSearchTerm(e.target.value)}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              title="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
            {!readOnlyMode && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreationDialog(true)}
                  disabled={isLoading || !canWriteToCurrentPath}
                  title={!canWriteToCurrentPath
                    ? "No write access to create files in this directory"
                    : "Create new file, folder, or upload image"}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </>
            )}
          </div>

          {/* File creation dialog */}
          {!readOnlyMode && showCreationDialog && state.user && (
            <FileCreationDialog
              currentPath={currentPath}
              userPublicKey={state.user.publicKey}
              onFileCreated={handleFileCreated}
              onCancel={() => setShowCreationDialog(false)}
            />
          )}

          {/* File list */}
          <div className="border rounded-md">
            {isLoading
              ? (
                <div className="p-8 text-center text-gray-500">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                  Loading files...
                </div>
              )
              : filteredFiles.length === 0
              ? (
                <div className="p-8 text-center text-gray-500">
                  {searchTerm ? "No files match your search" : "No files found"}
                </div>
              )
              : (
                <div className="divide-y">
                  {filteredFiles.map((file, index) => {
                    const isSelected = selectedFile &&
                      selectedFile.path === file.path;
                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 transition-colors ${
                          isSelected
                            ? "bg-blue-50 border-l-4 border-blue-500 dark:bg-blue-950/30 dark:border-blue-400"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div
                          className="flex items-center space-x-3 flex-1 cursor-pointer"
                          onClick={() => handleFileClick(file)}
                        >
                          {file.isDirectory
                            ? <Folder className="h-5 w-5 text-blue-500" />
                            : blobMetadata.has(file.path)
                            ? <ImageIcon className="h-5 w-5 text-purple-500" />
                            : <File className="h-5 w-5 text-gray-400" />}
                          <div>
                            <div className="font-medium">{file.name}</div>
                            <div className="text-sm text-gray-500">
                              {!file.isDirectory && file.size && (
                                <span>{formatFileSize(file.size)} •</span>
                              )}
                              {file.lastModified && (
                                <span>
                                  {new Date(file.lastModified)
                                    .toLocaleDateString()}
                                </span>
                              )}
                              {!file.isDirectory && isTextFile(file.name) && (
                                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                  {getFileExtension(file.name).toUpperCase()}
                                </span>
                              )}
                              {!file.isDirectory &&
                                blobMetadata.has(file.path) && (() => {
                                  const metadata = blobMetadata.get(file.path)!;
                                  const { label, color } = getMediaTypeLabel(
                                    metadata,
                                  );
                                  return (
                                    <span
                                      className={`ml-2 px-2 py-1 text-xs rounded ${color}`}
                                    >
                                      {label}
                                    </span>
                                  );
                                })()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          {!file.isDirectory && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                                e.stopPropagation();
                                handleDownloadFile(file);
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          {!readOnlyMode && isTextFile(file.name) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                                e.stopPropagation();
                                handleFileClick(file);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Only show delete button if user has write access or is viewing own files */}
                          {!readOnlyMode && state.user &&
                              hasWriteAccess(
                                state.user.publicKey,
                                state.user.capabilities || [],
                                file.path,
                              )
                            ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                                  e.stopPropagation();
                                  handleDeleteFile(file);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )
                            : !readOnlyMode && state.user &&
                                isOwnPath(state.user.publicKey, file.path)
                            ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled
                                title="No write access to delete this file"
                                className="opacity-50 cursor-not-allowed"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )
                            : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

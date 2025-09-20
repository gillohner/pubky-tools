"use client";

import {
  ChangeEvent,
  KeyboardEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/AuthProvider";
import { FileOperations } from "@/lib/file-operations";
import { PubkyFile } from "@/types/index";
import {
  formatFileSize,
  getFileExtension,
  hasWriteAccess,
  isOwnPath,
  isTextFile,
} from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import {
  ChevronRight,
  Copy,
  Download,
  Edit,
  File,
  Folder,
  FolderPlus,
  Home,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

interface FileBrowserProps {
  onFileSelect?: (file: PubkyFile) => void;
  selectedFile?: PubkyFile | null;
  readOnlyMode?: boolean;
  currentPath?: string;
  onPathChange?: (path: string) => void;
}

export function FileBrowser(
  { onFileSelect, selectedFile, readOnlyMode = false, currentPath: externalCurrentPath, onPathChange }: FileBrowserProps,
) {
  const { state } = useAuth();
  const { showSuccess, showError } = useToast();
  const [currentPath, setCurrentPath] = useState(externalCurrentPath || "");
  const [files, setFiles] = useState<PubkyFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [directUrl, setDirectUrl] = useState("");
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");

  const fileOps = FileOperations.getInstance();

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
  }, [externalCurrentPath]);

  // Notify parent when currentPath changes
  useEffect(() => {
    if (onPathChange && currentPath) {
      onPathChange(currentPath);
    }
  }, [currentPath, onPathChange]);

  const loadFiles = useCallback(async (useCache = true) => {
    if (!currentPath) return;

    setIsLoading(true);

    try {
      const fileList = await fileOps.listFiles(currentPath, useCache);
      setFiles(fileList);

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
  }, [currentPath, fileOps, showSuccess, showError]);

  // Load files when path changes
  useEffect(() => {
    if (currentPath) {
      loadFiles();
    }
  }, [currentPath, loadFiles]);

  const navigateToPath = (path: string) => {
    setCurrentPath(path);
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

  const handleDirectAccess = () => {
    if (!directUrl.trim()) return;

    const targetPath = directUrl.trim();

    // Handle various input formats
    if (targetPath.startsWith("pubky://")) {
      // Already a complete pubky URL
      setCurrentPath(targetPath);
    } else if (targetPath.startsWith("pk:")) {
      // pk:{pub} format - navigate to their /pub/ folder
      const publicKey = targetPath.substring(3); // Remove 'pk:' prefix
      setCurrentPath(`pubky://${publicKey}/pub/`);
    } else if (targetPath.startsWith("/pub/")) {
      // Relative path - use current user
      const baseUser = state.user?.publicKey;
      if (baseUser) {
        setCurrentPath(`pubky://${baseUser}${targetPath}`);
      }
    } else if (targetPath.includes("/pub/")) {
      // Contains /pub/ somewhere, try to extract the path
      const pubIndex = targetPath.indexOf("/pub/");
      const pathPart = targetPath.substring(pubIndex);
      const baseUser = state.user?.publicKey;
      if (baseUser) {
        setCurrentPath(`pubky://${baseUser}${pathPart}`);
      }
    } else {
      // Assume it's a public key, navigate to their /pub/
      setCurrentPath(`pubky://${targetPath}/pub/`);
    }

    setDirectUrl("");
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) {
      showError("Please enter a file name");
      return;
    }

    if (!canWriteToCurrentPath) {
      showError(
        "You do not have write access to create files in this directory",
      );
      return;
    }

    // Ensure we don't double-append the current path
    const fileName = newFileName.trim();
    let filePath: string;

    // If currentPath already ends with /, just append filename
    if (currentPath.endsWith("/")) {
      filePath = currentPath + fileName;
    } else {
      filePath = currentPath + "/" + fileName;
    }

    try {
      const success = await fileOps.createFile(filePath, "");
      if (success) {
        showSuccess(`File "${fileName}" created successfully`);
        setNewFileName("");
        setShowNewFileDialog(false);
        loadFiles(false);
      } else {
        showError("Failed to create file");
      }
    } catch (error) {
      showError(`Failed to create file: ${error}`);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      showError("Please enter a folder name");
      return;
    }

    if (!canWriteToCurrentPath) {
      showError(
        "You do not have write access to create folders in this directory",
      );
      return;
    }

    // Ensure we don't double-append the current path
    const folderName = newFolderName.trim();
    let folderPath: string;

    // If currentPath already ends with /, just append foldername/
    if (currentPath.endsWith("/")) {
      folderPath = currentPath + folderName + "/";
    } else {
      folderPath = currentPath + "/" + folderName + "/";
    }

    try {
      const success = await fileOps.createDirectory(folderPath);
      if (success) {
        showSuccess(`Folder "${folderName}" created successfully`);
        setNewFolderName("");
        setShowNewFolderDialog(false);
        loadFiles(false);
      } else {
        showError("Failed to create folder");
      }
    } catch (error) {
      showError(`Failed to create folder: ${error}`);
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

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Improved breadcrumb handling for Pubky URLs - only show from /pub/ onwards
  const createBreadcrumbs = () => {
    if (!currentPath.startsWith("pubky://")) return [];

    const urlPath = currentPath.replace("pubky://", "");
    const pathParts = urlPath.split("/").filter(Boolean);

    // Only show breadcrumbs for paths within /pub/
    if (pathParts.length < 2 || pathParts[1] !== "pub") return [];

    const breadcrumbs = [];

    // Start from /pub/ onwards (skip homeserver and show from pub)
    for (let i = 1; i < pathParts.length; i++) {
      const path = `pubky://${pathParts.slice(0, i + 1).join("/")}/`;
      const name = pathParts[i] === "pub" ? "pub" : pathParts[i];
      breadcrumbs.push({
        name,
        path,
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = createBreadcrumbs();

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
          {/* Enhanced Pubky URL Access */}
          <div className="space-y-2">
            <div className="flex space-x-2">
              <Input
                placeholder="Enter pubky:// URL, pk:{publickey}, or path (e.g., pubky://user123.../pub/example.txt or pk:user123...)"
                value={directUrl}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setDirectUrl(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) =>
                  e.key === "Enter" && handleDirectAccess()}
                className="flex-1"
              />
              <Button
                onClick={handleDirectAccess}
                disabled={!directUrl.trim() || isLoading}
                variant="outline"
              >
                <Search className="h-4 w-4 mr-2" />
                Open
              </Button>
            </div>
          </div>

          {/* Navigation bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  navigateToPath(`pubky://${state.user?.publicKey}/pub/`)}
                disabled={isLoading}
              >
                <Home className="h-4 w-4" />
              </Button>
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center space-x-1">
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigateToPath(crumb.path)}
                    className="text-blue-600 hover:text-blue-800"
                    disabled={isLoading}
                  >
                    {crumb.name}
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              {currentPath && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(currentPath);
                    showSuccess("Path copied to clipboard");
                  }}
                  disabled={isLoading}
                  title="Copy current path"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>

          {/* Search and actions */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {!readOnlyMode && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewFileDialog(true)}
                  disabled={isLoading || !canWriteToCurrentPath}
                  title={!canWriteToCurrentPath
                    ? "No write access to create files in this directory"
                    : undefined}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New File
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewFolderDialog(true)}
                  disabled={isLoading || !canWriteToCurrentPath}
                  title={!canWriteToCurrentPath
                    ? "No write access to create folders in this directory"
                    : undefined}
                >
                  <FolderPlus className="h-4 w-4 mr-1" />
                  New Folder
                </Button>
              </>
            )}
          </div>

          {/* New file dialog */}
          {!readOnlyMode && showNewFileDialog && (
            <div className="p-4 border rounded-md bg-muted/30">
              <h3 className="font-medium mb-2">Create New File</h3>
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter file name (e.g., document.txt)"
                  value={newFileName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setNewFileName(e.target.value)}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) =>
                    e.key === "Enter" && handleCreateFile()}
                />
                <Button onClick={handleCreateFile} size="sm">
                  Create
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowNewFileDialog(false)}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* New folder dialog */}
          {!readOnlyMode && showNewFolderDialog && (
            <div className="p-4 border rounded-md bg-muted/30">
              <h3 className="font-medium mb-2">Create New Folder</h3>
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter folder name"
                  value={newFolderName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setNewFolderName(e.target.value)}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) =>
                    e.key === "Enter" && handleCreateFolder()}
                />
                <Button onClick={handleCreateFolder} size="sm">
                  Create
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowNewFolderDialog(false)}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
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

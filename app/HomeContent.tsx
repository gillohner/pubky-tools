"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { FileBrowser } from "@/components/tools/FileBrowser";
import { FileEditor } from "@/components/tools/FileEditor";
import { PathBreadcrumb } from "@/components/ui/PathBreadcrumb";
import { LoginModal } from "@/components/auth/LoginModal";
import { UnauthenticatedHeader } from "@/components/layout/UnauthenticatedHeader";
import { MediaViewer } from "@/components/tools/MediaViewer";
import { useAuth } from "@/components/auth/AuthProvider";
import { BlobManager } from "@/lib/blob-manager";
import { PubkyFile } from "@/types/index";
import { Eye } from "lucide-react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

type Tab = "browser" | "editor" | "image";

export default function HomeContent() {
  const { state } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get initial state from URL params
  const initialTab = (searchParams?.get("tool") as Tab) || "browser";
  const initialPath = searchParams?.get("path") || "";

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [selectedFile, setSelectedFile] = useState<PubkyFile | null>(null);
  const [editorPath, setEditorPath] = useState<string>(initialPath);
  const [imagePath, setImagePath] = useState<string>("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>("");

  const blobManager = BlobManager.getInstance();

  const isAuthenticated = state.isAuthenticated;
  const readOnlyMode = !isAuthenticated;

  // Helper function to get parent directory from file path
  const getParentPath = useCallback((filePath: string): string => {
    if (!filePath || !filePath.includes("/")) return filePath;
    const lastSlashIndex = filePath.lastIndexOf("/");
    return filePath.substring(0, lastSlashIndex);
  }, []);

  // Update URL when tab or path changes
  const updateUrl = useCallback((tool: Tab, path?: string) => {
    const params = new URLSearchParams();
    params.set("tool", tool);
    if (path) {
      params.set("path", path);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router]);

  // Sync initial URL parameters
  useEffect(() => {
    if (initialPath && !editorPath && !currentPath) {
      setEditorPath(initialPath);
      setCurrentPath(getParentPath(initialPath));
    }
  }, [initialPath, editorPath, currentPath, getParentPath]);

  const handleFileSelect = async (file: PubkyFile) => {
    console.log("handleFileSelect called with:", file);

    try {
      // Check if file is blob metadata (for media files)
      if (!file.isDirectory) {
        try {
          console.log("Checking if file is blob metadata:", file.path);

          // Add a timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          const response = await fetch(
            `/api/files/read?path=${encodeURIComponent(file.path)}`,
            { signal: controller.signal },
          );

          clearTimeout(timeoutId);

          if (!response.ok) {
            console.log(
              `File read failed (${response.status}), trying as direct blob/text file`,
            );
            // Don't throw error, just continue to normal file handling
          } else {
            const content = await response.text();
            const metadata = blobManager.parseBlobMetadata(content);

            if (metadata) {
              console.log("File is blob metadata, opening in Media Viewer");
              // Open in Media Viewer
              setImagePath(file.path);
              setActiveTab("image");
              updateUrl("image", file.path);
              return;
            } else {
              console.log("File is not blob metadata, opening in editor");
            }
          }
        } catch (error) {
          // Not blob metadata or API error, continue with normal file handling
          console.debug(
            "Error checking blob metadata (will try editor):",
            error,
          );

          // Check if it might be a direct media file by extension
          const fileName = file.name || file.path.split("/").pop() || "";
          const isLikelyMediaFile =
            /\.(jpg|jpeg|png|gif|webp|mp4|webm|pdf|mp3|flac|wav)$/i.test(
              fileName,
            );

          if (isLikelyMediaFile) {
            console.log(
              "File appears to be a direct media file, opening in Media Viewer",
            );
            setImagePath(file.path);
            setActiveTab("image");
            updateUrl("image", file.path);
            return;
          }
        }
      }

      // Normal file handling
      console.log("Opening file in editor:", file.path);
      setSelectedFile(file);
      setEditorPath(file.path);

      // Extract parent directory from file path to preserve folder location
      const parentPath = getParentPath(file.path);
      if (parentPath) {
        setCurrentPath(parentPath);
      }

      setActiveTab("editor");
      updateUrl("editor", file.path);
    } catch (error) {
      console.error("Error in handleFileSelect:", error);
      // Add better user feedback
      console.log("Failed to open file, but continuing with editor fallback");

      // Fallback: always try to open in editor
      setSelectedFile(file);
      setEditorPath(file.path);
      setActiveTab("editor");
      updateUrl("editor", file.path);
    }
  };

  const handleBackToBrowser = () => {
    setActiveTab("browser");
    updateUrl("browser", currentPath);
  };

  const handleFileCreated = useCallback((newFile?: PubkyFile) => {
    // Always return to browser after creating a file
    setActiveTab("browser");
    updateUrl("browser", currentPath);

    if (newFile) {
      setSelectedFile(null);
      // Don't auto-open the new file, just refresh the browser
    }
  }, [currentPath, updateUrl]);

  const handleFileChange = (file: PubkyFile) => {
    setSelectedFile(file);
  };

  const handleLoginClick = () => {
    setShowLoginModal(true);
  };

  const handleEditInTextEditor = (file: PubkyFile) => {
    setSelectedFile(file);
    setEditorPath(file.path);
    setActiveTab("editor");
    updateUrl("editor", file.path);
  };

  // Helper function to intelligently handle navigation to files or directories
  const handleIntelligentNavigate = useCallback(async (path: string) => {
    // Clean the path
    const cleanPath = path.trim();

    // If path ends with '/', it's definitely a directory
    if (cleanPath.endsWith("/")) {
      setCurrentPath(cleanPath);
      setActiveTab("browser");
      updateUrl("browser", cleanPath);
      return;
    }

    // If path looks like a directory path (no file extension), treat as directory
    const fileName = cleanPath.split("/").pop() || "";
    const hasExtension = fileName.includes(".") && !fileName.startsWith(".");

    if (!hasExtension) {
      // Treat as directory, add trailing slash
      const dirPath = cleanPath.endsWith("/") ? cleanPath : cleanPath + "/";
      setCurrentPath(dirPath);
      setActiveTab("browser");
      updateUrl("browser", dirPath);
      return;
    }

    // Path looks like a file, try to determine its type
    try {
      const content = await fetch(
        `/api/files/read?path=${encodeURIComponent(cleanPath)}`,
      ).then((r) => r.text());
      const metadata = blobManager.parseBlobMetadata(content);

      if (metadata) {
        // It's blob metadata, open in Media Viewer
        setImagePath(cleanPath);
        setActiveTab("image");
        updateUrl("image", cleanPath);
      } else {
        // It's a text file, open in File Editor
        setSelectedFile({
          name: fileName,
          path: cleanPath,
          isDirectory: false,
        });
        setEditorPath(cleanPath);
        setActiveTab("editor");
        updateUrl("editor", cleanPath);
      }

      // Update current path to the parent directory
      const parentPath = getParentPath(cleanPath);
      if (parentPath) {
        setCurrentPath(parentPath);
      }
    } catch (error) {
      console.error("Error reading file:", error);
      // If file doesn't exist or can't be read, treat as directory
      const dirPath = cleanPath.endsWith("/") ? cleanPath : cleanPath + "/";
      setCurrentPath(dirPath);
      setActiveTab("browser");
      updateUrl("browser", dirPath);
    }
  }, [
    blobManager,
    setCurrentPath,
    setActiveTab,
    updateUrl,
    setImagePath,
    setSelectedFile,
    setEditorPath,
    getParentPath,
  ]);

  const renderTabNavigation = () => {
    return (
      <div className="flex space-x-1 p-1 bg-muted rounded-lg">
        <button
          onClick={() => {
            setActiveTab("browser");
            updateUrl("browser", currentPath);
          }}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "browser"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          File Browser
        </button>
        <button
          onClick={() => {
            setActiveTab("editor");
            updateUrl("editor", editorPath);
          }}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "editor"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          File Editor
        </button>
        <button
          onClick={() => {
            setActiveTab("image");
            updateUrl("image", imagePath);
          }}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "image"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Media Viewer
        </button>
      </div>
    );
  };

  const renderTabContent = () => {
    return (
      <div className="space-y-4">
        {/* Read-only notice for unauthenticated users */}
        {!isAuthenticated && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>Read-only mode:</strong>{" "}
                You can browse public files but cannot edit or upload. Login to
                access your personal files.
              </p>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === "browser" && (
          <FileBrowser
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            readOnlyMode={readOnlyMode}
            currentPath={currentPath}
            onPathChange={setCurrentPath}
            onFileCreated={handleFileCreated}
          />
        )}

        {activeTab === "editor" && (
          selectedFile || editorPath
            ? (
              <ErrorBoundary
                fallback={
                  <div className="p-8 text-center">
                    <div className="text-red-600 mb-4">
                      Failed to load File Editor
                    </div>
                    <button
                      onClick={() => setActiveTab("browser")}
                      className="text-blue-600 hover:underline"
                    >
                      Return to File Browser
                    </button>
                  </div>
                }
              >
                <FileEditor
                  file={selectedFile || undefined}
                  initialPath={editorPath}
                  onFileChange={handleFileChange}
                  readOnlyMode={readOnlyMode}
                  onBackToBrowser={handleBackToBrowser}
                  onNavigateToPath={handleIntelligentNavigate}
                  currentFolderPath={currentPath}
                />
              </ErrorBoundary>
            )
            : (
              <div className="space-y-6">
                <PathBreadcrumb
                  path={currentPath || ""}
                  onNavigate={handleIntelligentNavigate}
                  showDefaultText
                  context="editor"
                  className="w-full"
                  directEditing
                />
                <div className="flex items-center justify-center h-[300px] text-center">
                  <div className="space-y-3">
                    <div className="text-muted-foreground text-lg">
                      No file selected
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Use the search above to open a file directly, or browse
                      files below
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("browser");
                        updateUrl("browser", currentPath);
                      }}
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      Go to File Browser
                    </button>
                  </div>
                </div>
              </div>
            )
        )}

        {activeTab === "image" && (
          imagePath
            ? (
              <ErrorBoundary
                fallback={
                  <div className="p-8 text-center">
                    <div className="text-red-600 mb-4">
                      Failed to load Media Viewer
                    </div>
                    <button
                      onClick={() => setActiveTab("browser")}
                      className="text-blue-600 hover:underline"
                    >
                      Return to File Browser
                    </button>
                  </div>
                }
              >
                <MediaViewer
                  filePath={imagePath}
                  onNavigateToPath={handleIntelligentNavigate}
                  onEditInTextEditor={handleEditInTextEditor}
                  onBack={handleBackToBrowser}
                  readOnlyMode={readOnlyMode}
                />
              </ErrorBoundary>
            )
            : (
              <div className="space-y-4">
                <PathBreadcrumb
                  path={currentPath || ""}
                  onNavigate={handleIntelligentNavigate}
                  context="image"
                  directEditing
                />
                <div className="flex items-center justify-center h-[400px] text-center">
                  <div className="space-y-3">
                    <div className="text-muted-foreground text-lg">
                      No image selected
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Select an image blob file from the File Browser to view it
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("browser");
                        updateUrl("browser", currentPath);
                      }}
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      Go to File Browser
                    </button>
                  </div>
                </div>
              </div>
            )
        )}
      </div>
    );
  };

  // Unified layout for both authenticated and unauthenticated users
  const content = (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1
          className={`font-bold text-foreground ${
            isAuthenticated ? "text-4xl" : "text-3xl"
          }`}
        >
          {isAuthenticated ? "Pubky Tools" : "Explore Pubky Network"}
        </h1>
        <p
          className={`text-muted-foreground max-w-2xl mx-auto ${
            isAuthenticated ? "text-xl" : ""
          }`}
        >
          {isAuthenticated
            ? "A comprehensive toolset for managing and editing files on the Pubky network. Browse, edit, and organize your decentralized content with ease."
            : "Browse public content fetched from Homeservers. Login to access your files and manage permissions."}
        </p>
      </div>

      {/* Tab Navigation */}
      {renderTabNavigation()}

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {renderTabContent()}
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );

  // Return appropriate layout based on authentication status
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <UnauthenticatedHeader onLoginClick={handleLoginClick} />
        <main className="flex-1 p-6">
          {content}
        </main>
      </div>
    );
  }

  return (
    <MainLayout>
      {content}
    </MainLayout>
  );
}

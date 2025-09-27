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
import { PubkyFile } from "@/types/index";
import { Eye } from "lucide-react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import {
  copyToClipboard,
  createFileFromPath,
  generateShareableUrl,
  getParentPath,
  getRecommendedTool,
} from "@/lib/path-utils";
import { useToast } from "@/hooks/useToast";

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
  // Track where media viewer was accessed from (browser or editor)
  const [mediaViewerSource, setMediaViewerSource] = useState<
    "browser" | "editor" | null
  >(null);

  const { showSuccess, showError } = useToast();

  const isAuthenticated = state.isAuthenticated;
  const readOnlyMode = !isAuthenticated;

  // Update URL when tab or path changes
  const updateUrl = useCallback((tool: Tab, path?: string) => {
    const params = new URLSearchParams();
    params.set("tool", tool);
    if (path) {
      params.set("path", path);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router]);

  // Enhanced initialization from URL parameters
  useEffect(() => {
    const initializeFromUrl = async () => {
      if (!initialPath) return;

      console.log("Initializing from URL:", { initialTab, initialPath });

      // Set up basic paths using utility function
      const parentPath = getParentPath(initialPath);
      setCurrentPath(parentPath);

      // Create a file object for the initial path using utility
      const fileObj = createFileFromPath(initialPath);
      setSelectedFile(fileObj);

      // Set appropriate paths based on tab
      if (initialTab === "image") {
        setImagePath(initialPath);
      } else if (initialTab === "editor") {
        setEditorPath(initialPath);
      }

      // Update active tab to match URL
      setActiveTab(initialTab);
    };

    initializeFromUrl();
  }, [initialTab, initialPath]);

  const handleFileSelect = (file: PubkyFile) => {
    console.log("handleFileSelect called with:", file);

    // Always open files in File Editor first - no more guessing or API calls
    // The FileEditor will handle detecting blob metadata and showing appropriate actions
    setSelectedFile(file);
    setEditorPath(file.path);

    // Extract parent directory from file path to preserve folder location
    const parentPath = getParentPath(file.path);
    if (parentPath) {
      setCurrentPath(parentPath);
    }

    setActiveTab("editor");
    updateUrl("editor", file.path);
  };

  const handleBackToBrowser = () => {
    // Calculate the correct path to navigate to
    let targetPath = currentPath;

    // If we're coming from media viewer, ensure we don't add extra slashes
    if (activeTab === "image" && imagePath) {
      // Get the parent directory of the current image/media file
      const pathParts = imagePath.split("/").filter(Boolean);
      if (pathParts.length > 1) {
        // Remove the filename to get the directory
        pathParts.pop();
        targetPath = "/" + pathParts.join("/");
      } else {
        targetPath = "/";
      }
    }

    setActiveTab("browser");
    setMediaViewerSource(null);
    updateUrl("browser", targetPath);
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

  const handleViewMedia = (blobPath: string) => {
    console.log("Opening blob in Media Viewer:", blobPath);
    setImagePath(blobPath);
    // Track whether we came from editor or browser
    setMediaViewerSource(activeTab === "editor" ? "editor" : "browser");
    setActiveTab("image");
    updateUrl("image", blobPath);
  };

  const handleBackToEditor = () => {
    setActiveTab("editor");
    setMediaViewerSource(null);
    updateUrl("editor", editorPath);
  };

  // Copy path functionality
  const handleCopyPath = useCallback(
    async (path: string, context?: "current" | "shareable") => {
      try {
        let textToCopy: string;

        if (context === "shareable") {
          // Generate a shareable URL
          const tool = getRecommendedTool(path.split("/").pop() || "");
          textToCopy = generateShareableUrl(path, tool);
        } else {
          // Copy the raw path
          textToCopy = path;
        }

        const success = await copyToClipboard(textToCopy);

        if (success) {
          showSuccess(
            context === "shareable"
              ? "Shareable URL copied to clipboard"
              : "Path copied to clipboard",
          );
        } else {
          showError("Failed to copy to clipboard");
        }
      } catch (error) {
        console.error("Copy failed:", error);
        showError("Failed to copy to clipboard");
      }
    },
    [showSuccess, showError],
  );

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

    // Path looks like a file, always open in File Editor first
    // The FileEditor will detect blob metadata and show "View Media" button if applicable
    setSelectedFile({
      name: fileName,
      path: cleanPath,
      isDirectory: false,
    });
    setEditorPath(cleanPath);
    setActiveTab("editor");
    updateUrl("editor", cleanPath);

    // Update current path to the parent directory
    const parentPath = getParentPath(cleanPath);
    if (parentPath) {
      setCurrentPath(parentPath);
    }
  }, [
    setCurrentPath,
    setActiveTab,
    updateUrl,
    setSelectedFile,
    setEditorPath,
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
            onCopyPath={handleCopyPath}
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
                  onViewMedia={handleViewMedia}
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
                  onBackToEditor={handleBackToEditor}
                  mediaViewerSource={mediaViewerSource}
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

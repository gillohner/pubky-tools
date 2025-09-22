"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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

type Tab = "browser" | "editor" | "image";

export default function Home() {
  const { state } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get initial state from URL params
  const initialTab = (searchParams?.get('tool') as Tab) || "browser";
  const initialPath = searchParams?.get('path') || "";
  
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [selectedFile, setSelectedFile] = useState<PubkyFile | null>(null);
  const [editorPath, setEditorPath] = useState<string>(initialPath);
  const [imagePath, setImagePath] = useState<string>("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>("");

  const blobManager = BlobManager.getInstance();

  const isAuthenticated = state.isAuthenticated;
  const readOnlyMode = !isAuthenticated;

  // Update URL when tab or path changes
  const updateUrl = useCallback((tool: Tab, path?: string) => {
    const params = new URLSearchParams();
    params.set('tool', tool);
    if (path) {
      params.set('path', path);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router]);

  // Sync initial URL parameters
  useEffect(() => {
    if (initialPath && !editorPath && !currentPath) {
      setEditorPath(initialPath);
      setCurrentPath(getParentPath(initialPath));
    }
  }, [initialPath, editorPath, currentPath]);

  const handleFileSelect = async (file: PubkyFile) => {
    // Check if file is blob metadata
    if (!file.isDirectory) {
      try {
        const content = await fetch(`/api/files/read?path=${encodeURIComponent(file.path)}`).then(r => r.text());
        const metadata = blobManager.parseBlobMetadata(content);
        
        if (metadata) {
          // Open in Media Viewer
          setImagePath(file.path);
          setActiveTab("image");
          updateUrl("image", file.path);
          return;
        }
      } catch {
        // Not blob metadata, continue with normal file handling
        console.debug("Not blob metadata, opening in editor");
      }
    }

    // Normal file handling
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
    setActiveTab("browser");
    updateUrl("browser", currentPath);
  };

  const handleFileCreated = useCallback((newFile?: PubkyFile) => {
    // Always return to browser after creating a file
    setActiveTab("browser");
    updateUrl("browser", currentPath);
    
    // If a new file was created and can be edited, optionally open it
    if (newFile && !newFile.isDirectory) {
      // For now, just stay in browser - user can click to open
      // Future: could add preference to auto-open created files
    }
  }, [currentPath, updateUrl]);

  const handleNavigateToPath = (path: string) => {
    setCurrentPath(path);
    setActiveTab("browser");
    updateUrl("browser", path);
  };

  const handleEditInTextEditor = (file: PubkyFile) => {
    setSelectedFile(file);
    setEditorPath(file.path);
    setActiveTab("editor");
    updateUrl("editor", file.path);
  };

  const getParentPath = (filePath: string): string => {
    if (!filePath) return "";
    
    // Remove trailing slash if present
    const normalizedPath = filePath.endsWith("/") ? filePath.slice(0, -1) : filePath;
    
    // Find the last slash
    const lastSlashIndex = normalizedPath.lastIndexOf("/");
    if (lastSlashIndex === -1) return "";
    
    // Return parent directory with trailing slash
    return normalizedPath.substring(0, lastSlashIndex + 1);
  };

  const handleFileChange = (updatedFile: PubkyFile) => {
    setSelectedFile(updatedFile);
  };

  const handleLoginClick = () => {
    setShowLoginModal(true);
  };

  // Render tab navigation component
  const renderTabNavigation = () => (
    <div className="flex justify-center">
      <div className="bg-muted p-1 rounded-lg">
        <button
          type="button"
          onClick={() => {
            setActiveTab("browser");
            updateUrl("browser", currentPath);
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "browser"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          File Browser
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("editor");
            updateUrl("editor", editorPath);
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "editor"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          File Editor
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("image");
            updateUrl("image", imagePath);
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "image"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Media Viewer
        </button>
      </div>
    </div>
  );

  // Render tab content component
  const renderTabContent = () => (
    <div className="space-y-4">
      {/* Read-only mode notice for unauthenticated users */}
      {readOnlyMode && (
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
            <FileEditor
              file={selectedFile || undefined}
              initialPath={editorPath}
              onFileChange={handleFileChange}
              readOnlyMode={readOnlyMode}
              onBackToBrowser={handleBackToBrowser}
              onNavigateToPath={handleNavigateToPath}
              currentFolderPath={currentPath}
            />
          )
          : (
            <div className="space-y-6">
              <PathBreadcrumb 
                path={currentPath || ""}
                onNavigate={(path: string) => {
                  // Try to open the file if it exists
                  setEditorPath(path);
                  setActiveTab("editor");
                  updateUrl("editor", path);
                }}
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
                    Use the search above to open a file directly, or browse files below
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
            <MediaViewer
              filePath={imagePath}
              onNavigateToPath={handleNavigateToPath}
              onEditInTextEditor={handleEditInTextEditor}
              onBack={handleBackToBrowser}
              readOnlyMode={readOnlyMode}
            />
          )
          : (
            <div className="space-y-4">
              <PathBreadcrumb
                path={currentPath || ""}
                onNavigate={handleNavigateToPath}
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

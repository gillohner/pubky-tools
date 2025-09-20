"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { FileBrowser } from "@/components/tools/FileBrowser";
import { FileEditor } from "@/components/tools/FileEditor";
import { LoginModal } from "@/components/auth/LoginModal";
import { UnauthenticatedHeader } from "@/components/layout/UnauthenticatedHeader";
import { useAuth } from "@/components/auth/AuthProvider";
import { PubkyFile } from "@/types/index";
import { Eye } from "lucide-react";

type Tab = "browser" | "editor";

export default function Home() {
  const { state } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("browser");
  const [selectedFile, setSelectedFile] = useState<PubkyFile | null>(null);
  const [editorPath, setEditorPath] = useState<string>("");
  const [showLoginModal, setShowLoginModal] = useState(false);

  const isAuthenticated = state.isAuthenticated;
  const readOnlyMode = !isAuthenticated;

  const handleFileSelect = (file: PubkyFile) => {
    setSelectedFile(file);
    setEditorPath(file.path);
    setActiveTab("editor");
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
          onClick={() => setActiveTab("browser")}
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
          onClick={() => setActiveTab("editor")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "editor"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          File Editor
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
            />
          )
          : (
            <div className="flex items-center justify-center h-[400px] text-center">
              <div className="space-y-3">
                <div className="text-muted-foreground text-lg">
                  No file selected
                </div>
                <div className="text-sm text-muted-foreground">
                  Select a file from the File Browser tab{!readOnlyMode
                    ? " or create a new file"
                    : ""} to start {readOnlyMode ? "viewing" : "editing"}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("browser")}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Go to File Browser
                </button>
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

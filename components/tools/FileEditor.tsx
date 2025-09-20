"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/AuthProvider";
import { FileOperations } from "@/lib/file-operations";
import { FileSchema, PubkyFile } from "@/types/index";
import { getFileExtension, hasWriteAccess, isOwnPath } from "@/lib/utils";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Code,
  Download,
  Edit,
  Eye,
  FileText,
  Maximize2,
  Minimize2,
  RefreshCw,
  Save,
  Search,
  Type,
} from "lucide-react";

interface FileEditorProps {
  file?: PubkyFile;
  initialPath?: string;
  onFileChange?: (file: PubkyFile) => void;
  readOnlyMode?: boolean;
}

const FILE_SCHEMAS: { [key: string]: FileSchema } = {
  "json": {
    id: "json",
    name: "JSON",
    extensions: [".json"],
    validate: (content: string) => {
      try {
        JSON.parse(content);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: `Invalid JSON: ${error}` };
      }
    },
    format: (content: string) => {
      try {
        return JSON.stringify(JSON.parse(content), null, 2);
      } catch {
        return content;
      }
    },
  },
  "javascript": {
    id: "javascript",
    name: "JavaScript",
    extensions: [".js", ".mjs"],
    validate: (content: string) => {
      // Basic JavaScript syntax validation
      try {
        // This is a basic check - in a real implementation you might use a proper JS parser
        new Function(content);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: `Invalid JavaScript: ${error}` };
      }
    },
    format: (content: string) => {
      // Basic formatting - just ensure proper line endings
      return content.replace(/;\s*\n/g, ";\n").replace(/\{\s*\n/g, "{\n")
        .replace(/\}\s*\n/g, "}\n");
    },
  },
  "typescript": {
    id: "typescript",
    name: "TypeScript",
    extensions: [".ts", ".tsx"],
    validate: (content: string) => {
      // Basic TypeScript syntax validation (similar to JS)
      try {
        // Remove TypeScript-specific syntax for basic validation
        const jsContent = content
          .replace(/:\s*\w+(\[\])?/g, "") // Remove type annotations
          .replace(/interface\s+\w+\s*\{[^}]*\}/g, "") // Remove interfaces
          .replace(/type\s+\w+\s*=\s*[^;]+;/g, ""); // Remove type aliases

        new Function(jsContent);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: `Invalid TypeScript: ${error}` };
      }
    },
    format: (content: string) => content,
  },
  "markdown": {
    id: "markdown",
    name: "Markdown",
    extensions: [".md", ".markdown"],
    validate: () => ({ valid: true }), // Markdown is always valid
    format: (content: string) => content, // No auto-formatting for markdown
  },
  "text": {
    id: "text",
    name: "Plain Text",
    extensions: [".txt", ".log"],
    validate: () => ({ valid: true }),
    format: (content: string) => content,
  },
  "css": {
    id: "css",
    name: "CSS",
    extensions: [".css"],
    validate: (content: string) => {
      // Basic CSS validation - check for balanced braces
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;

      if (openBraces !== closeBraces) {
        return { valid: false, error: "Unbalanced braces in CSS" };
      }

      return { valid: true };
    },
    format: (content: string) => {
      // Basic CSS formatting
      return content
        .replace(/\{/g, " {\n  ")
        .replace(/\}/g, "\n}\n")
        .replace(/;/g, ";\n  ")
        .replace(/\n\s*\n/g, "\n");
    },
  },
  "html": {
    id: "html",
    name: "HTML",
    extensions: [".html", ".htm"],
    validate: (content: string) => {
      // Basic HTML validation - check for balanced tags
      const openTags = content.match(/<\w+[^>]*>/g) || [];
      const closeTags = content.match(/<\/\w+>/g) || [];
      const selfClosingTags = content.match(/<\w+[^>]*\/>/g) || [];

      // This is a very basic check
      if (openTags.length - selfClosingTags.length !== closeTags.length) {
        return { valid: false, error: "Potentially unbalanced HTML tags" };
      }

      return { valid: true };
    },
    format: (content: string) => content,
  },
  "yaml": {
    id: "yaml",
    name: "YAML",
    extensions: [".yml", ".yaml"],
    validate: (content: string) => {
      // Basic YAML validation - check indentation consistency
      const lines = content.split("\n");
      let isValid = true;
      let errorMsg = "";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() && line.includes("\t")) {
          isValid = false;
          errorMsg = `YAML should use spaces, not tabs (line ${i + 1})`;
          break;
        }
      }

      return isValid ? { valid: true } : { valid: false, error: errorMsg };
    },
    format: (content: string) => content,
  },
};

export function FileEditor(
  { file, initialPath, onFileChange, readOnlyMode = false }: FileEditorProps,
) {
  const { state } = useAuth();
  const { showSuccess, showError } = useToast();
  const [currentFile, setCurrentFile] = useState<PubkyFile | null>(
    file || null,
  );
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationResult, setValidationResult] = useState<
    { valid: boolean; error?: string } | null
  >(null);
  const [filePath, setFilePath] = useState(initialPath || "");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fileOps = FileOperations.getInstance();

  // Check if user has write access to current file
  const currentFilePath = currentFile?.path || filePath;
  const canWrite = state.user && currentFilePath
    ? hasWriteAccess(
      state.user.publicKey,
      state.user.capabilities || [],
      currentFilePath,
    )
    : false;
  const isOwn = state.user && currentFilePath
    ? isOwnPath(state.user.publicKey, currentFilePath)
    : false;

  // useCallback functions defined before useEffect hooks
  const loadFile = useCallback(async () => {
    if (!currentFile) return;

    setIsLoading(true);

    try {
      const fileContent = await fileOps.readFile(currentFile.path);
      // Handle both empty files (null/empty string) and actual content
      const content = fileContent || "";
      setContent(content);
      setOriginalContent(content);
      setHasUnsavedChanges(false);
      setIsCreatingNew(false);
    } catch (error) {
      showError(`Failed to load file: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentFile, fileOps, showError]);

  const validateContent = useCallback(() => {
    const fileName = currentFile?.name || filePath.split("/").pop() || "";
    const schema = getFileSchema(fileName);

    if (schema?.validate) {
      const result = schema.validate(content);
      setValidationResult(result);
    } else {
      setValidationResult({ valid: true });
    }
  }, [currentFile?.name, filePath, content]);

  const handleAutoSave = useCallback(async () => {
    if (!validationResult?.valid || !currentFile || readOnlyMode) return;

    try {
      await fileOps.updateFile(currentFile.path, content);
      setOriginalContent(content);
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      console.log("Auto-saved at", new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  }, [validationResult?.valid, currentFile, fileOps, content, readOnlyMode]);

  // Auto-save interval (30 seconds)
  useEffect(() => {
    if (!hasUnsavedChanges || !currentFile || readOnlyMode) return;

    const interval = setInterval(() => {
      if (hasUnsavedChanges && content !== originalContent) {
        handleAutoSave();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [
    hasUnsavedChanges,
    content,
    originalContent,
    currentFile,
    handleAutoSave,
    readOnlyMode,
  ]);

  // Load file when currentFile changes
  useEffect(() => {
    if (currentFile) {
      loadFile();
    } else if (filePath) {
      // Creating a new file
      setContent("");
      setOriginalContent("");
      setHasUnsavedChanges(false);
      setIsCreatingNew(true);
    }
  }, [currentFile, filePath, loadFile]);

  // Validate content when it changes
  useEffect(() => {
    if (currentFile || filePath) {
      validateContent();
    }
  }, [content, currentFile, filePath, validateContent]);

  // Track unsaved changes
  useEffect(() => {
    if (!readOnlyMode) {
      setHasUnsavedChanges(content !== originalContent);
    }
  }, [content, originalContent, readOnlyMode]);

  const getFileSchema = (fileName: string): FileSchema | null => {
    const extension = getFileExtension(fileName);
    return Object.values(FILE_SCHEMAS).find((schema) =>
      schema.extensions.includes(extension)
    ) || null;
  };

  const formatContent = () => {
    const fileName = currentFile?.name || filePath.split("/").pop() || "";
    const schema = getFileSchema(fileName);

    if (schema?.format) {
      const formatted = schema.format(content);
      setContent(formatted);
      showSuccess("Content formatted successfully");
    } else {
      showError("No formatter available for this file type");
    }
  };

  const handleSave = async () => {
    if (!validationResult?.valid || readOnlyMode) {
      if (readOnlyMode) {
        showError("Cannot save in read-only mode");
      } else {
        showError("Cannot save file with validation errors");
      }
      return;
    }

    setIsSaving(true);

    try {
      const pathToSave = currentFile?.path || filePath;
      if (!pathToSave) {
        showError("No file path specified");
        return;
      }

      const success = await fileOps.updateFile(pathToSave, content);

      if (success) {
        setOriginalContent(content);
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
        setIsCreatingNew(false);

        if (!currentFile) {
          // Creating new file
          const newFile: PubkyFile = {
            name: pathToSave.split("/").pop() || "untitled",
            path: pathToSave,
            isDirectory: false,
            size: content.length,
            lastModified: new Date().toISOString(),
          };
          setCurrentFile(newFile);
          onFileChange?.(newFile);
        }

        showSuccess("File saved successfully");
      } else {
        showError("Failed to save file");
      }
    } catch (error) {
      showError(`Failed to save file: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewFile = () => {
    if (hasUnsavedChanges && !readOnlyMode) {
      if (
        !confirm(
          "You have unsaved changes. Are you sure you want to create a new file?",
        )
      ) {
        return;
      }
    }

    setCurrentFile(null);
    setContent("");
    setOriginalContent("");
    setHasUnsavedChanges(false);
    setIsCreatingNew(true);
    setFilePath("");
  };

  const handleDownload = () => {
    if (!currentFile && !filePath) return;

    const fileName = currentFile?.name || filePath.split("/").pop() ||
      "untitled.txt";
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSuccess(`Downloaded ${fileName}`);
  };

  const fileName = currentFile?.name || filePath.split("/").pop() || "untitled";
  const fileExtension = getFileExtension(fileName);
  const schema = getFileSchema(fileName);

  return (
    <div
      className={`space-y-4 ${
        isFullscreen ? "fixed inset-0 z-50 bg-background p-4" : ""
      }`}
    >
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>File Editor</span>
              {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
              {hasUnsavedChanges && <span className="text-orange-600">●</span>}
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen
                  ? <Minimize2 className="h-4 w-4" />
                  : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Read-only warning */}
          {currentFilePath && !canWrite && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Read-only mode
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    You don&apos;t have write access to this file.
                    {isOwn
                      ? (
                        <span>
                          You can{" "}
                          <Link
                            href="/profile"
                            className="underline font-medium text-yellow-800 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-yellow-100"
                          >
                            add write permissions
                          </Link>{" "}
                          in your Profile.
                        </span>
                      )
                      : (
                        " This file belongs to another user."
                      )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* File info and actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {isCreatingNew
                ? (
                  <Input
                    placeholder="Enter file path (e.g., /pub/example.com/document.txt)"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    className="w-96"
                  />
                )
                : (
                  <div>
                    <div className="font-medium">{fileName}</div>
                    <div className="text-sm text-gray-500">
                      {currentFile?.path}
                      {schema && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {schema.name}
                        </span>
                      )}
                    </div>
                  </div>
                )}
            </div>

            <div className="flex items-center space-x-2">
              {!readOnlyMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewFile}
                  disabled={!canWrite}
                  title={!canWrite
                    ? "No write access to create files"
                    : undefined}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  New
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              {schema?.format && canWrite && !readOnlyMode && (
                <Button variant="outline" size="sm" onClick={formatContent}>
                  <Code className="h-4 w-4 mr-1" />
                  Format
                </Button>
              )}
              {!readOnlyMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditMode(!isEditMode)}
                  disabled={!canWrite}
                  title={!canWrite
                    ? "View-only mode (no write access)"
                    : isEditMode
                    ? "Switch to view mode"
                    : "Switch to edit mode"}
                >
                  {isEditMode
                    ? <Eye className="h-4 w-4" />
                    : <Edit className="h-4 w-4" />}
                  {isEditMode ? "View" : "Edit"}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
              >
                {previewMode
                  ? <Type className="h-4 w-4" />
                  : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between text-sm bg-muted/50 dark:bg-muted/30 p-2 rounded">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                {validationResult?.valid
                  ? (
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  )
                  : (
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                <span
                  className={validationResult?.valid
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"}
                >
                  {validationResult?.valid ? "Valid" : validationResult?.error}
                </span>
              </div>

              <div className="text-muted-foreground">
                {content.length} characters • {content.split("\n").length} lines
              </div>

              {lastSaved && (
                <div className="flex items-center space-x-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Saved {lastSaved.toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 h-8"
              />
              <Search className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Editor */}
          <div
            className="border rounded-md"
            style={{ height: isFullscreen ? "calc(100vh - 200px)" : "400px" }}
          >
            {isLoading
              ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              )
              : previewMode && fileExtension === ".md"
              ? (
                <div
                  className="p-4 prose max-w-none overflow-auto h-full bg-card"
                  dangerouslySetInnerHTML={{
                    __html: content.replace(/\n/g, "<br>"),
                  }}
                />
              )
              : previewMode
              ? (
                <div
                  className="w-full h-full p-4 bg-card border border-border rounded prose prose-invert max-w-none overflow-auto"
                  style={{
                    minHeight: isFullscreen ? "calc(100vh - 200px)" : "400px",
                  }}
                  dangerouslySetInnerHTML={{
                    __html: content.replace(/\n/g, "<br>"),
                  }}
                />
              )
              : (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) =>
                    (canWrite && isEditMode && !readOnlyMode)
                      ? setContent(e.target.value)
                      : undefined}
                  readOnly={!canWrite || !isEditMode || readOnlyMode}
                  className={`w-full h-full p-4 font-mono text-sm border border-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground ${
                    (!canWrite || !isEditMode || readOnlyMode)
                      ? "bg-muted/30 text-muted-foreground cursor-default"
                      : ""
                  }`}
                  placeholder={isCreatingNew
                    ? "Start typing your content here..."
                    : "Loading..."}
                  style={{
                    minHeight: isFullscreen ? "calc(100vh - 200px)" : "400px",
                  }}
                />
              )}
          </div>

          {/* Save button */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {hasUnsavedChanges && !readOnlyMode &&
                "Unsaved changes • Auto-save in 30s"}
            </div>

            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving ||
                !validationResult?.valid || !canWrite || readOnlyMode}
              className="min-w-24"
              title={!canWrite || readOnlyMode
                ? "No write access to save this file"
                : undefined}
            >
              {isSaving
                ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                    Saving...
                  </>
                )
                : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    {(canWrite && !readOnlyMode) ? "Save" : "Read-only"}
                  </>
                )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

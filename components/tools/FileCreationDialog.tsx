"use client";

import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BlobManager } from "@/lib/blob-manager";
import { FileOperations } from "@/lib/file-operations";
import { useToast } from "@/hooks/useToast";
import {
  Code,
  Database,
  File,
  FileText,
  FolderPlus,
  Settings,
  Type,
  Upload,
  X,
} from "lucide-react";

interface FileCreationModalProps {
  currentPath: string;
  userPublicKey: string;
  onFileCreated: () => void;
  onCancel: () => void;
}

interface FileUploadProps {
  currentPath: string;
  userPublicKey: string;
  onFileCreated: () => void;
  onCancel: () => void;
}

// File Upload Component - supports any file type as blob
export function FileUpload({
  currentPath,
  userPublicKey,
  onFileCreated,
  onCancel,
}: FileUploadProps) {
  const { showSuccess, showError } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobManager = BlobManager.getInstance();

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Extract the base path for pubky structure
      const basePath = currentPath.replace(`pubky://${userPublicKey}`, "");

      // Use the general uploadFile method for any file type
      await blobManager.uploadFile(file, basePath, userPublicKey);

      showSuccess(`File "${file.name}" uploaded successfully`);
      onFileCreated();
    } catch (error) {
      console.error("Error uploading file:", error);
      showError(`Failed to upload file: ${error}`);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Upload File</CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Select any file to upload. Supported formats: images, videos, audio,
          documents, archives, and more.
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div className="flex space-x-3">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 flex-1 h-12"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? "Uploading..." : "Choose File"}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isUploading}
            className="h-12"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// File Creation Modal - for creating text-based files
export function FileCreationModal({
  currentPath,
  userPublicKey: _userPublicKey, // eslint-disable-line @typescript-eslint/no-unused-vars
  onFileCreated,
  onCancel,
}: FileCreationModalProps) {
  const { showSuccess, showError } = useToast();
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<string>("text");
  const [isCreating, setIsCreating] = useState(false);

  const fileOps = FileOperations.getInstance();

  // File types with their extensions and templates
  const fileTypes = {
    // Basic files
    text: { ext: "", name: "Plain Text", template: "" },

    // Data formats
    json: {
      ext: ".json",
      name: "JSON",
      template: JSON.stringify(
        {
          "name": "example",
          "version": "1.0.0",
          "description": "A sample JSON file",
        },
        null,
        2,
      ),
    },
    xml: {
      ext: ".xml",
      name: "XML",
      template: `<?xml version="1.0" encoding="UTF-8"?>
<root>
    <item id="1">
        <name>Example Item</name>
        <description>This is a sample XML file</description>
    </item>
</root>`,
    },
    yaml: {
      ext: ".yml",
      name: "YAML",
      template: `# YAML Configuration File
name: example
version: 1.0.0
description: A sample YAML file

settings:
  debug: false
  timeout: 30`,
    },
    csv: {
      ext: ".csv",
      name: "CSV",
      template: `Name,Age,City,Country
John Doe,30,New York,USA
Jane Smith,25,London,UK`,
    },

    // Web development
    html: {
      ext: ".html",
      name: "HTML",
      template: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Page</title>
</head>
<body>
    <h1>Hello, World!</h1>
    <p>This is a new HTML page.</p>
</body>
</html>`,
    },
    css: {
      ext: ".css",
      name: "CSS",
      template: `/* CSS Stylesheet */
body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    margin: 0;
    padding: 20px;
}

h1 {
    color: #333;
    border-bottom: 2px solid #007acc;
}

p {
    color: #666;
    margin: 10px 0;
}`,
    },
    javascript: {
      ext: ".js",
      name: "JavaScript",
      template: `// JavaScript file
console.log("Hello, World!");

function greet(name) {
  return \`Hello, \${name}!\`;
}

const message = greet("User");
console.log(message);`,
    },
    typescript: {
      ext: ".ts",
      name: "TypeScript",
      template: `// TypeScript file
interface User {
  name: string;
  age: number;
  email?: string;
}

function greet(user: User): string {
  return \`Hello, \${user.name}!\`;
}

const user: User = {
  name: "John Doe",
  age: 30
};

console.log(greet(user));`,
    },

    // Documentation
    markdown: {
      ext: ".md",
      name: "Markdown",
      template: `# New Document

This is a **markdown** file. You can use:

- **Bold text**
- *Italic text*
- [Links](https://example.com)
- \`code\`

## Getting Started

Edit this file to add your content!`,
    },

    // Programming languages
    python: {
      ext: ".py",
      name: "Python",
      template: `#!/usr/bin/env python3
"""
Python script template
"""

def main():
    """Main function"""
    print("Hello, World!")
    
    name = "User"
    greeting = greet(name)
    print(greeting)

def greet(name):
    """Return a greeting message"""
    return f"Hello, {name}!"

if __name__ == "__main__":
    main()`,
    },

    // Configuration files
    dockerfile: {
      ext: "",
      name: "Dockerfile",
      template: `# Dockerfile for containerized application
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]`,
    },

    // Other useful files
    sql: {
      ext: ".sql",
      name: "SQL",
      template: `-- SQL Database Script
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (name, email) VALUES 
    ('John Doe', 'john@example.com'),
    ('Jane Smith', 'jane@example.com');

SELECT * FROM users;`,
    },
  };

  const handleCreateFile = async () => {
    if (!fileName.trim()) {
      showError("Please enter a file name");
      return;
    }

    setIsCreating(true);
    try {
      const selectedType = fileTypes[fileType as keyof typeof fileTypes];

      // Handle special naming for certain file types
      let finalName: string;
      if (fileType === "dockerfile") {
        finalName = fileName.includes(".") ? fileName : "Dockerfile";
      } else {
        const extension = selectedType.ext;
        finalName = fileName.includes(".")
          ? fileName
          : `${fileName}${extension}`;
      }

      const filePath = `${currentPath}/${finalName}`;
      const content = selectedType.template;

      const success = await fileOps.createFile(filePath, content);

      if (success) {
        showSuccess(
          `${selectedType.name} file "${finalName}" created successfully`,
        );
        onFileCreated();
      } else {
        showError("Failed to create file");
      }
    } catch (error) {
      console.error("Error creating file:", error);
      showError(`Failed to create file: ${error}`);
    } finally {
      setIsCreating(false);
    }
  };

  const selectedType = fileTypes[fileType as keyof typeof fileTypes];
  const exampleName = fileType === "dockerfile"
    ? "Dockerfile"
    : `example${selectedType.ext}`;

  const getIcon = () => {
    switch (fileType) {
      case "html":
      case "css":
      case "javascript":
      case "typescript":
        return <Code className="h-4 w-4" />;
      case "json":
      case "xml":
      case "yaml":
        return <Settings className="h-4 w-4" />;
      case "csv":
      case "sql":
        return <Database className="h-4 w-4" />;
      case "markdown":
        return <FileText className="h-4 w-4" />;
      case "python":
        return <Code className="h-4 w-4" />;
      case "dockerfile":
        return <Settings className="h-4 w-4" />;
      default:
        return <Type className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Create New File</CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">File Type</label>
          <select
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
            disabled={isCreating}
          >
            <optgroup label="Basic">
              <option value="text">Plain Text</option>
              <option value="markdown">Markdown</option>
            </optgroup>
            <optgroup label="Data">
              <option value="json">JSON</option>
              <option value="xml">XML</option>
              <option value="yaml">YAML</option>
              <option value="csv">CSV</option>
            </optgroup>
            <optgroup label="Web">
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
            </optgroup>
            <optgroup label="Programming">
              <option value="python">Python</option>
              <option value="sql">SQL</option>
            </optgroup>
            <optgroup label="System">
              <option value="dockerfile">Dockerfile</option>
            </optgroup>
          </select>
        </div>

        {/* File Name Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            {getIcon()}
            File Name
          </label>
          <Input
            placeholder={`Enter file name (e.g., ${exampleName})`}
            value={fileName}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setFileName(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter" && fileName.trim() && !isCreating) {
                handleCreateFile();
              }
            }}
            disabled={isCreating}
          />
        </div>

        {/* Template Preview */}
        {selectedType.template && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Template Preview</label>
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded max-h-20 overflow-y-auto font-mono">
              {selectedType.template.slice(0, 200)}
              {selectedType.template.length > 200 && "..."}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3 pt-2">
          <Button
            onClick={handleCreateFile}
            disabled={isCreating || !fileName.trim()}
            className="flex-1 h-12"
          >
            {isCreating ? "Creating..." : "Create File"}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isCreating}
            className="h-12"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Component that handles the dropdown and modal states
interface FileCreationDialogProps {
  isOpen: boolean;
  currentPath: string;
  userPublicKey: string;
  onFileCreated: () => void;
  onCancel: () => void;
}

export function FileCreationDialog({
  isOpen,
  currentPath,
  userPublicKey,
  onFileCreated,
  onCancel,
}: FileCreationDialogProps) {
  const [mode, setMode] = useState<"menu" | "create" | "upload" | "folder">(
    "menu",
  );
  const { showSuccess, showError } = useToast();
  const [folderName, setFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const fileOps = FileOperations.getInstance();

  // Reset mode when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMode("menu");
      setFolderName("");
      setIsCreating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      showError("Please enter a folder name");
      return;
    }

    setIsCreating(true);
    try {
      const folderPath = `${currentPath}/${folderName}`;
      const success = await fileOps.createDirectory(folderPath);

      if (success) {
        showSuccess(`Folder "${folderName}" created successfully`);
        onFileCreated();
      } else {
        showError("Failed to create folder");
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      showError(`Failed to create folder: ${error}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const renderContent = () => {
    if (mode === "create") {
      return (
        <FileCreationModal
          currentPath={currentPath}
          userPublicKey={userPublicKey}
          onFileCreated={onFileCreated}
          onCancel={() => setMode("menu")}
        />
      );
    }

    if (mode === "upload") {
      return (
        <FileUpload
          currentPath={currentPath}
          userPublicKey={userPublicKey}
          onFileCreated={onFileCreated}
          onCancel={() => setMode("menu")}
        />
      );
    }

    if (mode === "folder") {
      return (
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Create Folder</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setMode("menu")}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <FolderPlus className="h-4 w-4" />
                Folder Name
              </label>
              <Input
                placeholder="Enter folder name"
                value={folderName}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setFolderName(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter" && folderName.trim() && !isCreating) {
                    handleCreateFolder();
                  }
                }}
                disabled={isCreating}
              />
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={handleCreateFolder}
                disabled={isCreating || !folderName.trim()}
                className="flex-1 h-12"
              >
                {isCreating ? "Creating..." : "Create Folder"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setMode("menu")}
                disabled={isCreating}
                className="h-12"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Default menu
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">New...</CardTitle>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => setMode("create")}
            variant="outline"
            className="w-full justify-start h-16 p-4"
          >
            <File className="h-5 w-5 mr-3 flex-shrink-0" />
            <div className="text-left">
              <div className="font-medium">Create File</div>
              <div className="text-xs text-muted-foreground mt-1">
                Text-based files with templates
              </div>
            </div>
          </Button>

          <Button
            onClick={() => setMode("upload")}
            variant="outline"
            className="w-full justify-start h-16 p-4"
          >
            <Upload className="h-5 w-5 mr-3 flex-shrink-0" />
            <div className="text-left">
              <div className="font-medium">Upload File</div>
              <div className="text-xs text-muted-foreground mt-1">
                Any file type (images, videos, docs, etc.)
              </div>
            </div>
          </Button>

          <Button
            onClick={() => setMode("folder")}
            variant="outline"
            className="w-full justify-start h-16 p-4"
          >
            <FolderPlus className="h-5 w-5 mr-3 flex-shrink-0" />
            <div className="text-left">
              <div className="font-medium">Create Folder</div>
              <div className="text-xs text-muted-foreground mt-1">New directory</div>
            </div>
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    >
      {renderContent()}
    </div>
  );
}

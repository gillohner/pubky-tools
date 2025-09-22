"use client";

import { ChangeEvent, KeyboardEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BlobManager } from "@/lib/blob-manager";
import { FileOperations } from "@/lib/file-operations";
import { FileCreateOptions } from "@/types/index";
import { useToast } from "@/hooks/useToast";
import {
  File,
  FolderPlus,
  Image as ImageIcon,
  Type,
  Upload,
  X,
} from "lucide-react";

interface FileCreationDialogProps {
  currentPath: string;
  userPublicKey: string;
  onFileCreated: () => void;
  onCancel: () => void;
}

export function FileCreationDialog({
  currentPath,
  userPublicKey,
  onFileCreated,
  onCancel,
}: FileCreationDialogProps) {
  const { showSuccess, showError } = useToast();
  const [createType, setCreateType] = useState<FileCreateOptions["type"] | null>(null);
  const [fileName, setFileName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileOps = FileOperations.getInstance();
  const blobManager = BlobManager.getInstance();

  const handleCreateText = async () => {
    if (!fileName.trim()) {
      showError("Please enter a file name");
      return;
    }

    setIsCreating(true);
    try {
      const filePath = `${currentPath}/${fileName}`;
      const success = await fileOps.createFile(filePath, "");
      
      if (success) {
        showSuccess(`File "${fileName}" created successfully`);
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

  const handleCreateJson = async () => {
    if (!fileName.trim()) {
      showError("Please enter a file name");
      return;
    }

    const finalName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
    
    setIsCreating(true);
    try {
      const filePath = `${currentPath}/${finalName}`;
      const defaultJson = JSON.stringify({}, null, 2);
      const success = await fileOps.createFile(filePath, defaultJson);
      
      if (success) {
        showSuccess(`JSON file "${finalName}" created successfully`);
        onFileCreated();
      } else {
        showError("Failed to create JSON file");
      }
    } catch (error) {
      console.error("Error creating JSON file:", error);
      showError(`Failed to create JSON file: ${error}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!fileName.trim()) {
      showError("Please enter a folder name");
      return;
    }

    setIsCreating(true);
    try {
      const folderPath = `${currentPath}/${fileName}`;
      const success = await fileOps.createDirectory(folderPath);
      
      if (success) {
        showSuccess(`Folder "${fileName}" created successfully`);
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

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError("Only image files are supported for blob upload");
      return;
    }

    setIsCreating(true);
    try {
      // Extract the base path for pubky structure
      const basePath = currentPath.replace(`pubky://${userPublicKey}`, "");
      
      await blobManager.uploadImage(file, basePath, userPublicKey);
      
      showSuccess(`Image "${file.name}" uploaded successfully`);
      onFileCreated();
    } catch (error) {
      console.error("Error uploading image:", error);
      showError(`Failed to upload image: ${error}`);
    } finally {
      setIsCreating(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getActionButton = () => {
    switch (createType) {
      case 'text':
        return (
          <Button 
            onClick={handleCreateText} 
            size="sm" 
            disabled={isCreating || !fileName.trim()}
          >
            {isCreating ? "Creating..." : "Create Text File"}
          </Button>
        );
      case 'json':
        return (
          <Button 
            onClick={handleCreateJson} 
            size="sm" 
            disabled={isCreating || !fileName.trim()}
          >
            {isCreating ? "Creating..." : "Create JSON File"}
          </Button>
        );
      case 'folder':
        return (
          <Button 
            onClick={handleCreateFolder} 
            size="sm" 
            disabled={isCreating || !fileName.trim()}
          >
            {isCreating ? "Creating..." : "Create Folder"}
          </Button>
        );
      case 'image':
        return (
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            size="sm" 
            disabled={isCreating}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isCreating ? "Uploading..." : "Choose Image"}
          </Button>
        );
      default:
        return null;
    }
  };

  if (!createType) {
    return (
      <div className="p-4 border rounded-md bg-muted/30">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium">Create New...</h3>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => setCreateType('text')}
            className="flex items-center gap-2 h-auto p-3"
          >
            <Type className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Text File</div>
              <div className="text-xs text-muted-foreground">Create a plain text file</div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setCreateType('json')}
            className="flex items-center gap-2 h-auto p-3"
          >
            <File className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">JSON File</div>
              <div className="text-xs text-muted-foreground">Create a JSON data file</div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setCreateType('folder')}
            className="flex items-center gap-2 h-auto p-3"
          >
            <FolderPlus className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Folder</div>
              <div className="text-xs text-muted-foreground">Create a new directory</div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setCreateType('image')}
            className="flex items-center gap-2 h-auto p-3"
          >
            <ImageIcon className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Image</div>
              <div className="text-xs text-muted-foreground">Upload an image as blob</div>
            </div>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-md bg-muted/30">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium">
          Create {createType === 'text' ? 'Text File' : 
                 createType === 'json' ? 'JSON File' :
                 createType === 'folder' ? 'Folder' : 'Image Upload'}
        </h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {createType !== 'image' ? (
        <div className="space-y-3">
          <Input
            placeholder={
              createType === 'folder' 
                ? "Enter folder name" 
                : `Enter file name${createType === 'json' ? ' (e.g., data.json)' : ' (e.g., document.txt)'}`
            }
            value={fileName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFileName(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter" && fileName.trim() && !isCreating) {
                if (createType === 'text') handleCreateText();
                else if (createType === 'json') handleCreateJson();
                else if (createType === 'folder') handleCreateFolder();
              }
            }}
            disabled={isCreating}
          />
          <div className="flex space-x-2">
            {getActionButton()}
            <Button
              variant="outline"
              onClick={() => setCreateType(null)}
              size="sm"
              disabled={isCreating}
            >
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Select an image file to upload as a blob with metadata.
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="flex space-x-2">
            {getActionButton()}
            <Button
              variant="outline"
              onClick={() => setCreateType(null)}
              size="sm"
              disabled={isCreating}
            >
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
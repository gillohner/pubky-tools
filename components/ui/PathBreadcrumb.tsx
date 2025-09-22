"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import { useToast } from "@/hooks/useToast";
import { ChevronRight, Copy, Edit, Home } from "lucide-react";

interface PathBreadcrumbProps {
  path: string;
  onNavigate?: (path: string) => void;
  className?: string;
  showCopyButton?: boolean;
  maxLength?: number;
  showDefaultText?: boolean;
  defaultText?: string;
  context?: "browser" | "editor" | "image";
  directEditing?: boolean; // New prop for direct editing without edit button
}

export function PathBreadcrumb({ 
  path, 
  onNavigate, 
  className = "",
  showCopyButton = true,
  maxLength = 80,
  showDefaultText = false,
  defaultText = "Click to navigate or search...",
  context = "browser",
  directEditing = false
}: PathBreadcrumbProps) {
  const { showSuccess } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const getContextualDefaultText = () => {
    if (defaultText !== "Click to navigate or search...") return defaultText;
    
    switch (context) {
      case "browser":
        return "Enter pubky:// URL, pk:user123..., or /path to navigate";
      case "editor":
        return "No file selected - Browse files or enter pubky:// URL to open";
      case "image":
        return "No image selected - Browse for image blob files or enter pubky:// URL";
      default:
        return "Click to navigate or search...";
    }
  };

  const getPathSegments = useCallback((): { segments: string[]; originalSegments: string[] } => {
    if (!path || !path.startsWith("pubky://")) return { segments: [], originalSegments: [] };
    
    // Remove pubky:// prefix and split by /
    const cleanPath = path.replace("pubky://", "");
    const originalSegments = cleanPath.split("/").filter(Boolean);
    
    // Remove /pub from display - treat it as root
    const segments = originalSegments.filter((segment, index) => {
      return !(index === 1 && segment === "pub");
    });
    
    return { segments, originalSegments };
  }, [path]);

  const handleCopyPath = useCallback(() => {
    navigator.clipboard.writeText(path).then(() => {
      showSuccess("Path copied to clipboard");
    }).catch(console.error);
  }, [path, showSuccess]);

  const handleEditClick = useCallback(() => {
    setEditValue(path);
    setIsEditing(true);
  }, [path]);

  const handleEditSubmit = useCallback(() => {
    if (!editValue || !onNavigate) {
      setIsEditing(false);
      return;
    }

    // Clean up the input value
    const cleanValue = editValue.trim();
    
    if (!cleanValue) {
      setIsEditing(false);
      return;
    }

    let targetPath = cleanValue;

    // Handle various input formats
    if (cleanValue.startsWith("pk:")) {
      // pk:user123... format - navigate to their /pub/ folder
      const publicKey = cleanValue.substring(3).trim();
      targetPath = `pubky://${publicKey}/pub/`;
    } else if (cleanValue.startsWith("pubky://")) {
      // Already a complete pubky URL - use as is, ensure proper ending
      targetPath = cleanValue.endsWith("/") ? cleanValue : cleanValue + "/";
    } else if (cleanValue.startsWith("/")) {
      // Relative path like /example - extract current user from existing path
      const pathData = getPathSegments();
      if (pathData.originalSegments.length > 0) {
        const userKey = pathData.originalSegments[0];
        targetPath = `pubky://${userKey}${cleanValue.startsWith("/pub/") ? cleanValue : "/pub" + cleanValue}`;
        if (!targetPath.endsWith("/")) targetPath += "/";
      }
    } else {
      // Assume it's a public key, navigate to their /pub/
      targetPath = `pubky://${cleanValue}/pub/`;
    }

    onNavigate(targetPath);
    setIsEditing(false);
  }, [editValue, onNavigate, getPathSegments]);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue("");
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  }, [handleEditSubmit, handleEditCancel]);

  const buildPathUpTo = (index: number) => {
    const { originalSegments } = getPathSegments();
    // Map back to original segments accounting for hidden /pub
    let realIndex = index;
    if (originalSegments[1] === "pub") {
      realIndex = index === 0 ? 1 : index + 1; // Skip /pub in mapping
    }
    const pathUpTo = originalSegments.slice(0, realIndex + 1).join("/");
    return `pubky://${pathUpTo}/`;
  };

  const truncateSegment = (segment: string, maxLen: number = 20) => {
    if (segment.length <= maxLen) return segment;
    return `${segment.slice(0, maxLen - 3)}...`;
  };

  const formatDisplayPath = () => {
    if (path.length <= maxLength) return path;
    
    const { segments } = getPathSegments();
    if (segments.length <= 2) return path;
    
    // For mobile: show end of path, hide public key if needed
    const lastSegments = segments.slice(-3); // Show last 3 segments
    return `.../${lastSegments.join("/")}`;
  };

  const pathData = getPathSegments();
  const segments = pathData.segments;

  // Show default text if no path and showDefaultText is true
  if (showDefaultText && (!path || !path.startsWith("pubky://"))) {
    if (directEditing) {
      return (
        <div className={`flex items-center min-w-0 bg-muted/50 rounded-lg p-2 ${className}`}>
          <SearchInput
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (!isEditing) {
                setIsEditing(true);
                setEditValue(path || "");
              }
            }}
            className="h-8 text-sm border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus:text-foreground"
            placeholder={getContextualDefaultText()}
            showSearchIcon={false}
          />
        </div>
      );
    }
    
    return (
      <div 
        className={`flex items-center min-w-0 bg-muted/50 rounded-lg p-3 cursor-pointer hover:bg-muted/70 transition-colors ${className}`}
        onClick={() => {
          setEditValue(path || "");
          setIsEditing(true);
        }}
      >
        <div className="text-muted-foreground text-base">
          {getContextualDefaultText()}
        </div>
      </div>
    );
  }

  // Edit mode
  if (isEditing) {
    return (
      <div className={`flex items-center min-w-0 bg-muted/50 rounded-lg p-2 ${className}`}>
        <SearchInput
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleEditCancel}
          className="h-8 text-sm border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus:text-foreground"
          placeholder="pubky://user123.../pub/path, pk:user123..., or /path"
          showSearchIcon={false}
        />
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center min-w-0 bg-muted/50 rounded-lg p-breadcrumb-p ${className} ${directEditing ? 'cursor-text' : ''}`}
      onClick={directEditing ? () => {
        setEditValue(path);
        setIsEditing(true);
      } : undefined}
      title={directEditing ? "Click to edit path" : undefined}
    >
      <div className="flex items-center min-w-0 flex-1">
        {/* Root/Home bubble */}
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            const { originalSegments } = getPathSegments();
            const rootPath = `pubky://${originalSegments[0] || ""}/pub/`;
            if (onNavigate) {
              onNavigate(rootPath);
            }
          }}
          className="flex items-center gap-1 px-breadcrumb-p py-1 h-breadcrumb-h min-w-0 flex-shrink-0 bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300"
          title="Go to root"
        >
          <Home className="h-3 w-3" />
        </Button>

        {segments.length > 0 && (
          <ChevronRight className="h-3 w-3 md:h-4 md:w-4 text-gray-400 flex-shrink-0 mx-1" />
        )}

        {/* Mobile view - show truncated path as clickable */}
        <div className="sm:hidden min-w-0 flex-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleEditClick();
            }}
            className="text-breadcrumb text-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:underline truncate block max-w-full text-left"
            title="Click to edit path"
          >
            {segments.length > 0 ? formatDisplayPath() : ""}
          </button>
        </div>

        {/* Desktop/Tablet view - show breadcrumb segments as colored bubbles */}
        <div className="hidden sm:flex items-center min-w-0 flex-1 overflow-hidden gap-1">
          {directEditing ? (
            <div className="flex-1 min-w-0">
              <div className="text-breadcrumb text-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:underline px-2 py-1 rounded min-w-0 truncate">
                {segments.length > 0 ? segments.join(" / ") : "Click to edit"}
              </div>
            </div>
          ) : (
            segments.map((segment: string, index: number) => {
              // Skip the ellipsis indicator for mobile smart truncation
              if (segment === '...') {
                return (
                  <div key={index} className="flex items-center min-w-0">
                    <span className="text-gray-400 px-1">...</span>
                    {index < segments.length - 1 && (
                      <ChevronRight className="h-3 w-3 text-gray-400 mx-1 flex-shrink-0" />
                    )}
                  </div>
                );
              }
              
              return (
                <div key={index} className="flex items-center min-w-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onNavigate) {
                        onNavigate(buildPathUpTo(index));
                      }
                    }}
                    className="px-breadcrumb-p py-1 h-breadcrumb-h min-w-0 max-w-breadcrumb bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 truncate text-breadcrumb"
                    title={`Navigate to: ${segment}`}
                  >
                    {index === 0 ? truncateSegment(segment, typeof window !== 'undefined' && window.innerWidth < 768 ? 10 : 20) : segment}
                  </Button>
                  {index < segments.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-gray-400 mx-1 flex-shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 ml-2">
        {/* Edit path input - always available when directEditing is enabled */}
        {directEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setEditValue(path);
              setIsEditing(true);
            }}
            className="flex items-center px-1 md:px-2 py-1 h-auto text-muted-foreground hover:text-foreground bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700"
            title="Edit path directly"
          >
            <Edit className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
        )}

        {/* Edit button - only show if directEditing is disabled */}
        {!directEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEditClick();
            }}
            className="flex items-center px-1 md:px-2 py-1 h-auto bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            title="Edit path"
          >
            <Edit className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
        )}

        {/* Copy button */}
        {showCopyButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyPath();
            }}
            className="flex items-center px-1 md:px-2 py-1 h-auto bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            title="Copy path"
          >
            <Copy className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
"use client";

import { Button } from "@/components/ui/button";
import { PathBreadcrumb } from "@/components/ui/PathBreadcrumb";
import { ArrowLeft } from "lucide-react";

interface NavigationHeaderProps {
  // Path and navigation
  path?: string;
  onNavigate?: (path: string) => void;

  // Back button
  showBackButton?: boolean;
  onBack?: () => void;
  backButtonText?: string;

  // File context (for file editor)
  fileName?: string;
  showFileName?: boolean;

  // Styling and behavior
  context?: "browser" | "editor" | "image";
  className?: string;
  variant?: "default" | "muted" | "minimal";

  // PathBreadcrumb props
  showCopyButton?: boolean;
  showDefaultText?: boolean;
  defaultText?: string;
  directEditing?: boolean;
}

export function NavigationHeader({
  path,
  onNavigate,
  showBackButton = false,
  onBack,
  backButtonText = "Back",
  fileName,
  showFileName = false,
  context = "browser",
  className = "",
  variant = "default",
  showCopyButton = true,
  showDefaultText = false,
  defaultText,
  directEditing = false,
}: NavigationHeaderProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case "muted":
        return "bg-muted/30 rounded-lg p-3";
      case "minimal":
        return "border-b pb-3";
      default:
        return "";
    }
  };

  const hasContent = path || showBackButton || showFileName;

  if (!hasContent) {
    return null;
  }

  return (
    <div className={`${getVariantClasses()} ${className}`}>
      {/* Mobile layout - stacked */}
      <div className="md:hidden space-y-2">
        {showBackButton && onBack && (
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {backButtonText}
            </Button>
          </div>
        )}

        {path && (
          <div className="w-full">
            <PathBreadcrumb
              path={path}
              onNavigate={onNavigate}
              className="w-full"
              showCopyButton={showCopyButton}
              showDefaultText={showDefaultText}
              defaultText={defaultText}
              context={context}
              directEditing={directEditing}
            />
          </div>
        )}

        {showFileName && fileName && (
          <div className="flex items-center space-x-1">
            <span className="text-muted-foreground text-sm">File:</span>
            <span className="text-foreground font-medium text-sm break-all">
              {fileName}
            </span>
          </div>
        )}
      </div>

      {/* Desktop layout - single line */}
      <div className="hidden md:flex md:items-center md:justify-between">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {showBackButton && onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {backButtonText}
            </Button>
          )}

          {path && (
            <>
              {showBackButton && (
                <span className="text-muted-foreground">•</span>
              )}
              <PathBreadcrumb
                path={path}
                onNavigate={onNavigate}
                className="flex-1 min-w-0"
                showCopyButton={showCopyButton}
                showDefaultText={showDefaultText}
                defaultText={defaultText}
                context={context}
                directEditing={directEditing}
              />
              {showFileName && fileName && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-foreground font-medium flex-shrink-0">
                    {fileName}
                  </span>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

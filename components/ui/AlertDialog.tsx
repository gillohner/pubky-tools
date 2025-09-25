"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react";

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  description: string | ReactNode;
  type?: "info" | "warning" | "error" | "success";
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function AlertDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  type = "info",
  confirmText = "OK",
  cancelText = "Cancel",
  isDestructive = false,
}: AlertDialogProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
      case "error":
        return <XCircle className="h-6 w-6 text-red-600" />;
      case "success":
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      default:
        return <Info className="h-6 w-6 text-blue-600" />;
    }
  };

  const getHeaderColor = () => {
    switch (type) {
      case "warning":
        return "text-yellow-800 dark:text-yellow-200";
      case "error":
        return "text-red-800 dark:text-red-200";
      case "success":
        return "text-green-800 dark:text-green-200";
      default:
        return "text-blue-800 dark:text-blue-200";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle
              className={`flex items-center gap-3 ${getHeaderColor()}`}
            >
              {getIcon()}
              <span>{title}</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {typeof description === "string"
              ? <p>{description}</p>
              : description}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              size="sm"
            >
              {cancelText}
            </Button>
            {onConfirm && (
              <Button
                variant={isDestructive ? "destructive" : "default"}
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                size="sm"
              >
                {confirmText}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for easier usage (simplified implementation for now)
export function useAlertDialog() {
  const showAlert = () => {
    // This is a placeholder implementation
    // In a real app, you'd implement this with a React context or portal
    return Promise.resolve(true);
  };

  return { showAlert };
}

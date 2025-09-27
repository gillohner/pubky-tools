"use client";

import { Toast, ToastProvider, useToast } from "@/hooks/useToast";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

function ToastComponent(
  { toast, onClose }: { toast: Toast; onClose: () => void },
) {
  const getIcon = () => {
    switch (toast.variant) {
      case "success":
        return (
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
        );
      case "destructive":
        return (
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
        );
      case "progress":
        return (
          <div className="h-5 w-5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getStyles = () => {
    switch (toast.variant) {
      case "success":
        return "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100";
      case "destructive":
        return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100";
      case "progress":
        return "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100";
      default:
        return "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100";
    }
  };

  return (
    <div
      className={cn(
        "w-full border shadow-lg rounded-lg pointer-events-auto flex overflow-hidden backdrop-blur-sm transition-all duration-300 ease-in-out",
        getStyles(),
      )}
    >
      <div className="p-4 flex items-start flex-1">
        <div className="flex-shrink-0 mr-3 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <h4 className="font-semibold mb-1 text-sm leading-tight">
              {toast.title}
            </h4>
          )}
          {toast.description && (
            <p className="text-sm opacity-90 leading-relaxed break-words">
              {toast.description}
            </p>
          )}
          {toast.showProgress && (
            <div className="mt-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs opacity-70">Progress</span>
                <span className="text-xs opacity-70">{Math.round(toast.progress || 0)}%</span>
              </div>
              <div className="w-full bg-white/20 dark:bg-black/20 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(Math.max(toast.progress || 0, 0), 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-start p-3">
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-background/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[30vw] max-w-md min-w-80 space-y-2">
      {toasts.map((toast) => (
        <ToastComponent
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

export { ToastContainer, ToastProvider, useToast };

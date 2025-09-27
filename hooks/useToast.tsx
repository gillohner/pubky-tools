"use client";

import { createContext, ReactNode, useContext, useReducer } from "react";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success" | "progress";
  duration?: number;
  progress?: number; // 0-100
  showProgress?: boolean;
  persistent?: boolean; // Don't auto-remove
}

interface ToastState {
  toasts: Toast[];
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showProgress: (title: string, description?: string) => string; // Returns toast ID
}

type ToastAction =
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "REMOVE_TOAST"; id: string }
  | { type: "UPDATE_TOAST"; id: string; updates: Partial<Toast> };

const ToastContext = createContext<ToastContextType | undefined>(undefined);

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [...state.toasts, action.toast],
      };
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== action.id),
      };
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((toast) =>
          toast.id === action.id ? { ...toast, ...action.updates } : toast
        ),
      };
    default:
      return state;
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [] });

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      duration: toast.persistent ? undefined : 5000,
      ...toast,
    };

    dispatch({ type: "ADD_TOAST", toast: newToast });

    // Auto-remove toast after duration (unless persistent)
    if (newToast.duration && !newToast.persistent) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  };

  const removeToast = (id: string) => {
    dispatch({ type: "REMOVE_TOAST", id });
  };

  const updateToast = (id: string, updates: Partial<Toast>) => {
    dispatch({ type: "UPDATE_TOAST", id, updates });
  };

  const showSuccess = (message: string, title?: string) => {
    addToast({
      title: title || "Success",
      description: message,
      variant: "success",
    });
  };

  const showError = (message: string, title?: string) => {
    addToast({
      title: title || "Error",
      description: message,
      variant: "destructive",
    });
  };

  const showInfo = (message: string, title?: string) => {
    addToast({
      title: title || "Info",
      description: message,
      variant: "default",
    });
  };

  const showProgress = (title: string, description?: string): string => {
    return addToast({
      title,
      description,
      variant: "progress",
      progress: 0,
      showProgress: true,
      persistent: true,
    });
  };

  return (
    <ToastContext.Provider
      value={{
        toasts: state.toasts,
        addToast,
        removeToast,
        updateToast,
        showSuccess,
        showError,
        showInfo,
        showProgress,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

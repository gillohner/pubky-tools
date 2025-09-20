"use client";

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function Toaster() {
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm space-y-2">
      {/* Toast messages will be rendered here */}
    </div>
  );
}

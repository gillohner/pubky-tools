"use client";

import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import Link from "next/link";

interface UnauthenticatedHeaderProps {
  onLoginClick: () => void;
}

export function UnauthenticatedHeader(
  { onLoginClick }: UnauthenticatedHeaderProps,
) {
  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <h1 className="text-xl font-semibold text-foreground">
              Pubky Tools
            </h1>
          </Link>
          <span className="text-sm text-muted-foreground">
            Read-only mode
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button onClick={onLoginClick} variant="default" size="sm">
            <LogIn className="h-4 w-4 mr-2" />
            Login
          </Button>
        </div>
      </div>
    </header>
  );
}

"use client";

import React from "react";
import { Header } from "@/components/layout/Header";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}

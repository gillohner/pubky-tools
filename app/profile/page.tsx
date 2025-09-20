"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { UnauthenticatedHeader } from "@/components/layout/UnauthenticatedHeader";
import Profile from "@/components/profile/Profile";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoginModal } from "@/components/auth/LoginModal";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogIn, Wrench } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function ProfilePage() {
  const { state } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleLoginClick = () => {
    setShowLoginModal(true);
  };

  // If user is not authenticated, show login prompt
  if (!state.isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <UnauthenticatedHeader onLoginClick={handleLoginClick} />
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <Link href="/">
                <Button
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <Wrench className="h-4 w-4" />
                  <span>Back to Tools</span>
                </Button>
              </Link>
            </div>

            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">Profile</h1>
                <p className="text-muted-foreground">
                  Manage your Pubky identity and access permissions
                </p>
              </div>

              <div className="flex items-center justify-center h-[400px]">
                <div className="text-center space-y-4">
                  <LogIn className="h-16 w-16 mx-auto text-muted-foreground" />
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-foreground">
                      Login Required
                    </h2>
                    <p className="text-muted-foreground max-w-md">
                      You need to log in with Pubky Ring to access your profile
                      and manage your permissions.
                    </p>
                  </div>
                  <Button onClick={handleLoginClick} className="mt-4">
                    <LogIn className="h-4 w-4 mr-2" />
                    Login with Pubky Ring
                  </Button>
                </div>
              </div>
            </div>

            <LoginModal
              isOpen={showLoginModal}
              onClose={() => setShowLoginModal(false)}
            />
          </div>
        </main>
      </div>
    );
  }

  // Authenticated user profile
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="outline" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <Wrench className="h-4 w-4" />
              <span>Back to Tools</span>
            </Button>
          </Link>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground">
            Manage your Pubky identity and access permissions
          </p>
        </div>

        <Profile />
      </div>
    </MainLayout>
  );
}

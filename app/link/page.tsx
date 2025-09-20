"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { PubkySession } from "@/types/pubky";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

function LinkPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Processing authentication...");

  useEffect(() => {
    const processAuth = () => {
      try {
        // Get auth parameters from URL
        const authToken = searchParams.get("token");
        const publicKey = searchParams.get("pubkey") || searchParams.get("pk");
        const capabilities = searchParams.get("capabilities") ||
          searchParams.get("caps");

        if (!authToken || !publicKey) {
          throw new Error("Missing required authentication parameters");
        }

        // Parse capabilities
        let capabilityList: string[] = [];
        if (capabilities) {
          capabilityList = capabilities.split(",").map((cap) => cap.trim())
            .filter(Boolean);
        }

        // Create session data
        const sessionData: Omit<PubkySession, "isAuthenticated"> = {
          publicKey: publicKey,
          homeserver: undefined, // Will be resolved by the client
          capabilities: capabilityList.length > 0
            ? capabilityList
            : ["/pub/pubky-tools/:rw"],
        };

        // Login the user
        login(sessionData);

        setStatus("success");
        setMessage("Successfully authenticated! Redirecting to home page...");

        // Redirect to home page after a short delay
        setTimeout(() => {
          router.push("/");
        }, 2000);
      } catch (error) {
        console.error("Authentication error:", error);
        setStatus("error");
        setMessage(
          error instanceof Error ? error.message : "Authentication failed",
        );
      }
    };

    processAuth();
  }, [searchParams, login, router]);

  const handleRetry = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === "loading" && (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            )}
            {status === "success" && (
              <CheckCircle className="h-8 w-8 text-green-500" />
            )}
            {status === "error" && <XCircle className="h-8 w-8 text-red-500" />}
          </div>
          <CardTitle>
            {status === "loading" && "Processing Authentication"}
            {status === "success" && "Authentication Successful"}
            {status === "error" && "Authentication Failed"}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>

        {status === "error" && (
          <CardContent>
            <Button onClick={handleRetry} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default function LinkPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <CardTitle>Loading...</CardTitle>
              <CardDescription>
                Processing authentication request
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <LinkPageContent />
    </Suspense>
  );
}

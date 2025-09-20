"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/AuthProvider";
import { PubkyClient } from "@/lib/pubky-client";
import { getAppConfig } from "@/lib/config";
import { PubkySession } from "@/types/pubky";
import QRCodeLib from "qrcode";
import Image from "next/image";
import {
  Check,
  Copy,
  ExternalLink,
  Plus,
  Shield,
  Trash2,
  X,
} from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [capabilities, setCapabilities] = useState(["/pub/pubky-tools/:rw"]);
  const [newCapability, setNewCapability] = useState("");
  const [qrCode, setQrCode] = useState<string>("");
  const [authUrl, setAuthUrl] = useState<string>("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready to generate QR code");
  const [copied, setCopied] = useState(false);
  const [hasGeneratedAuth, setHasGeneratedAuth] = useState(false);

  const pubkyClient = PubkyClient.getInstance();
  const config = getAppConfig();

  // Load pending capabilities if user was redirected from profile
  useEffect(() => {
    if (isOpen) {
      const pendingCapabilities = localStorage.getItem(
        "pubky-pending-capabilities",
      );
      if (pendingCapabilities) {
        try {
          const caps = JSON.parse(pendingCapabilities);
          setCapabilities(caps);
        } catch (error) {
          console.error("Failed to parse pending capabilities:", error);
          localStorage.removeItem("pubky-pending-capabilities");
        }
      }
    }
  }, [isOpen]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setHasGeneratedAuth(false);
      setQrCode("");
      setAuthUrl("");
      setError("");
      setStatus("Ready to generate QR code");
    }
  }, [isOpen]);

  const addCapability = () => {
    const trimmed = newCapability.trim();
    if (!trimmed) return;

    if (!trimmed.startsWith("/pub/")) {
      setError("Capability must start with /pub/");
      return;
    }

    if (!trimmed.includes(":")) {
      setError("Capability must include permissions (e.g., :rw, :r)");
      return;
    }

    if (capabilities.includes(trimmed)) {
      setError("This capability already exists");
      return;
    }

    setCapabilities([...capabilities, trimmed]);
    setNewCapability("");
    setError("");

    // Reset auth state to require regeneration of QR code with new permissions
    if (hasGeneratedAuth) {
      setHasGeneratedAuth(false);
      setQrCode("");
      setAuthUrl("");
      setStatus(
        "⚠️ Capabilities updated. Generate a new QR code to include updated permissions.",
      );
    }
  };

  const removeCapability = (capToRemove: string) => {
    if (capabilities.length <= 1) {
      setError("You must have at least one capability");
      return;
    }
    setCapabilities(capabilities.filter((cap) => cap !== capToRemove));
    setError("");

    // Reset auth state to require regeneration of QR code with updated permissions
    if (hasGeneratedAuth) {
      setHasGeneratedAuth(false);
      setQrCode("");
      setAuthUrl("");
      setStatus(
        "⚠️ Capabilities updated. Generate a new QR code to include updated permissions.",
      );
    }
  };

  const generateAuthRequest = async () => {
    setIsLoading(true);
    setError("");
    setStatus("Generating authentication request...");

    try {
      const authRequest = pubkyClient.authRequest(
        config.pubkyRelay,
        capabilities,
        config.appCallbackUrl,
      );
      const authUrlValue = authRequest.url();

      setAuthUrl(authUrlValue);
      setStatus("QR code generated. Waiting for authentication...");

      // Generate QR code
      const qrCodeDataUrl = await QRCodeLib.toDataURL(authUrlValue, {
        width: 256,
        margin: 2,
        color: {
          dark: "#1e293b",
          light: "#ffffff",
        },
      });
      setQrCode(qrCodeDataUrl);
      setHasGeneratedAuth(true);

      // Wait for the response
      try {
        const pubky = await authRequest.response();
        if (pubky) {
          const homeserver = pubkyClient.resolveHomeserver(pubky.z32());

          // Check for pending capabilities from profile changes
          const pendingCapabilities = localStorage.getItem(
            "pubky-pending-capabilities",
          );
          const finalCapabilities = pendingCapabilities
            ? JSON.parse(pendingCapabilities)
            : capabilities;

          const sessionData: Omit<PubkySession, "isAuthenticated"> = {
            publicKey: pubky.z32(),
            homeserver: homeserver || undefined,
            capabilities: finalCapabilities,
          };

          login(sessionData);

          // Clear pending capabilities after successful login
          localStorage.removeItem("pubky-pending-capabilities");

          setStatus("✅ Successfully authenticated! Welcome to Pubky Tools.");
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      } catch (error) {
        console.error("Auth request failed:", error);
        setError("Authentication failed. Please try again.");
        setStatus("Authentication failed.");
      }
    } catch (error) {
      console.error("Failed to generate auth request:", error);
      setError("Failed to generate authentication request");
      setStatus("Failed to generate authentication request.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(authUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const openPubkyRingApp = () => {
    if (!authUrl) return;

    const pubkyRingUrl = `pubkyring://${authUrl}`;

    // Try to open the Pubky Ring app directly
    globalThis.window.location.href = pubkyRingUrl;

    // Fallback: after a short delay, redirect to the app store if the app didn't open
    setTimeout(() => {
      const userAgent = navigator.userAgent || navigator.vendor;
      if (/android/i.test(userAgent)) {
        globalThis.window.open(config.pubkyRingAndroidUrl, "_blank");
      } else if (/iPad|iPhone|iPod/.test(userAgent)) {
        globalThis.window.open(config.pubkyRingIOSUrl, "_blank");
      }
    }, 2000);
  };

  const getPermissionColor = (capability: string) => {
    const parts = capability.split(":");
    if (parts.length !== 2) return "gray";

    const permission = parts[1];
    if (permission === "rw") return "green";
    if (permission === "r") return "blue";
    if (permission === "w") return "orange";
    return "gray";
  };

  const getPermissionText = (capability: string) => {
    const parts = capability.split(":");
    if (parts.length !== 2) return "Unknown";

    const permission = parts[1];
    if (permission === "rw") return "Read & Write";
    if (permission === "r") return "Read Only";
    if (permission === "w") return "Write Only";
    return permission;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      style={{ top: 0, left: 0, right: 0, bottom: 0, marginTop: 0 }}
    >
      <Card
        className="w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ minHeight: "auto" }}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Login with Pubky Ring</CardTitle>
              <CardDescription>
                Connect to access your files and manage permissions
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Capabilities Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center">
              <Shield className="h-4 w-4 mr-1" />
              Folder Access Permissions
            </label>

            <div className="space-y-2">
              {capabilities.map((capability, index) => {
                const [path, permission] = capability.split(":");
                const color = getPermissionColor(capability);
                const permissionText = getPermissionText(capability);

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-mono text-sm">{path}</div>
                      <div
                        className={`text-xs text-${color}-600 dark:text-${color}-400`}
                      >
                        {permissionText}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 bg-${color}-100 dark:bg-${color}-900/30 text-${color}-800 dark:text-${color}-300 text-xs rounded`}
                      >
                        {permission}
                      </span>
                      {capabilities.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCapability(capability)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add new capability */}
            <div className="flex items-center space-x-2">
              <Input
                placeholder="/pub/example.com/:rw"
                value={newCapability}
                onChange={(e) => setNewCapability(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCapability()}
                className="flex-1"
              />
              <Button
                onClick={addCapability}
                disabled={!newCapability.trim()}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Format: /pub/path/:permission (e.g., /pub/example.com/:rw for
              read-write access)
            </p>
          </div>

          {/* Generate auth button - always show if no QR or if capabilities changed */}
          {(!hasGeneratedAuth || (!qrCode && !authUrl)) && (
            <Button
              onClick={generateAuthRequest}
              disabled={isLoading || capabilities.length === 0}
              className="w-full"
            >
              {isLoading
                ? "Generating..."
                : hasGeneratedAuth
                ? "Regenerate QR Code"
                : "Generate QR Code & Auth URL"}
            </Button>
          )}

          {/* Status */}
          <div
            className={`p-3 rounded-lg text-sm ${
              status.includes("⚠️")
                ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                : "bg-muted/50"
            }`}
          >
            <p
              className={error
                ? "text-red-500 dark:text-red-400"
                : status.includes("⚠️")
                ? "text-yellow-700 dark:text-yellow-300 font-medium"
                : "text-muted-foreground"}
            >
              {error || status}
            </p>
          </div>

          {/* QR Code and Authentication */}
          {hasGeneratedAuth && qrCode && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="bg-background border border-border p-4 rounded-xl inline-block mb-4">
                  <Image
                    src={qrCode}
                    alt="QR Code for Authentication"
                    width={192}
                    height={192}
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Scan with your Pubky-compatible app
                </p>
              </div>

              {/* Copy URL button */}
              {authUrl && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={copyToClipboard}
                    className="w-full"
                  >
                    {copied
                      ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />URL copied!
                        </>
                      )
                      : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />Copy auth URL
                        </>
                      )}
                  </Button>

                  {/* Open in Pubky Ring button */}
                  <Button
                    onClick={openPubkyRingApp}
                    className="w-full"
                    variant="default"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Pubky Ring
                  </Button>
                </div>
              )}

              {/* Retry button if error */}
              {error && (
                <Button
                  onClick={generateAuthRequest}
                  disabled={isLoading}
                  className="w-full"
                  variant="destructive"
                >
                  {isLoading ? "Generating..." : "Retry"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

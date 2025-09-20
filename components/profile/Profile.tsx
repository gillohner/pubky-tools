"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/useToast";
import { PubkyClient } from "@/lib/pubky-client";
import QRCodeLib from "qrcode";
import Image from "next/image";
import {
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Smartphone,
  Trash2,
  User,
  Wifi,
  WifiOff,
} from "lucide-react";

export default function Profile() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCapability, setNewCapability] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [pubkyRingUrl, setPubkyRingUrl] = useState<string | null>(null);
  const [stagedCapabilities, setStagedCapabilities] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { state, logout } = useAuth();
  const { showSuccess, showError } = useToast();

  // Initialize staged capabilities with current capabilities
  useEffect(() => {
    if (state.user?.capabilities) {
      setStagedCapabilities(state.user.capabilities);
    }
  }, [state.user?.capabilities]);

  // Check if there are changes
  useEffect(() => {
    if (state.user?.capabilities) {
      const hasChanges = JSON.stringify(stagedCapabilities.sort()) !==
        JSON.stringify(state.user.capabilities.sort());
      setHasChanges(hasChanges);
    }
  }, [stagedCapabilities, state.user?.capabilities]);

  // Component should only be rendered if user is authenticated
  if (!state.user || !state.isAuthenticated) {
    return null;
  }

  const { publicKey, capabilities = [] } = state.user;
  const isConnected = state.isAuthenticated;

  const triggerReauthentication = async (updatedCapabilities: string[]) => {
    setIsReauthenticating(true);
    try {
      const client = PubkyClient.getInstance();

      // Create new auth request with updated capabilities
      const authRequest = client.authRequest(
        "https://relay.pkarr.org",
        updatedCapabilities,
      );

      const authUrl = authRequest.url();
      setAuthUrl(authUrl);

      // Generate QR Code
      const qrDataUrl = await QRCodeLib.toDataURL(authUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeUrl(qrDataUrl);

      // Generate Pubky Ring deeplink
      const ringUrl = `pubky-ring://auth?url=${encodeURIComponent(authUrl)}`;
      setPubkyRingUrl(ringUrl);

      showSuccess(
        "New authentication request created. Please scan the QR code or use the Pubky Ring app to complete authentication.",
      );
    } catch (error) {
      showError(`Failed to create authentication request: ${error}`);
    } finally {
      setIsReauthenticating(false);
    }
  };

  const handleAddCapability = () => {
    if (!newCapability.trim()) {
      showError("Please enter a capability path");
      return;
    }

    if (!newCapability.startsWith("/pub/")) {
      showError("Capability must start with /pub/");
      return;
    }

    if (!newCapability.includes(":")) {
      showError("Capability must include permissions (e.g., :rw, :r)");
      return;
    }

    if (stagedCapabilities.includes(newCapability)) {
      showError("This capability already exists");
      return;
    }

    setIsAdding(true);
    try {
      // Add the new capability to the staged list
      setStagedCapabilities([...stagedCapabilities, newCapability]);

      setNewCapability("");
      setShowAddForm(false);

      showSuccess(
        'Capability staged. Click "Apply Changes" to save and reauthenticate.',
      );
    } catch (error) {
      showError(`Failed to stage capability: ${error}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveCapability = (capabilityToRemove: string) => {
    if (stagedCapabilities.length <= 1) {
      showError("Cannot remove the last capability");
      return;
    }

    try {
      // Remove the capability from the staged list
      const updatedCapabilities = stagedCapabilities.filter((cap) =>
        cap !== capabilityToRemove
      );
      setStagedCapabilities(updatedCapabilities);

      showSuccess(
        'Capability removed from staging. Click "Apply Changes" to save and reauthenticate.',
      );
    } catch (error) {
      showError(`Failed to remove capability: ${error}`);
    }
  };

  const handleApplyChanges = async () => {
    if (!hasChanges) {
      showError("No changes to apply");
      return;
    }

    setIsReauthenticating(true);
    try {
      // Store the updated capabilities temporarily for the reauthentication flow
      localStorage.setItem(
        "pubky-pending-capabilities",
        JSON.stringify(stagedCapabilities),
      );

      // Trigger reauthentication with new capabilities - this will show QR code
      await triggerReauthentication(stagedCapabilities);

      // Clear the current session to force full reauthentication
      logout();

      showSuccess(
        "Changes applied. Please complete the authentication flow with Pubky Ring to activate updated permissions. Your session has been cleared for security.",
      );
    } catch (error) {
      showError(`Failed to apply changes: ${error}`);
    } finally {
      setIsReauthenticating(false);
    }
  };

  const handleDiscardChanges = () => {
    setStagedCapabilities(capabilities);
    showSuccess("Changes discarded");
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

  const getPermissionColor = (capability: string) => {
    const parts = capability.split(":");
    if (parts.length !== 2) return "gray";

    const permission = parts[1];
    if (permission === "rw") return "green";
    if (permission === "r") return "blue";
    if (permission === "w") return "orange";
    return "gray";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Profile Information</span>
          </CardTitle>
          <CardDescription>
            Your Pubky identity and connection details
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center space-x-3">
              {isConnected
                ? <Wifi className="h-5 w-5 text-green-600" />
                : <WifiOff className="h-5 w-5 text-red-600" />}
              <div>
                <div className="font-medium">
                  {isConnected ? "Connected" : "Disconnected"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isConnected ? "Your session is active" : "Please reconnect"}
                </div>
              </div>
            </div>
            {isConnected && <CheckCircle className="h-5 w-5 text-green-600" />}
          </div>

          {/* Public Key */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Public Key
            </label>
            <div className="flex items-center space-x-2">
              <Input
                value={publicKey || ""}
                readOnly
                className="flex-1 font-mono text-sm bg-muted"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(publicKey);
                  showSuccess("Public key copied to clipboard");
                }}
                title="Copy public key"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Homeserver */}
          {/* <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              <Server className="inline h-4 w-4 mr-1" />
              Homeserver
            </label>
            <div className="flex items-center space-x-2">
              <Input
                value={homeserver || "Not specified"}
                readOnly
                className="flex-1 bg-muted"
              />
              {homeserver && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(homeserver);
                    showSuccess("Homeserver copied to clipboard");
                  }}
                  title="Copy homeserver"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div> */}
        </CardContent>
      </Card>

      {/* Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Folder Capabilities</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Path
              </Button>
              {hasChanges && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleApplyChanges}
                    disabled={isReauthenticating}
                  >
                    {isReauthenticating
                      ? <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                      : <CheckCircle className="h-4 w-4 mr-1" />}
                    Apply Changes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDiscardChanges}
                    disabled={isReauthenticating}
                  >
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Discard
                  </Button>
                </>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Manage your access permissions for different folder paths
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Add new capability form */}
          {showAddForm && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="/pub/example.com/:rw"
                  value={newCapability}
                  onChange={(e) => setNewCapability(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCapability()}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddCapability}
                  disabled={isAdding || !newCapability.trim()}
                  size="sm"
                >
                  {isAdding ? <RefreshCw className="h-4 w-4 animate-spin" /> : (
                    "Add"
                  )}
                </Button>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Format: /pub/path/:permission (e.g., /pub/example.com/:rw for
                read-write access)
              </p>
            </div>
          )}

          {/* Capabilities list */}
          <div className="space-y-2">
            {stagedCapabilities.length === 0
              ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No capabilities configured</p>
                  <p className="text-sm">
                    Add folder paths to access your files
                  </p>
                </div>
              )
              : (
                stagedCapabilities.map((capability, index) => {
                  const [path, permission] = capability.split(":");
                  const color = getPermissionColor(capability);
                  const permissionText = getPermissionText(capability);
                  const isChanged = !capabilities.includes(capability);

                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 ${
                        isChanged
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                          : "bg-card"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-mono text-sm flex items-center">
                          {path}
                          {isChanged && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs rounded">
                              New
                            </span>
                          )}
                        </div>
                        <div className={`text-xs text-${color}-600`}>
                          {permissionText}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 bg-${color}-100 text-${color}-800 text-xs rounded`}
                        >
                          {permission}
                        </span>
                        {stagedCapabilities.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCapability(capability)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              {stagedCapabilities.length}{" "}
              capability{stagedCapabilities.length !== 1 ? "s" : ""} configured
              {hasChanges && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 text-xs rounded">
                  {stagedCapabilities.length - capabilities.length > 0
                    ? "+"
                    : ""}
                  {stagedCapabilities.length - capabilities.length} changes
                </span>
              )}
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={logout}
            >
              <Settings className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reauthentication Section */}
      {(qrCodeUrl || authUrl) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5" />
              <span>Complete Authentication</span>
            </CardTitle>
            <CardDescription>
              Scan the QR code or use the links below to activate your updated
              permissions
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {qrCodeUrl && (
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-background border-2 border-border rounded-lg">
                  <Image
                    src={qrCodeUrl}
                    alt="Authentication QR Code"
                    width={256}
                    height={256}
                    className="w-64 h-64"
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Scan this QR code with your Pubky-compatible app
                </p>
              </div>
            )}

            <div className="space-y-3">
              {authUrl && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Authentication URL
                  </label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={authUrl}
                      readOnly
                      className="flex-1 font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(authUrl);
                        showSuccess("Authentication URL copied to clipboard");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => globalThis.window.open(authUrl, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {pubkyRingUrl && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Pubky Ring App
                  </label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={pubkyRingUrl}
                      readOnly
                      className="flex-1 font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(pubkyRingUrl);
                        showSuccess("Pubky Ring URL copied to clipboard");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        globalThis.window.location.href = pubkyRingUrl}
                    >
                      <Smartphone className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setQrCodeUrl(null);
                  setAuthUrl(null);
                  setPubkyRingUrl(null);
                }}
              >
                Close Authentication
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

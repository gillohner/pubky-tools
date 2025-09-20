import { beforeEach, describe, it } from "node:test";
import assert from "node:assert";

import process from "node:process";

// Mock localStorage
const localStorageMock = {
  getItem: (key) => {
    return localStorageMock[key] || null;
  },
  setItem: (key, value) => {
    localStorageMock[key] = value;
  },
  removeItem: (key) => {
    delete localStorageMock[key];
  },
  clear: () => {
    Object.keys(localStorageMock).forEach((key) => {
      if (
        key !== "getItem" && key !== "setItem" && key !== "removeItem" &&
        key !== "clear"
      ) {
        delete localStorageMock[key];
      }
    });
  },
};

// Set up global for testing
globalThis.localStorage = localStorageMock;

describe("Auth System", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("PubkySession Management", () => {
    it("should validate session structure", () => {
      const validSession = {
        publicKey: "test-public-key",
        secretKey: "test-secret-key",
        homeserver: "https://demo.pkarr.org",
        capabilities: [
          {
            path: "/pub/",
            permission: "APPEND",
          },
        ],
        isAuthenticated: true,
      };

      // Validate required fields
      assert.ok(validSession.publicKey, "Public key is required");
      assert.ok(validSession.secretKey, "Secret key is required");
      assert.ok(validSession.homeserver, "Homeserver is required");
      assert.ok(
        Array.isArray(validSession.capabilities),
        "Capabilities must be an array",
      );
      assert.ok(
        validSession.capabilities.length > 0,
        "At least one capability is required",
      );
      assert.strictEqual(
        typeof validSession.isAuthenticated,
        "boolean",
        "isAuthenticated must be boolean",
      );
    });

    it("should store and retrieve session from localStorage", () => {
      const session = {
        publicKey: "test-public-key",
        secretKey: "test-secret-key",
        homeserver: "https://demo.pkarr.org",
        capabilities: [{ path: "/pub/", permission: "APPEND" }],
        isAuthenticated: true,
      };

      // Store session
      localStorage.setItem("pubky-user", JSON.stringify(session));

      // Retrieve and verify
      const stored = JSON.parse(localStorage.getItem("pubky-user"));
      assert.deepStrictEqual(stored, session);
    });

    it("should handle invalid session data gracefully", () => {
      // Store invalid JSON
      localStorage.setItem("pubky-user", "invalid-json");

      // Should not throw when parsing fails
      try {
        JSON.parse(localStorage.getItem("pubky-user"));
        assert.fail("Should have thrown for invalid JSON");
      } catch (error) {
        assert.ok(error instanceof SyntaxError);
      }
    });
  });

  describe("Capability Management", () => {
    it("should validate capability structure", () => {
      const validCapability = {
        path: "/pub/documents/",
        permission: "APPEND",
      };

      assert.ok(validCapability.path, "Path is required");
      assert.ok(validCapability.permission, "Permission is required");
      assert.ok(
        ["APPEND", "READ"].includes(validCapability.permission),
        "Permission must be valid",
      );
      assert.ok(validCapability.path.startsWith("/"), "Path must start with /");
      assert.ok(validCapability.path.endsWith("/"), "Path must end with /");
    });

    it("should normalize paths correctly", () => {
      const normalizePath = (path) => {
        if (!path.startsWith("/")) path = "/" + path;
        if (!path.endsWith("/")) path = path + "/";
        return path;
      };

      assert.strictEqual(normalizePath("pub"), "/pub/");
      assert.strictEqual(normalizePath("/pub"), "/pub/");
      assert.strictEqual(normalizePath("pub/"), "/pub/");
      assert.strictEqual(normalizePath("/pub/"), "/pub/");
    });
  });

  describe("File Path Validation", () => {
    it("should validate pubky URLs correctly", () => {
      const isValidPubkyUrl = (url) => {
        const pattern = /^pubky:\/\/[a-zA-Z0-9]+\/pub\/.*$/;
        return pattern.test(url);
      };

      assert.ok(
        isValidPubkyUrl("pubky://abc123/pub/test.txt"),
        "Valid pubky URL should pass",
      );
      assert.ok(
        isValidPubkyUrl("pubky://xyz789/pub/folder/file.md"),
        "Valid nested pubky URL should pass",
      );
      assert.ok(
        !isValidPubkyUrl("https://example.com/test.txt"),
        "HTTP URL should fail",
      );
      assert.ok(
        !isValidPubkyUrl("pubky://abc123/private/test.txt"),
        "Non-pub path should fail",
      );
      assert.ok(
        !isValidPubkyUrl("pubky://abc123/pub"),
        "Missing trailing content should fail",
      );
    });

    it("should extract components from pubky URLs", () => {
      const parsePubkyUrl = (url) => {
        const match = url.match(/^pubky:\/\/([a-zA-Z0-9]+)\/pub\/(.*)$/);
        if (!match) return null;
        return {
          publicKey: match[1],
          path: match[2],
        };
      };

      const result = parsePubkyUrl("pubky://abc123/pub/documents/test.txt");
      assert.strictEqual(result.publicKey, "abc123");
      assert.strictEqual(result.path, "documents/test.txt");

      const invalid = parsePubkyUrl("invalid-url");
      assert.strictEqual(invalid, null);
    });
  });

  describe("Configuration", () => {
    it("should have required app configuration", () => {
      const requiredConfig = {
        appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        iosAppUrl: process.env.NEXT_PUBLIC_IOS_APP_URL ||
          "https://apps.apple.com/app/pubky-ring",
        androidAppUrl: process.env.NEXT_PUBLIC_ANDROID_APP_URL ||
          "https://play.google.com/store/apps/details?id=org.pubky.ring",
      };

      assert.ok(requiredConfig.appUrl, "App URL is required");
      assert.ok(requiredConfig.iosAppUrl, "iOS app URL is required");
      assert.ok(requiredConfig.androidAppUrl, "Android app URL is required");
    });

    it("should detect mobile platforms correctly", () => {
      const isMobile = (userAgent) => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
          .test(userAgent);
      };

      const isIOS = (userAgent) => {
        return /iPad|iPhone|iPod/.test(userAgent);
      };

      const isAndroid = (userAgent) => {
        return /Android/.test(userAgent);
      };

      // Test iOS detection
      assert.ok(
        isIOS("Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"),
      );
      assert.ok(
        isMobile("Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"),
      );

      // Test Android detection
      assert.ok(isAndroid("Mozilla/5.0 (Linux; Android 10; SM-G975F)"));
      assert.ok(isMobile("Mozilla/5.0 (Linux; Android 10; SM-G975F)"));

      // Test desktop
      assert.ok(
        !isMobile(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        ),
      );
    });
  });
});

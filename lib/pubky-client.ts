import {
  AuthRequest as PubkyAuthRequest,
  Client,
  Keypair,
  PublicKey,
  Session,
} from "@synonymdev/pubky";

export class PubkyClient {
  private static instance: PubkyClient;
  private client: Client;
  private initialized = false;
  private currentSession: Session | null = null;
  private customCapabilities: string[] = [];

  private constructor() {
    this.client = new Client();
  }

  public static getInstance(): PubkyClient {
    if (!PubkyClient.instance) {
      PubkyClient.instance = new PubkyClient();
    }
    return PubkyClient.instance;
  }

  private ensureInitialized() {
    if (!this.initialized) {
      try {
        // Initialize client if needed
        this.initialized = true;
        console.log("Pubky client initialized successfully");
      } catch (error) {
        console.error("Failed to initialize Pubky client:", error);
        throw error;
      }
    }
  }

  /**
   * Resolve a pubky:// URL to an HTTP(S) homeserver URL
   */
  private resolvePubkyUrl(pubkyUrl: string): string {
    if (!pubkyUrl.startsWith("pubky://")) {
      throw new Error("Invalid pubky:// URL");
    }

    // Parse pubky://publickey/path
    const urlWithoutScheme = pubkyUrl.slice(8); // Remove 'pubky://'
    const parts = urlWithoutScheme.split("/");
    const publicKey = parts[0];
    const path = parts.slice(1).join("/");

    // For now, use a simple mapping - in production this would use DNS resolution
    // The SDK should handle this automatically, but we might need to help it
    return `https://${publicKey}.pubky.app/${path}`;
  }

  /**
   * Get current session capabilities
   */
  private getSessionCapabilities(): string[] {
    return [...this.customCapabilities];
  }

  /**
   * Update custom capabilities and reauthenticate if needed
   */
  public updateCapabilities(
    additionalCapabilities: string[],
  ): Promise<boolean> {
    this.customCapabilities = additionalCapabilities;

    if (this.currentSession) {
      // Need to reauthenticate with new capabilities
      this.currentSession = null;

      // Would need to trigger reauthentication flow here
      // For now, just clear the session to force re-auth
      return Promise.resolve(false);
    }

    return Promise.resolve(true);
  }

  public resolveHomeserver(publicKey: string): string | null {
    this.ensureInitialized();

    try {
      // Construct homeserver URL - in production this would be resolved via DNS
      return `https://${publicKey}.pubky.network`;
    } catch (error) {
      console.error("Failed to resolve homeserver:", error);
      return null;
    }
  }

  // Helper function to add timeout to fetch operations
  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = 30000,
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Operation timeout after ${timeoutMs}ms`)),
        timeoutMs,
      );
    });

    return Promise.race([promise, timeoutPromise]);
  }

  public async get(url: string): Promise<Uint8Array | null> {
    this.ensureInitialized();

    try {
      console.log("Pubky client GET:", url);
      // If it's a pubky:// URL, let the SDK handle it directly with timeout
      const response = await this.withTimeout(this.client.fetch(url), 30000);
      console.log("Response status:", response.status, response.statusText);

      if (response.ok) {
        const arrayBuffer = await this.withTimeout(
          response.arrayBuffer(),
          30000,
        ) as ArrayBuffer;
        const result = new Uint8Array(arrayBuffer);
        console.log("Successfully fetched data, length:", result.length);
        return result;
      } else {
        console.error(
          "HTTP error response:",
          response.status,
          response.statusText,
          url,
        );
        return null;
      }
    } catch (error) {
      // Check for specific error types
      if (error instanceof Error && error.message.includes("timeout")) {
        console.error("Request timeout:", error.message, url);
      } else if (
        error instanceof TypeError && error.message.includes("fetch")
      ) {
        console.error("Network/fetch error:", error.message, url);
      } else if (
        error instanceof Error &&
        (error.name === "CompileError" || error.name === "RuntimeError")
      ) {
        console.error("WebAssembly error:", error, url);
      } else {
        console.error("Pubky client error:", error, url);
      }
      return null;
    }
  }

  public async put(url: string, content: Uint8Array): Promise<boolean> {
    this.ensureInitialized();

    try {
      console.log("Pubky client PUT:", url, "Size:", content.length);
      const response = await this.withTimeout(
        this.client.fetch(url, {
          method: "PUT",
          body: content,
          credentials: "include",
        }),
        30000,
      );
      console.log("PUT response status:", response.status, response.statusText);
      return response.ok;
    } catch (error) {
      if (error instanceof Error && error.message.includes("timeout")) {
        console.error("PUT timeout:", error.message, url);
      } else {
        console.error("Failed to put data:", error, url);
      }
      return false;
    }
  }

  public async list(
    url: string,
    cursor?: string,
    reverse?: boolean,
    limit?: number,
  ): Promise<string[]> {
    this.ensureInitialized();

    try {
      const response = await this.client.list(url, cursor, reverse, limit);
      return response || [];
    } catch (error) {
      console.error("Failed to list directory:", error);
      return [];
    }
  }

  public async delete(url: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      console.log("Pubky client DELETE:", url);
      const response = await this.withTimeout(
        this.client.fetch(url, {
          method: "DELETE",
          credentials: "include",
        }),
        30000,
      );
      console.log(
        "DELETE response status:",
        response.status,
        response.statusText,
      );
      return response.ok;
    } catch (error) {
      if (error instanceof Error && error.message.includes("timeout")) {
        console.error("DELETE timeout:", error.message, url);
      } else {
        console.error("Failed to delete:", error, url);
      }
      return false;
    }
  }

  public async signup(
    keypair: Keypair,
    homeserver: PublicKey,
    signupToken?: string,
  ): Promise<Session> {
    this.ensureInitialized();

    try {
      const session = await this.client.signup(
        keypair,
        homeserver,
        signupToken,
      );
      this.currentSession = session;
      return session;
    } catch (error) {
      console.error("Failed to signup:", error);
      throw error;
    }
  }

  async signin(keypair: Keypair): Promise<Session | undefined> {
    this.ensureInitialized();

    try {
      // SDK signin might be void - call it then get the session separately
      await this.client.signin(keypair);

      // Try to get the session after signin
      const publicKey = keypair.publicKey();
      const session = await this.client.session(publicKey);

      if (session) {
        this.currentSession = session;
        return session;
      }
      return undefined;
    } catch (error) {
      console.error("Signin failed:", error);
      return undefined;
    }
  }

  public async signout(publicKey: PublicKey): Promise<void> {
    this.ensureInitialized();

    try {
      await this.client.signout(publicKey);
      this.currentSession = null;
    } catch (error) {
      console.error("Failed to signout:", error);
      throw error;
    }
  }

  public async session(publicKey: PublicKey): Promise<Session | null> {
    this.ensureInitialized();

    try {
      const session = await this.client.session(publicKey);
      if (session) {
        this.currentSession = session;
      }
      return session || null;
    } catch (error) {
      console.error("Failed to get session:", error);
      return null;
    }
  }

  /**
   * Create an auth request with only the specified capabilities (no default /pub access for security)
   */
  public authRequest(
    relay: string,
    capabilities: string[] = [],
    callbackUrl?: string,
  ): PubkyAuthRequest {
    this.ensureInitialized();

    const allCapabilities = capabilities.join(",");

    // If callback URL is provided, include it in the relay URL (TODO: Is not working right now)
    const relayWithCallback = callbackUrl
      ? `${relay}?callback=${encodeURIComponent(callbackUrl)}`
      : relay;

    return this.client.authRequest(relayWithCallback, allCapabilities);
  }

  public async sendAuthToken(
    keypair: Keypair,
    pubkyauthUrl: string,
  ): Promise<void> {
    this.ensureInitialized();

    try {
      await this.client.sendAuthToken(keypair, pubkyauthUrl);
    } catch (error) {
      console.error("Failed to send auth token:", error);
      throw error;
    }
  }

  /**
   * Get the base path for this application
   */
  public getBasePath(publicKey: string): string {
    return `pubky://${publicKey}/pub/`;
  }

  /**
   * Construct a full path within the app's namespace
   */
  public getAppPath(publicKey: string, relativePath: string): string {
    const basePath = this.getBasePath(publicKey);
    const cleanPath = relativePath.startsWith("/")
      ? relativePath.slice(1)
      : relativePath;
    return basePath + cleanPath;
  }

  /**
   * Check if the current session has the required capabilities
   */
  public hasCapability(capability: string): boolean {
    if (!this.currentSession) {
      return false;
    }

    const sessionCapabilities = this.currentSession.capabilities();
    return sessionCapabilities.some((cap) => {
      // Simple capability matching - could be more sophisticated
      if (cap === capability) return true;
      if (cap.endsWith(":rw") && capability.endsWith(":r")) {
        return cap.replace(":rw", "") === capability.replace(":r", "");
      }
      return false;
    });
  }

  /**
   * Get current session
   */
  public getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Get current session capabilities
   */
  public getCurrentCapabilities(): string[] {
    return this.currentSession?.capabilities() || [];
  }

  // Utility methods for creating keypairs and public keys
  public static generateKeypair(): Keypair {
    return Keypair.random();
  }

  public static createKeypairFromSecret(secretKey: Uint8Array): Keypair {
    return Keypair.fromSecretKey(secretKey);
  }

  public static createPublicKey(publicKeyString: string): PublicKey {
    return PublicKey.from(publicKeyString);
  }

  /**
   * Parse a pubky:// URL into its components
   */
  public static parsePubkyUrl(
    url: string,
  ): { publicKey: string; path: string } | null {
    if (!url.startsWith("pubky://")) {
      return null;
    }

    const urlWithoutScheme = url.slice(8);
    const firstSlashIndex = urlWithoutScheme.indexOf("/");

    if (firstSlashIndex === -1) {
      return {
        publicKey: urlWithoutScheme,
        path: "",
      };
    }

    return {
      publicKey: urlWithoutScheme.slice(0, firstSlashIndex),
      path: urlWithoutScheme.slice(firstSlashIndex + 1),
    };
  }

  /**
   * Check if a URL is a valid pubky:// URL
   */
  public static isValidPubkyUrl(url: string): boolean {
    return url.startsWith("pubky://") &&
      PubkyClient.parsePubkyUrl(url) !== null;
  }
}

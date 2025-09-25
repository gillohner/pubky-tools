export interface PubkyFile {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  lastModified?: string;
  content?: string;
}

export interface PubkyUser {
  publicKey: string;
  homeserver?: string;
  capabilities?: string[];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: PubkyUser | null;
  isLoading: boolean;
}

export interface CacheEntry {
  id?: number;
  path: string;
  data: string;
  timestamp: number;
  ttl: number;
}

export interface FileSchema {
  id: string;
  name: string;
  description?: string;
  extensions: string[];
  validate: (content: string) => { valid: boolean; error?: string };
  format: (content: string) => string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  component: unknown; // React.ComponentType - simplified for Deno compatibility
}

export interface BlobMetadata {
  name: string;
  created_at: number;
  src: string; // pubky:// URL to the blob data
  content_type: string;
  size: number;
}

export interface FileCreateOptions {
  type: "text" | "json" | "image" | "folder";
  name?: string;
  path?: string;
}

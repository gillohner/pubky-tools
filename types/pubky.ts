export interface PubkySession {
  publicKey: string;
  homeserver?: string;
  capabilities: string[];
  isAuthenticated: boolean;
  expiresAt?: number;
}

export interface AuthRequest {
  url: string;
  promise: Promise<PubkyPublicKey>;
}

export interface PubkyPublicKey {
  z32(): string;
}

export interface LoginResult {
  success: boolean;
  session?: PubkySession;
  error?: string;
}

export interface PubkyFile {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modifiedAt?: string;
  content?: string;
}

export interface FileOperationResult {
  success: boolean;
  error?: string;
  data?: string | PubkyFile[] | null;
}

export interface AuthContextType {
  state: {
    user: PubkySession | null;
    isAuthenticated: boolean;
    isLoading: boolean;
  };
  login: (user: Omit<PubkySession, "isAuthenticated">) => void;
  logout: () => void;
  updateUser: (updates: Partial<PubkySession>) => void;
}

export interface AppConfig {
  appName: string;
  appUrl: string;
  appCallbackUrl: string;
  pubkyRelay: string;
  pubkyRingIOSUrl: string;
  pubkyRingAndroidUrl: string;
}

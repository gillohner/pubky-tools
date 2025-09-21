import { CacheEntry } from "@/types/index";

// In-memory cache implementation for temporary data storage
export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL_MS = 30 * 60 * 1000; // 30 minutes

  private constructor() {
    this.initializeCache();
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private initializeCache() {
    // In-memory cache initialization
    console.log("In-memory cache initialized");
  }

  public get(path: string): string | null {
    try {
      const entry = this.cache.get(path);

      if (!entry) {
        return null;
      }

      // Check if entry has expired
      if (Date.now() - entry.timestamp > this.TTL_MS) {
        this.cache.delete(path);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  public set(path: string, data: string): void {
    try {
      const entry: CacheEntry = {
        path,
        data,
        timestamp: Date.now(),
        ttl: this.TTL_MS,
      };

      this.cache.set(path, entry);
      console.log(`Cached data for path: ${path}`);
    } catch (error) {
      console.error("Cache set error:", error);
    }
  }

  public delete(path: string): void {
    try {
      this.cache.delete(path);
      console.log(`Deleted cache for path: ${path}`);
    } catch (error) {
      console.error("Cache delete error:", error);
    }
  }

  public clear(): void {
    try {
      this.cache.clear();
      console.log("Cache cleared");
    } catch (error) {
      console.error("Cache clear error:", error);
    }
  }

  public async invalidate(pathPattern?: string): Promise<void> {
    try {
      if (!pathPattern) {
        await this.clear();
        return;
      }

      // Remove entries matching pattern
      Array.from(this.cache.keys()).forEach((key) => {
        if (key.includes(pathPattern)) {
          this.cache.delete(key);
        }
      });

      console.log(`Invalidated cache for pattern: ${pathPattern}`);
    } catch (error) {
      console.error("Cache invalidate error:", error);
    }
  }

  public cleanup(): void {
    try {
      const now = Date.now();
      Array.from(this.cache.entries()).forEach(([key, entry]) => {
        if (now - entry.timestamp > this.TTL_MS) {
          this.cache.delete(key);
        }
      });
      console.log("Cache cleanup completed");
    } catch (error) {
      console.error("Cache cleanup error:", error);
    }
  }

  public getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

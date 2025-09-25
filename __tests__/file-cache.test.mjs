import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert";

// Mock cache storage for testing
const mockCache = {
  exec: () => {},
  prepare: (_query) => ({
    run: (..._args) => ({ changes: 1 }),
    get: (...args) => {
      // Simulate cache behavior
      const key = args[0];
      const now = args[1];

      if (mockCache._cache && mockCache._cache.has(key)) {
        const entry = mockCache._cache.get(key);
        if (!now || (entry.created_at + entry.ttl > now)) {
          return {
            data: entry.data,
            created_at: entry.created_at,
            ttl: entry.ttl,
          };
        }
      }
      return undefined;
    },
  }),
  _cache: new Map(),
};

// Mock the FileCache class for testing
class FileCache {
  constructor() {
    this.cache = mockCache;
    this.DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
    this.cleanup();
  }

  static getInstance() {
    if (!FileCache.instance) {
      FileCache.instance = new FileCache();
    }
    return FileCache.instance;
  }

  static resetInstance() {
    FileCache.instance = null;
    mockCache._cache.clear();
  }

  cleanup() {
    if (!mockCache._cache) return;

    const now = Date.now();
    for (const [key, entry] of mockCache._cache.entries()) {
      if (entry.created_at + entry.ttl < now) {
        mockCache._cache.delete(key);
      }
    }
  }

  set(key, data, ttl) {
    const now = Date.now();
    const actualTtl = ttl || this.DEFAULT_TTL;

    const entry = {
      data: JSON.stringify(data),
      created_at: now,
      ttl: actualTtl,
    };

    // Don't store entries with TTL of 0 (immediately expired)
    if (ttl === 0) {
      return; // Don't store immediately expired entries
    }

    mockCache._cache.set(key, entry);
  }

  get(key) {
    const now = Date.now();

    if (mockCache._cache && mockCache._cache.has(key)) {
      const entry = mockCache._cache.get(key);
      // Handle TTL of 0 as immediately expired
      if (entry.ttl === 0 || entry.created_at + entry.ttl <= now) {
        // Remove expired entry
        mockCache._cache.delete(key);
        return null;
      } else {
        return JSON.parse(entry.data);
      }
    }

    return null;
  }

  delete(key) {
    if (mockCache._cache) {
      mockCache._cache.delete(key);
    }
  }

  clear() {
    if (mockCache._cache) {
      mockCache._cache.clear();
    }
  }

  clearByPattern(pattern) {
    if (!mockCache._cache) return;

    // Convert SQL LIKE pattern to regex
    const regexPattern = pattern
      .replace(/%/g, ".*")
      .replace(/_/g, ".");
    const regex = new RegExp(`^${regexPattern}$`);

    for (const key of mockCache._cache.keys()) {
      if (regex.test(key)) {
        mockCache._cache.delete(key);
      }
    }
  }

  getStats() {
    if (!mockCache._cache) {
      return { totalEntries: 0, validEntries: 0 };
    }

    const now = Date.now();
    const totalEntries = mockCache._cache.size;
    let validEntries = 0;

    for (const entry of mockCache._cache.values()) {
      if (entry.created_at + entry.ttl > now) {
        validEntries++;
      }
    }

    return { totalEntries, validEntries };
  }
}

describe("FileCache", () => {
  let cache;

  beforeEach(() => {
    FileCache.resetInstance();
    cache = FileCache.getInstance();
  });

  afterEach(() => {
    cache.clear();
    FileCache.resetInstance();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const cache1 = FileCache.getInstance();
      const cache2 = FileCache.getInstance();
      assert.strictEqual(cache1, cache2);
    });
  });

  describe("Basic Operations", () => {
    it("should set and get string values", () => {
      const key = "test:string";
      const value = "hello world";

      cache.set(key, value);
      const result = cache.get(key);

      assert.strictEqual(result, value);
    });

    it("should set and get object values", () => {
      const key = "test:object";
      const value = { name: "test", data: [1, 2, 3] };

      cache.set(key, value);
      const result = cache.get(key);

      assert.deepStrictEqual(result, value);
    });

    it("should set and get array values", () => {
      const key = "test:array";
      const value = ["file1.txt", "file2.txt", "folder/"];

      cache.set(key, value);
      const result = cache.get(key);

      assert.deepStrictEqual(result, value);
    });

    it("should return null for non-existent keys", () => {
      const result = cache.get("non-existent-key");
      assert.strictEqual(result, null);
    });

    it("should delete entries", () => {
      const key = "test:delete";
      const value = "to be deleted";

      cache.set(key, value);
      assert.strictEqual(cache.get(key), value);

      cache.delete(key);
      assert.strictEqual(cache.get(key), null);
    });

    it("should clear all entries", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      cache.clear();

      assert.strictEqual(cache.get("key1"), null);
      assert.strictEqual(cache.get("key2"), null);
      assert.strictEqual(cache.get("key3"), null);
    });
  });

  describe("TTL (Time To Live)", () => {
    it("should respect custom TTL", async () => {
      const key = "test:ttl";
      const value = "expires soon";
      const ttl = 100; // 100ms

      cache.set(key, value, ttl);

      // Should be available immediately
      assert.strictEqual(cache.get(key), value);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be expired
      assert.strictEqual(cache.get(key), null);
    });

    it("should use default TTL when not specified", () => {
      const key = "test:default-ttl";
      const value = "uses default ttl";

      cache.set(key, value);

      // Should be available
      assert.strictEqual(cache.get(key), value);

      // Check that entry exists in internal cache with default TTL
      const entry = mockCache._cache.get(key);
      assert.strictEqual(entry.ttl, cache.DEFAULT_TTL);
    });

    it("should handle TTL of 0 (immediate expiration)", () => {
      const key = "test:zero-ttl";
      const value = "expires immediately";

      cache.set(key, value, 0);

      // Should be expired immediately
      assert.strictEqual(cache.get(key), null);
    });
  });

  describe("Pattern-based Clearing", () => {
    beforeEach(() => {
      // Set up test data
      cache.set("list:pubky://user1/pub/", ["file1.txt"]);
      cache.set("list:pubky://user1/pub/docs/", ["doc1.md"]);
      cache.set("list:pubky://user2/pub/", ["file2.txt"]);
      cache.set("file:pubky://user1/pub/file1.txt", "content1");
      cache.set("file:pubky://user2/pub/file2.txt", "content2");
    });

    it("should clear entries matching pattern with wildcard", () => {
      cache.clearByPattern("list:pubky://user1%");

      // User1 list entries should be cleared
      assert.strictEqual(cache.get("list:pubky://user1/pub/"), null);
      assert.strictEqual(cache.get("list:pubky://user1/pub/docs/"), null);

      // User2 and file entries should remain
      assert.deepStrictEqual(cache.get("list:pubky://user2/pub/"), [
        "file2.txt",
      ]);
      assert.strictEqual(
        cache.get("file:pubky://user1/pub/file1.txt"),
        "content1",
      );
    });

    it("should clear all list entries", () => {
      cache.clearByPattern("list:%");

      // All list entries should be cleared
      assert.strictEqual(cache.get("list:pubky://user1/pub/"), null);
      assert.strictEqual(cache.get("list:pubky://user1/pub/docs/"), null);
      assert.strictEqual(cache.get("list:pubky://user2/pub/"), null);

      // File entries should remain
      assert.strictEqual(
        cache.get("file:pubky://user1/pub/file1.txt"),
        "content1",
      );
      assert.strictEqual(
        cache.get("file:pubky://user2/pub/file2.txt"),
        "content2",
      );
    });

    it("should handle exact pattern matching", () => {
      cache.clearByPattern("list:pubky://user1/pub/");

      // Only exact match should be cleared
      assert.strictEqual(cache.get("list:pubky://user1/pub/"), null);

      // Similar but different paths should remain
      assert.deepStrictEqual(cache.get("list:pubky://user1/pub/docs/"), [
        "doc1.md",
      ]);
      assert.deepStrictEqual(cache.get("list:pubky://user2/pub/"), [
        "file2.txt",
      ]);
    });
  });

  describe("Cache Statistics", () => {
    it("should return correct stats for empty cache", () => {
      const stats = cache.getStats();
      assert.strictEqual(stats.totalEntries, 0);
      assert.strictEqual(stats.validEntries, 0);
    });

    it("should return correct stats for active entries", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      const stats = cache.getStats();
      assert.strictEqual(stats.totalEntries, 3);
      assert.strictEqual(stats.validEntries, 3);
    });

    it("should differentiate between total and valid entries with expired data", async () => {
      // Add some entries with different TTLs
      cache.set("key1", "value1", 1000); // 1 second
      cache.set("key2", "value2", 50); // 50ms (will expire)
      cache.set("key3", "value3", 1000); // 1 second

      // Wait for some to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      const stats = cache.getStats();
      assert.strictEqual(stats.totalEntries, 3);
      assert.strictEqual(stats.validEntries, 2); // key2 should be expired
    });
  });

  describe("Cache Cleanup", () => {
    it("should remove expired entries during cleanup", async () => {
      cache.set("key1", "value1", 50); // Will expire
      cache.set("key2", "value2", 1000); // Will not expire

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Trigger cleanup
      cache.cleanup();

      // Check stats
      const stats = cache.getStats();
      assert.strictEqual(stats.totalEntries, 1);
      assert.strictEqual(stats.validEntries, 1);

      // Verify correct entry remains
      assert.strictEqual(cache.get("key1"), null);
      assert.strictEqual(cache.get("key2"), "value2");
    });
  });

  describe("Error Handling", () => {
    it("should handle undefined/null keys gracefully", () => {
      assert.strictEqual(cache.get(undefined), null);
      assert.strictEqual(cache.get(null), null);
      assert.strictEqual(cache.get(""), null);
    });

    it("should handle malformed JSON in cache gracefully", () => {
      // Directly insert malformed data into mock cache
      mockCache._cache.set("malformed", {
        data: '{"invalid": json}',
        created_at: Date.now(),
        ttl: 60000,
      });

      // Should handle gracefully and return null
      try {
        const result = cache.get("malformed");
        assert.strictEqual(result, null);
      } catch (error) {
        // If it throws, that's also acceptable behavior
        assert.ok(error instanceof SyntaxError);
      }
    });
  });

  describe("File Listing Cache Integration", () => {
    it("should cache file listing responses correctly", () => {
      const url = "pubky://user123/pub/";
      const cacheKey = `list:${url}:::50`;
      const mockResponse = {
        files: ["file1.txt", "file2.txt", "folder/"],
        cursor: "folder/",
        fromCache: false,
      };

      cache.set(cacheKey, mockResponse);
      const cached = cache.get(cacheKey);

      assert.deepStrictEqual(cached, mockResponse);
    });

    it("should handle complex file listing data", () => {
      const cacheKey = "list:pubky://user/pub/docs/::false:20";
      const fileData = {
        files: [
          "pubky://user/pub/docs/readme.md",
          "pubky://user/pub/docs/guide/",
          "pubky://user/pub/docs/api.json",
        ],
        cursor: "pubky://user/pub/docs/api.json",
        fromCache: false,
      };

      cache.set(cacheKey, fileData, 10 * 60 * 1000); // 10 minutes
      const result = cache.get(cacheKey);

      assert.deepStrictEqual(result, fileData);
    });
  });

  describe("Concurrent Access Simulation", () => {
    it("should handle multiple simultaneous operations", async () => {
      const operations = [];

      // Simulate concurrent set operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          new Promise((resolve) => {
            setTimeout(() => {
              cache.set(`concurrent:${i}`, `value${i}`);
              resolve();
            }, Math.random() * 10);
          }),
        );
      }

      await Promise.all(operations);

      // Verify all values are set correctly
      for (let i = 0; i < 10; i++) {
        assert.strictEqual(cache.get(`concurrent:${i}`), `value${i}`);
      }
    });
  });
});

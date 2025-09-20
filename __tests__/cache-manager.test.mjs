import { beforeEach, describe, it } from "node:test";
import assert from "node:assert";

// Simple cache manager implementation for testing
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0 };
  }

  set(key, value, ttl) {
    const entry = {
      value,
      expires: ttl ? Date.now() + ttl : null,
    };
    this.cache.set(key, entry);
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (entry.expires && Date.now() > entry.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  invalidate(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
    };
  }
}

describe("CacheManager", () => {
  let cacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager();
  });

  it("should set and get values", () => {
    const key = "test-key";
    const value = { data: "test-data" };

    cacheManager.set(key, value);
    const result = cacheManager.get(key);

    assert.deepStrictEqual(result, value);
  });

  it("should return null for non-existent keys", () => {
    const result = cacheManager.get("non-existent-key");
    assert.strictEqual(result, null);
  });

  it("should handle TTL expiration", async () => {
    const key = "ttl-test";
    const value = { data: "test" };
    const ttl = 100; // 100ms

    cacheManager.set(key, value, ttl);

    // Should exist immediately
    assert.deepStrictEqual(cacheManager.get(key), value);

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Should be expired
    assert.strictEqual(cacheManager.get(key), null);
  });

  it("should invalidate cache entries", () => {
    const key = "invalidate-test";
    const value = { data: "test" };

    cacheManager.set(key, value);
    assert.deepStrictEqual(cacheManager.get(key), value);

    cacheManager.invalidate(key);
    assert.strictEqual(cacheManager.get(key), null);
  });

  it("should clear all cache entries", () => {
    cacheManager.set("key1", "value1");
    cacheManager.set("key2", "value2");

    assert.strictEqual(cacheManager.get("key1"), "value1");
    assert.strictEqual(cacheManager.get("key2"), "value2");

    cacheManager.clear();

    assert.strictEqual(cacheManager.get("key1"), null);
    assert.strictEqual(cacheManager.get("key2"), null);
  });

  it("should provide cache statistics", () => {
    cacheManager.set("key1", "value1");
    cacheManager.set("key2", "value2");
    cacheManager.get("key1"); // hit
    cacheManager.get("key3"); // miss

    const stats = cacheManager.getStats();

    assert.strictEqual(stats.size, 2);
    assert.strictEqual(stats.hits, 1);
    assert.strictEqual(stats.misses, 1);
  });
});

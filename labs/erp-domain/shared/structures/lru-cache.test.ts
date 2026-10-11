import { LruCache } from "./lru-cache";

describe("LruCache", () => {
  it("returns undefined for a missing key", () => {
    const cache = new LruCache<string, number>(2);

    expect(cache.get("missing")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("evicts the least recently used entry after a cache hit promotes another entry", () => {
    const cache = new LruCache<string, number>(2);
    cache.put("receipt-1", 10);
    cache.put("receipt-2", 20);

    expect(cache.get("receipt-1")).toBe(10);

    cache.put("receipt-3", 30);

    expect(cache.get("receipt-2")).toBeUndefined();
    expect(cache.get("receipt-1")).toBe(10);
    expect(cache.get("receipt-3")).toBe(30);
    expect(cache.size).toBe(2);
  });

  it("updates an existing key without growing the cache and treats it as most recently used", () => {
    const cache = new LruCache<string, number>(2);
    cache.put("warehouse-a", 1);
    cache.put("warehouse-b", 2);
    cache.put("warehouse-a", 3);
    cache.put("warehouse-c", 4);

    expect(cache.get("warehouse-b")).toBeUndefined();
    expect(cache.get("warehouse-a")).toBe(3);
    expect(cache.get("warehouse-c")).toBe(4);
    expect(cache.size).toBe(2);
  });

  it("does not retain entries when capacity is zero", () => {
    const cache = new LruCache<string, number>(0);
    cache.put("inventory-summary", 1);

    expect(cache.get("inventory-summary")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("removes an entry so a subsequent read is a miss", () => {
    const cache = new LruCache<string, number>(2);
    cache.put("sku-a", 10);

    expect(cache.delete("sku-a")).toBe(true);
    expect(cache.get("sku-a")).toBeUndefined();
    expect(cache.delete("sku-a")).toBe(false);
  });

  it("rejects a negative or non-integer capacity", () => {
    expect(() => new LruCache<string, number>(-1)).toThrow("capacity must be a non-negative integer");
    expect(() => new LruCache<string, number>(1.5)).toThrow("capacity must be a non-negative integer");
  });
});

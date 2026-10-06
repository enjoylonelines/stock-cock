type CacheNode<K, V> = {
  key: K;
  value: V;
  previous?: CacheNode<K, V>;
  next?: CacheNode<K, V>;
};

/**
 * A bounded least-recently-used cache backed by a hash map and a doubly linked list.
 * This is a Lab learning artifact; it is not wired into the production inventory path.
 */
export class LruCache<K, V> {
  private readonly entries = new Map<K, CacheNode<K, V>>();
  private head?: CacheNode<K, V>;
  private tail?: CacheNode<K, V>;

  constructor(private readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 0) {
      throw new RangeError("capacity must be a non-negative integer");
    }
  }

  get size(): number {
    return this.entries.size;
  }

  get(key: K): V | undefined {
    const node = this.entries.get(key);
    if (!node) {
      return undefined;
    }

    this.moveToHead(node);
    return node.value;
  }

  put(key: K, value: V): void {
    const existing = this.entries.get(key);
    if (existing) {
      existing.value = value;
      this.moveToHead(existing);
      return;
    }

    if (this.capacity === 0) {
      return;
    }

    const node: CacheNode<K, V> = { key, value };
    this.entries.set(key, node);
    this.prepend(node);

    if (this.entries.size > this.capacity) {
      this.evictLeastRecentlyUsed();
    }
  }

  private moveToHead(node: CacheNode<K, V>): void {
    if (node === this.head) {
      return;
    }

    this.detach(node);
    this.prepend(node);
  }

  private prepend(node: CacheNode<K, V>): void {
    node.previous = undefined;
    node.next = this.head;

    if (this.head) {
      this.head.previous = node;
    } else {
      this.tail = node;
    }

    this.head = node;
  }

  private detach(node: CacheNode<K, V>): void {
    if (node.previous) {
      node.previous.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.previous = node.previous;
    } else {
      this.tail = node.previous;
    }

    node.previous = undefined;
    node.next = undefined;
  }

  private evictLeastRecentlyUsed(): void {
    const leastRecentlyUsed = this.tail;
    if (!leastRecentlyUsed) {
      return;
    }

    this.detach(leastRecentlyUsed);
    this.entries.delete(leastRecentlyUsed.key);
  }
}

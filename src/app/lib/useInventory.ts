// lib/useInventory.ts

export function processOut(inventory: { id: string; stock: number }[], targetId: string) {
  return inventory.map((item) => (item.id === targetId ? { ...item, stock: Math.max(item.stock - 1, 0) } : item));
}

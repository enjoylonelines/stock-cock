import { APIError } from "@/utils/api-error";

export interface InventoryMoveItemCommand {
  optionId: string;
  quantity: number;
  productType?: string;
}

export interface InventoryMoveCommand {
  fromWarehouseId: string;
  toWarehouseId: string;
  userId: string;
  memo?: string;
  createdAt?: string;
  items: InventoryMoveItemCommand[];
}

/**
 * The only write boundary the move application service needs. Its production
 * implementation is the existing ledgered PostgreSQL RPC adapter.
 */
export interface InventoryMoveWriteContract {
  createLedgeredMove(command: InventoryMoveCommand): Promise<string>;
}

/**
 * Coordinates one move command above the database transaction boundary.
 * Authorization is intentionally not claimed here: a future boundary must
 * provide verified actor identity instead of trusting a route body user id.
 */
export class InventoryMoveApplicationService {
  constructor(private readonly writer: InventoryMoveWriteContract) {}

  async execute(command: InventoryMoveCommand): Promise<string> {
    if (command.fromWarehouseId === command.toWarehouseId || command.items.length === 0) {
      throw APIError.badRequest("유효한 재고 이동 항목과 서로 다른 창고가 필요합니다.");
    }
    if (command.items.some(item => !Number.isFinite(item.quantity) || item.quantity <= 0)) {
      throw APIError.badRequest("이동 수량은 양수여야 합니다.");
    }

    return this.writer.createLedgeredMove(command);
  }
}

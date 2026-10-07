export type InventoryDocumentType = "receipt" | "shipment" | "transfer" | "return" | "adjustment_in" | "adjustment_out";
export type InventoryDocumentStatus = "DRAFT" | "CONFIRMED" | "POSTED" | "REVERSED";

export interface InventoryDocumentLineCommand {
  productId: string;
  quantity: number;
  sourceLocationId?: string;
  destinationLocationId?: string;
  sourceDocumentLineId?: string;
}

export interface CreateInventoryDocumentCommand {
  tenantId: string;
  type: InventoryDocumentType;
  idempotencyKey: string;
  lines: InventoryDocumentLineCommand[];
  sourceDocumentId?: string;
}

export interface InventoryDocument {
  id: string;
  tenantId: string;
  type: InventoryDocumentType;
  status: InventoryDocumentStatus;
  idempotencyKey: string;
}

/**
 * The SQL adapter owns the transaction that posts a confirmed document, ledger
 * entries, and balance projection together. This service only validates the
 * command boundary and keeps the workflow explicit in TypeScript.
 */
export interface InventoryDocumentWorkflowPort {
  createDraft(command: CreateInventoryDocumentCommand): Promise<InventoryDocument>;
  confirm(documentId: string, tenantId: string): Promise<InventoryDocument>;
  postConfirmed(documentId: string, tenantId: string): Promise<InventoryDocument>;
}

export class InventoryDocumentWorkflowService {
  constructor(private readonly port: InventoryDocumentWorkflowPort) {}

  async createDraft(command: CreateInventoryDocumentCommand): Promise<InventoryDocument> {
    this.validateCreateCommand(command);
    return this.port.createDraft(command);
  }

  async confirm(documentId: string, tenantId: string): Promise<InventoryDocument> {
    this.assertIdentifier(documentId, "documentId");
    this.assertIdentifier(tenantId, "tenantId");
    return this.port.confirm(documentId, tenantId);
  }

  async postConfirmed(documentId: string, tenantId: string): Promise<InventoryDocument> {
    this.assertIdentifier(documentId, "documentId");
    this.assertIdentifier(tenantId, "tenantId");
    return this.port.postConfirmed(documentId, tenantId);
  }

  private validateCreateCommand(command: CreateInventoryDocumentCommand): void {
    this.assertIdentifier(command.tenantId, "tenantId");
    this.assertIdentifier(command.idempotencyKey, "idempotencyKey");

    if (command.lines.length === 0) {
      throw new Error("at least one document line is required");
    }

    for (const line of command.lines) {
      this.assertIdentifier(line.productId, "productId");
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        throw new Error("line quantity must be a positive finite number");
      }

      if (command.type === "receipt" || command.type === "adjustment_in") {
        this.assertIdentifier(line.destinationLocationId, "destinationLocationId");
      }
      if (command.type === "shipment" || command.type === "adjustment_out") {
        this.assertIdentifier(line.sourceLocationId, "sourceLocationId");
      }
      if (command.type === "transfer") {
        this.assertIdentifier(line.sourceLocationId, "sourceLocationId");
        this.assertIdentifier(line.destinationLocationId, "destinationLocationId");
        if (line.sourceLocationId === line.destinationLocationId) {
          throw new Error("transfer source and destination must differ");
        }
      }
      if (command.type === "return") {
        this.assertIdentifier(command.sourceDocumentId, "sourceDocumentId");
        this.assertIdentifier(line.sourceDocumentLineId, "sourceDocumentLineId");
        this.assertIdentifier(line.destinationLocationId, "destinationLocationId");
      }
    }
  }

  private assertIdentifier(value: string | undefined, name: string): asserts value is string {
    if (!value?.trim()) {
      throw new Error(`${name} is required`);
    }
  }
}

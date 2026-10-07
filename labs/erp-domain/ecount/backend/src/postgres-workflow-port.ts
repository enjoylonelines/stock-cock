import { Pool } from "pg";

import type {
  CreateInventoryDocumentCommand,
  InventoryDocument,
  InventoryDocumentLineCommand,
  InventoryDocumentWorkflowPort,
} from "./inventory-document-workflow";
import { type ProductUnitPolicy, unitErrorResponse } from "./unit-entry-feedback";

export class LabHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
  }
}

export interface ErpLabDocumentDetail extends InventoryDocument {
  lines: Array<Record<string, unknown>>;
  ledger: Array<Record<string, unknown>>;
  balances: Array<Record<string, unknown>>;
}

function toDocument(row: Record<string, unknown>): InventoryDocument {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    type: row.document_type as InventoryDocument["type"],
    status: row.status as InventoryDocument["status"],
    idempotencyKey: String(row.idempotency_key),
  };
}

function lineToSql(line: InventoryDocumentLineCommand): Record<string, unknown> {
  return {
    product_id: line.productId,
    quantity: line.quantity,
    ...(line.unit ? { unit: line.unit } : {}),
    ...(line.sourceLocationId ? { source_location_id: line.sourceLocationId } : {}),
    ...(line.destinationLocationId ? { destination_location_id: line.destinationLocationId } : {}),
    ...(line.sourceDocumentLineId ? { source_document_line_id: line.sourceDocumentLineId } : {}),
  };
}

export class PostgresInventoryDocumentPort implements InventoryDocumentWorkflowPort {
  readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 4 });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async createDraft(command: CreateInventoryDocumentCommand): Promise<InventoryDocument> {
    await this.validateUnits(command);
    try {
      const result =
        command.type === "return"
          ? await this.pool.query<{ create_return_document: string }>(
              "SELECT erp_lab.create_return_document($1, $2, $3, $4::jsonb)",
              [
                command.sourceDocumentId,
                command.tenantId,
                command.idempotencyKey,
                JSON.stringify(command.lines.map(lineToSql)),
              ]
            )
          : await this.pool.query<{ create_inventory_document: string }>(
              "SELECT erp_lab.create_inventory_document($1, $2, $3, $4::jsonb)",
              [command.tenantId, command.type, command.idempotencyKey, JSON.stringify(command.lines.map(lineToSql))]
            );
      const id =
        command.type === "return" ? result.rows[0]?.create_return_document : result.rows[0]?.create_inventory_document;
      if (!id) {
        throw new LabHttpError(500, "DOCUMENT_CREATE_RESULT_MISSING", "전표 생성 결과가 없습니다.");
      }
      return this.getDocument(id, command.tenantId);
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async confirm(documentId: string, tenantId: string): Promise<InventoryDocument> {
    try {
      await this.pool.query("SELECT erp_lab.confirm_inventory_document($1, $2)", [documentId, tenantId]);
      return this.getDocument(documentId, tenantId);
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async postConfirmed(documentId: string, tenantId: string): Promise<InventoryDocument> {
    try {
      await this.pool.query("SELECT erp_lab.post_confirmed_document($1, $2)", [documentId, tenantId]);
      return this.getDocument(documentId, tenantId);
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async reverse(documentId: string, tenantId: string, idempotencyKey: string): Promise<InventoryDocument> {
    try {
      const result = await this.pool.query<{ create_reversal_document: string }>(
        "SELECT erp_lab.create_reversal_document($1, $2, $3)",
        [documentId, tenantId, idempotencyKey]
      );
      const reversalId = result.rows[0]?.create_reversal_document;
      if (!reversalId) {
        throw new LabHttpError(500, "REVERSAL_CREATE_RESULT_MISSING", "역분개 생성 결과가 없습니다.");
      }
      await this.pool.query("SELECT erp_lab.confirm_inventory_document($1, $2)", [reversalId, tenantId]);
      await this.pool.query("SELECT erp_lab.post_confirmed_document($1, $2)", [reversalId, tenantId]);
      return this.getDocument(reversalId, tenantId);
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async getDocument(documentId: string, tenantId: string): Promise<ErpLabDocumentDetail> {
    const client = await this.pool.connect();
    try {
      const documentResult = await client.query<Record<string, unknown>>(
        "SELECT id, tenant_id, document_type, status, idempotency_key FROM erp_lab.inventory_documents WHERE id = $1 AND tenant_id = $2",
        [documentId, tenantId]
      );
      const document = documentResult.rows[0];
      if (!document) {
        throw new LabHttpError(404, "DOCUMENT_NOT_FOUND", "전표를 찾을 수 없습니다.");
      }
      const [lines, ledger, balances] = await Promise.all([
        client.query<Record<string, unknown>>(
          "SELECT id, product_id, quantity, input_quantity, input_unit, source_location_id, destination_location_id, source_document_line_id FROM erp_lab.inventory_document_lines WHERE document_id = $1 ORDER BY id",
          [documentId]
        ),
        client.query<Record<string, unknown>>(
          "SELECT id, product_id, location_id, quantity_delta, posted_at FROM erp_lab.stock_ledger WHERE document_id = $1 ORDER BY id",
          [documentId]
        ),
        client.query<Record<string, unknown>>(
          "SELECT DISTINCT balances.product_id, balances.location_id, balances.quantity FROM erp_lab.inventory_balances AS balances JOIN erp_lab.inventory_document_lines AS lines ON lines.product_id = balances.product_id AND (lines.source_location_id = balances.location_id OR lines.destination_location_id = balances.location_id) WHERE lines.document_id = $1 AND balances.tenant_id = $2 ORDER BY balances.product_id, balances.location_id",
          [documentId, tenantId]
        ),
      ]);
      return { ...toDocument(document), lines: lines.rows, ledger: ledger.rows, balances: balances.rows };
    } finally {
      client.release();
    }
  }

  private async validateUnits(command: CreateInventoryDocumentCommand): Promise<void> {
    for (const [lineIndex, line] of command.lines.entries()) {
      const policy = await this.getUnitPolicy(command.tenantId, line.productId);
      if (!policy) {
        continue;
      }
      const unit = line.unit ?? policy.baseUnit;
      if (policy.conversions[unit] === undefined) {
        const feedback = unitErrorResponse(lineIndex, policy);
        throw new LabHttpError(400, feedback.code, feedback.message, feedback);
      }
    }
  }

  private async getUnitPolicy(tenantId: string, productId: string): Promise<ProductUnitPolicy | undefined> {
    const result = await this.pool.query<{
      sku: string;
      base_unit: string;
      unit: string;
      base_quantity_per_unit: string;
    }>(
      "SELECT products.sku, products.base_unit, conversions.unit, conversions.base_quantity_per_unit FROM erp_lab.products AS products JOIN erp_lab.product_unit_conversions AS conversions ON conversions.product_id = products.id WHERE products.id = $1 AND products.tenant_id = $2",
      [productId, tenantId]
    );
    const first = result.rows[0];
    if (!first) {
      return undefined;
    }
    return {
      sku: first.sku,
      baseUnit: first.base_unit,
      conversions: Object.fromEntries(result.rows.map(row => [row.unit, Number(row.base_quantity_per_unit)])),
    };
  }

  private mapPgError(error: unknown): Error {
    if (error instanceof LabHttpError) {
      return error;
    }
    const pgError = error as { code?: string; message?: string };
    if (pgError.code === "P0001" && pgError.message === "INSUFFICIENT_STOCK") {
      return new LabHttpError(409, "INSUFFICIENT_STOCK", "출고 가능한 재고가 부족합니다.");
    }
    if (pgError.code === "P0002") {
      return new LabHttpError(404, "DOCUMENT_NOT_FOUND", "전표를 찾을 수 없습니다.");
    }
    if (pgError.code === "22023") {
      return new LabHttpError(400, "INVALID_DOCUMENT_INPUT", "전표 입력값을 확인해 주세요.");
    }
    if (pgError.code === "P0001") {
      return new LabHttpError(409, pgError.message ?? "BUSINESS_RULE_REJECTED", "전표 업무 규칙을 확인해 주세요.");
    }
    return error instanceof Error ? error : new Error("UNKNOWN_DATABASE_ERROR");
  }
}

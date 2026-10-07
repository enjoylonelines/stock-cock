-- Isolated ERP Domain Lab schema. Do not apply this to Stock-Cock's public schema.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS erp_lab;

CREATE TABLE erp_lab.tenants (
  id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE
);

CREATE TABLE erp_lab.products (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES erp_lab.tenants(id),
  sku text NOT NULL,
  base_unit text NOT NULL,
  UNIQUE (tenant_id, sku)
);

-- Every document line is normalized to the product's base_unit before it
-- reaches the ledger or balance projection. The input unit remains on the line
-- for auditability.
CREATE TABLE erp_lab.product_unit_conversions (
  product_id uuid NOT NULL REFERENCES erp_lab.products(id),
  unit text NOT NULL,
  base_quantity_per_unit numeric NOT NULL CHECK (base_quantity_per_unit > 0),
  PRIMARY KEY (product_id, unit)
);

CREATE TABLE erp_lab.warehouses (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES erp_lab.tenants(id),
  code text NOT NULL,
  UNIQUE (tenant_id, code)
);

CREATE TABLE erp_lab.locations (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES erp_lab.tenants(id),
  warehouse_id uuid NOT NULL REFERENCES erp_lab.warehouses(id),
  code text NOT NULL,
  UNIQUE (tenant_id, warehouse_id, code)
);

CREATE TABLE erp_lab.inventory_documents (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES erp_lab.tenants(id),
  document_type text NOT NULL CHECK (document_type IN (
    'receipt', 'shipment', 'transfer', 'reversal', 'return', 'adjustment_in', 'adjustment_out'
  )),
  status text NOT NULL CHECK (status IN ('DRAFT', 'CONFIRMED', 'POSTED', 'REVERSED')),
  idempotency_key text NOT NULL,
  reversed_document_id uuid REFERENCES erp_lab.inventory_documents(id),
  source_document_id uuid REFERENCES erp_lab.inventory_documents(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE UNIQUE INDEX inventory_documents_one_reversal_per_source_idx
  ON erp_lab.inventory_documents(reversed_document_id)
  WHERE reversed_document_id IS NOT NULL;

CREATE TABLE erp_lab.inventory_document_lines (
  id uuid PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES erp_lab.inventory_documents(id),
  product_id uuid NOT NULL REFERENCES erp_lab.products(id),
  quantity numeric NOT NULL CHECK (quantity > 0),
  input_quantity numeric CHECK (input_quantity > 0),
  input_unit text,
  source_location_id uuid REFERENCES erp_lab.locations(id),
  destination_location_id uuid REFERENCES erp_lab.locations(id),
  source_document_line_id uuid REFERENCES erp_lab.inventory_document_lines(id)
);

CREATE TABLE erp_lab.stock_ledger (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES erp_lab.tenants(id),
  document_id uuid NOT NULL REFERENCES erp_lab.inventory_documents(id),
  document_line_id uuid NOT NULL REFERENCES erp_lab.inventory_document_lines(id),
  product_id uuid NOT NULL REFERENCES erp_lab.products(id),
  location_id uuid NOT NULL REFERENCES erp_lab.locations(id),
  quantity_delta numeric NOT NULL CHECK (quantity_delta <> 0),
  posted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE erp_lab.inventory_balances (
  tenant_id uuid NOT NULL REFERENCES erp_lab.tenants(id),
  product_id uuid NOT NULL REFERENCES erp_lab.products(id),
  location_id uuid NOT NULL REFERENCES erp_lab.locations(id),
  quantity numeric NOT NULL CHECK (quantity >= 0),
  version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
  PRIMARY KEY (tenant_id, product_id, location_id)
);

CREATE INDEX stock_ledger_reconciliation_idx
  ON erp_lab.stock_ledger(tenant_id, product_id, location_id, document_id);

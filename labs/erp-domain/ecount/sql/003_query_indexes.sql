-- Read-model indexes evaluated by the DD-A2 synthetic workload only.
-- Apply after the baseline measurement; do not infer production suitability.

CREATE INDEX stock_ledger_recent_lookup_idx
  ON erp_lab.stock_ledger(tenant_id, product_id, location_id, posted_at DESC)
  INCLUDE (quantity_delta);

CREATE INDEX inventory_balances_location_quantity_idx
  ON erp_lab.inventory_balances(tenant_id, location_id, quantity)
  INCLUDE (product_id);

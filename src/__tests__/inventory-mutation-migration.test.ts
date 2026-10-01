import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const mutationMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260924010000_db_authoritative_inventory_mutations.sql"),
  "utf8"
);
const moveMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260924011000_ledgered_inventory_moves.sql"),
  "utf8"
);

describe("inventory DB mutation contract", () => {
  it("defines versioned, audited absolute adjustment", () => {
    expect(mutationMigration).toContain("ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0");
    expect(mutationMigration).toContain("CREATE TRIGGER inventory_bump_version_on_update");
    expect(mutationMigration).toContain("CREATE TABLE IF NOT EXISTS public.inventory_adjustment_audit");
    expect(mutationMigration).toContain("p_expected_version bigint DEFAULT NULL");
    expect(mutationMigration).toContain("INVENTORY_ADJUSTMENT_CONFLICT");
  });

  it("removes the unledgered delta entrypoint and requires canonical move ledger writes", () => {
    expect(moveMigration).toContain("DROP FUNCTION public.apply_inventory_delta(uuid, uuid, numeric, integer)");
    expect(moveMigration).toContain("CREATE OR REPLACE FUNCTION public.create_inventory_move");
    expect(moveMigration).toContain(
      "INSERT INTO public.transactions(type, user_id, memo, created_at, from_warehouse_id, to_warehouse_id)"
    );
    expect(moveMigration).toContain("VALUES ('move', v_user_id");
    expect(moveMigration).toContain(
      "INSERT INTO public.transaction_items(transaction_id, product_option_id, quantity)"
    );
    expect(moveMigration).toContain("SET quantity = quantity - v_qty");
    expect(moveMigration).toContain("SET quantity = quantity + v_qty");
  });
});

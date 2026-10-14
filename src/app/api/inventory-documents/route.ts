import { createClient } from "@/lib/supabase/server";
import { APIError } from "@/utils/api-error";
import { handleAPIError } from "@/utils/api-handler";
import { NextResponse } from "next/server";

type DocumentLineInput = {
  option_id?: unknown;
  quantity?: unknown;
};

type RpcError = { code?: string; message?: string; details?: string; hint?: string };
type UntypedRpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: RpcError | null }>;

function mapRpcError(error: { code?: string; message?: string }) {
  if (error.code === "42501") return APIError.forbidden("이 작업을 수행할 권한이 없습니다.");
  if (error.code === "22023") return APIError.badRequest("전표의 창고, 품목, 수량을 확인해 주세요.");
  if (error.code === "P0001")
    return new APIError(409, "현재 상태에서는 전표를 처리할 수 없습니다.", "DOCUMENT_STATE_CONFLICT");
  return APIError.fromSupabaseError(error);
}

export async function GET() {
  const endpoint = "/api/inventory-documents";
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw APIError.unauthorized();

    const rpc = supabase.rpc as unknown as UntypedRpc;
    const { data, error } = await rpc("list_inventory_documents");
    if (error) throw mapRpcError(error);

    return NextResponse.json(data);
  } catch (error) {
    return handleAPIError(error, endpoint);
  }
}

export async function POST(request: Request) {
  const endpoint = "/api/inventory-documents";
  try {
    const body: {
      document_type?: unknown;
      warehouse_id?: unknown;
      supplier_id?: unknown;
      memo?: unknown;
      effective_at?: unknown;
      idempotency_key?: unknown;
      sales_amount?: unknown;
      items?: unknown;
    } = await request.json();

    if (
      !body ||
      (body.document_type !== "in" && body.document_type !== "out") ||
      typeof body.warehouse_id !== "string" ||
      typeof body.idempotency_key !== "string" ||
      !Array.isArray(body.items) ||
      body.items.length === 0 ||
      body.items.some(
        (item: DocumentLineInput) =>
          !item ||
          typeof item.option_id !== "string" ||
          typeof item.quantity !== "number" ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0
      ) ||
      (body.document_type === "out" &&
        (typeof body.sales_amount !== "number" || !Number.isFinite(body.sales_amount) || body.sales_amount <= 0))
    ) {
      throw APIError.badRequest("전표 유형, 창고, 품목, 수량을 확인해 주세요.");
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw APIError.unauthorized();

    const rpc = supabase.rpc as unknown as UntypedRpc;
    const createFunction =
      body.document_type === "out" ? "create_sales_inventory_document" : "create_inventory_document";
    const { data: created, error: createError } = await rpc(createFunction, {
      p_header: {
        document_type: body.document_type,
        warehouse_id: body.warehouse_id,
        supplier_id: typeof body.supplier_id === "string" ? body.supplier_id : null,
        memo: typeof body.memo === "string" ? body.memo : "",
        effective_at: typeof body.effective_at === "string" ? body.effective_at : null,
        idempotency_key: body.idempotency_key,
        ...(body.document_type === "out" ? { sales_amount: body.sales_amount } : {}),
      },
      p_items: body.items as Record<string, unknown>[],
    });
    if (createError) throw mapRpcError(createError);

    const documentId = (created as { document_id?: unknown } | null)?.document_id;
    if (typeof documentId !== "string") throw APIError.internalServer("전표 생성 결과가 없습니다.");

    const { data: submitted, error: submitError } = await rpc("submit_inventory_document", {
      p_document_id: documentId,
    });
    if (submitError) throw mapRpcError(submitError);

    return NextResponse.json(submitted, { status: 201 });
  } catch (error) {
    return handleAPIError(error, endpoint);
  }
}

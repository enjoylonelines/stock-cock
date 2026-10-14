import { createClient } from "@/lib/supabase/server";
import { APIError } from "@/utils/api-error";
import { handleAPIError } from "@/utils/api-handler";
import { NextResponse } from "next/server";

type Action = "approve" | "reject" | "cancel";
type RpcError = { code?: string; message?: string; details?: string; hint?: string };
type UntypedRpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: RpcError | null }>;

function mapRpcError(error: { code?: string; message?: string }) {
  if (error.code === "42501") return APIError.forbidden("이 작업을 수행할 권한이 없습니다.");
  if (error.code === "22023") return APIError.badRequest("반려 사유를 입력해 주세요.");
  if (error.code === "P0002") return APIError.notFound("전표를 찾을 수 없습니다.");
  if (error.code === "P0001")
    return new APIError(409, "현재 상태에서는 전표를 처리할 수 없습니다.", "DOCUMENT_STATE_CONFLICT");
  return APIError.fromSupabaseError(error);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const endpoint = "/api/inventory-documents/:id";
  try {
    const { id } = await params;
    const body: { action?: unknown; reason?: unknown } = await request.json();
    if (!["approve", "reject", "cancel"].includes(String(body.action))) {
      throw APIError.badRequest("승인, 반려, 취소 중 하나를 선택해 주세요.");
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw APIError.unauthorized();

    const rpc = supabase.rpc as unknown as UntypedRpc;
    const action = body.action as Action;
    if (action === "approve") {
      const { data, error } = await rpc("approve_and_reflect_inventory_document", { p_document_id: id });
      if (error) throw mapRpcError(error);
      return NextResponse.json(data);
    }
    if (action === "reject") {
      if (typeof body.reason !== "string" || !body.reason.trim()) {
        throw APIError.badRequest("반려 사유를 입력해 주세요.");
      }
      const { data, error } = await rpc("reject_inventory_document", {
        p_document_id: id,
        p_reason: body.reason.trim(),
      });
      if (error) throw mapRpcError(error);
      return NextResponse.json(data);
    }

    const { data, error } = await rpc("cancel_inventory_document", { p_document_id: id });
    if (error) throw mapRpcError(error);
    return NextResponse.json(data);
  } catch (error) {
    return handleAPIError(error, endpoint);
  }
}

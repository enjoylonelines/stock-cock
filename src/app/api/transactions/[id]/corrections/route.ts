import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json();
    if (
      !["correct", "cancel", "memo"].includes(body.action) ||
      !body.reason?.trim() ||
      !body.request_id ||
      !Number.isInteger(body.revision)
    ) {
      return NextResponse.json({ error: "작업, 사유와 이력 상태를 확인해주세요." }, { status: 400 });
    }
    const { action, reason, request_id, ...changes } = body;
    const { data, error } = await supabase.rpc("resolve_transaction", {
      p_id: id,
      p_action: action,
      p_changes: changes,
      p_reason: reason,
      p_request_id: request_id,
    });
    if (error)
      return NextResponse.json(
        { error: error.message },
        {
          status: error.code === "40001" ? 409 : error.code === "42501" ? 403 : 400,
        }
      );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "요청 내용을 확인해주세요." }, { status: 400 });
  }
}

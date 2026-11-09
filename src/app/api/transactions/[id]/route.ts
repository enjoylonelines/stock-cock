import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { id } = await params;
  const { data, error } = await supabase.from("transactions").select("*, transaction_items(*)").eq("id", id).single();
  if (error) return NextResponse.json({ error: "입출고 이력을 찾을 수 없습니다." }, { status: 404 });
  const [metadata, notes] = await Promise.all([
    supabase
      .from("transaction_history_view")
      .select(
        "transaction_status, entry_kind, source_transaction_id, resolved_by_transaction_id, resolution_reason, latest_memo"
      )
      .eq("transaction_id", id)
      .limit(1)
      .single(),
    supabase.from("transaction_memo_notes").select("id, memo, reason, created_at").eq("transaction_id", id).order("id"),
  ]);
  if (metadata.error || notes.error)
    return NextResponse.json({ error: "이력 상태를 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ data: { ...data, ...metadata.data, memo_notes: notes.data } });
}

export async function PATCH() {
  return NextResponse.json({ error: "원본 수정은 중단됐습니다. 정정 기록을 추가해주세요." }, { status: 405 });
}
export async function DELETE() {
  return NextResponse.json({ error: "원본 삭제는 중단됐습니다. 취소 기록을 추가해주세요." }, { status: 405 });
}

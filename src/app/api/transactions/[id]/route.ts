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
  const { data, error } = await supabase
    .from("transactions")
    .select("*, transaction_items(*)")
    .eq("id", id)
    .is("cancelled_at", null)
    .single();
  if (error) return NextResponse.json({ error: "입출고 이력을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ data });
}

async function manage(request: Request, context: Context, deleting: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  try {
    const { id } = await context.params;
    const body = await request.json();
    if (!Number.isInteger(body.revision)) {
      return NextResponse.json({ error: "이력을 새로고침 후 다시 시도해주세요." }, { status: 400 });
    }
    const { data, error } = await supabase.rpc("manage_transaction", {
      p_id: id,
      p_revision: body.revision,
      p_changes: body,
      p_delete: deleting,
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

export async function PATCH(request: Request, context: Context) {
  return manage(request, context, false);
}

export async function DELETE(request: Request, context: Context) {
  return manage(request, context, true);
}
